-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 016_fix_reset_scores_and_violations.sql
-- Fixes:
-- 1. Anti-Cheat Violations RLS & Helper Functions
-- 2. reset_all_rounds RPC function (DELETE WITH WHERE TRUE)
-- 3. init_round3_team_states RPC function (UPDATE WITH WHERE TRUE)
-- 4. lock_hammer_for_question & place_bid lock enforcement
-- 5. validate_mission_answer sequential unlock enforcement
-- 6. Add all state & activity tables to supabase_realtime publication
-- ============================================================

-- 1. Anti-Cheat Violations RLS Policy Fixes
ALTER TABLE anti_cheat_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "violations_select_admin" ON anti_cheat_violations;
DROP POLICY IF EXISTS "violations_select_public" ON anti_cheat_violations;
CREATE POLICY "violations_select_public" ON anti_cheat_violations FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "violations_insert_own" ON anti_cheat_violations;
DROP POLICY IF EXISTS "violations_insert_public" ON anti_cheat_violations;
CREATE POLICY "violations_insert_public" ON anti_cheat_violations FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "violations_delete_admin" ON anti_cheat_violations;
DROP POLICY IF EXISTS "violations_delete_public" ON anti_cheat_violations;
CREATE POLICY "violations_delete_public" ON anti_cheat_violations FOR DELETE USING (TRUE);

DROP POLICY IF EXISTS "violations_update_public" ON anti_cheat_violations;
CREATE POLICY "violations_update_public" ON anti_cheat_violations FOR UPDATE USING (TRUE);


-- 2. Reset All Rounds RPC Function Fix
DROP FUNCTION IF EXISTS reset_all_rounds() CASCADE;

CREATE OR REPLACE FUNCTION reset_all_rounds()
RETURNS JSONB AS $$
DECLARE
  v_deleted_teams INTEGER := 0;
BEGIN
  -- Wipe all attempt logs, submissions, bids, state, and anti-cheat violations using DELETE WHERE TRUE
  -- (satisfies pg_safeupdate extension requiring WHERE clauses while avoiding ACCESS EXCLUSIVE lock deadlocks)
  DELETE FROM round3_bonus_attempts WHERE TRUE;
  DELETE FROM round3_vault_attempts WHERE TRUE;
  DELETE FROM round3_mission_attempts WHERE TRUE;
  DELETE FROM round3_team_state WHERE TRUE;

  DELETE FROM round2_results WHERE TRUE;
  DELETE FROM round2_bids WHERE TRUE;
  DELETE FROM round2_team_state WHERE TRUE;

  DELETE FROM round1_answers WHERE TRUE;
  DELETE FROM round1_attempts WHERE TRUE;

  DELETE FROM anti_cheat_violations WHERE TRUE;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_scores') THEN
    EXECUTE 'DELETE FROM team_scores WHERE TRUE';
  END IF;

  -- Count and wipe all user accounts / teams
  SELECT COUNT(*) INTO v_deleted_teams FROM teams WHERE TRUE;
  DELETE FROM teams WHERE TRUE;

  -- Preserve questions & missions, reset active/waiting flags
  UPDATE round1_questions SET is_active = TRUE WHERE TRUE;

  UPDATE round2_questions 
  SET status = 'waiting', 
      resolved_team_id = NULL, 
      updated_at = NOW()
  WHERE TRUE;

  UPDATE round3_missions SET is_active = TRUE WHERE TRUE;

  -- Reset Competition Settings to clean start (Round 1 Active)
  IF EXISTS (SELECT 1 FROM competition_settings) THEN
    UPDATE competition_settings SET
      current_round = 1,
      round1_active = TRUE,
      round2_active = FALSE,
      round3_active = FALSE,
      current_round2_question = 1,
      show_round1_explanations = FALSE,
      round1_initialized = FALSE,
      round2_initialized = FALSE,
      round3_initialized = FALSE,
      round3_results_published = FALSE,
      updated_at = NOW()
    WHERE TRUE;
  ELSE
    INSERT INTO competition_settings (
      current_round, round1_active, round2_active, round3_active,
      current_round2_question, show_round1_explanations,
      round1_initialized, round2_initialized, round3_initialized, round3_results_published
    ) VALUES (
      1, TRUE, FALSE, FALSE, 1, FALSE, FALSE, FALSE, FALSE, FALSE
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Platform completely reset! All team accounts, scores, attempts, and anti-cheat violations wiped. Ready for a fresh test.',
    'teams_deleted', v_deleted_teams
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_all_rounds() TO postgres, anon, authenticated, service_role;


-- 3. init_round3_team_states RPC Function Fix (Add WHERE TRUE to UPDATE)
DROP FUNCTION IF EXISTS init_round3_team_states() CASCADE;

CREATE OR REPLACE FUNCTION init_round3_team_states() RETURNS JSONB AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  INSERT INTO round3_team_state (team_id, status)
  SELECT id, 'not_started' FROM teams
  ON CONFLICT (team_id) DO NOTHING;
  
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE competition_settings SET round3_initialized = TRUE WHERE TRUE;

  RETURN jsonb_build_object('success', true, 'count', v_inserted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION init_round3_team_states() TO postgres, anon, authenticated, service_role;


-- 4. Lock Hammer RPC & Bidding Enforcement
DROP FUNCTION IF EXISTS lock_hammer_for_question(UUID) CASCADE;

CREATE OR REPLACE FUNCTION lock_hammer_for_question(p_question_id UUID)
RETURNS JSONB AS $$
BEGIN
  UPDATE round2_questions
  SET status = 'locked', updated_at = NOW()
  WHERE id = p_question_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION lock_hammer_for_question(UUID) TO postgres, anon, authenticated, service_role;


-- Update place_bid to reject bids if question status is locked or resolved
DROP FUNCTION IF EXISTS place_bid(UUID, UUID, CHAR(1), INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION place_bid(
  p_team_id UUID,
  p_question_id UUID,
  p_selected_option CHAR(1),
  p_bid_amount INTEGER
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_total INTEGER) AS $$
DECLARE
  v_team_state round2_team_state%ROWTYPE;
  v_question   round2_questions%ROWTYPE;
  v_settings   competition_settings%ROWTYPE;
  v_existing   round2_bids%ROWTYPE;
  v_new_total  INTEGER;
BEGIN
  SELECT * INTO v_settings FROM competition_settings LIMIT 1;
  IF NOT v_settings.round2_active THEN
    RETURN QUERY SELECT FALSE, 'Round 2 is not currently active.'::TEXT, 0;
    RETURN;
  END IF;

  SELECT * INTO v_team_state FROM round2_team_state
  WHERE team_id = p_team_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO round2_team_state (team_id, score, coins, current_question, status)
    VALUES (p_team_id, 0, 100, 1, 'active')
    RETURNING * INTO v_team_state;
  END IF;

  SELECT * INTO v_question FROM round2_questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Question not found.'::TEXT, 0;
    RETURN;
  END IF;

  -- Block bidding if locked or resolved
  IF v_question.status IN ('resolved', 'locked', 'hammer_locked') THEN
    RETURN QUERY SELECT FALSE, 'Bidding is locked for this lot.'::TEXT, 0;
    RETURN;
  END IF;

  IF p_bid_amount NOT IN (1, 2, 4) THEN
    RETURN QUERY SELECT FALSE, 'Invalid bid increment. Must be 1, 2, or 4 coins.'::TEXT, 0;
    RETURN;
  END IF;

  IF p_selected_option NOT IN ('A', 'B', 'C', 'D') THEN
    RETURN QUERY SELECT FALSE, 'Invalid option selected.'::TEXT, 0;
    RETURN;
  END IF;

  IF v_team_state.coins < p_bid_amount THEN
    RETURN QUERY SELECT FALSE, format(
      'Not enough coins! You have %s coins but tried to add %s.',
      v_team_state.coins, p_bid_amount
    )::TEXT, 0;
    RETURN;
  END IF;

  UPDATE round2_team_state SET
    coins = coins - p_bid_amount,
    updated_at = NOW()
  WHERE team_id = p_team_id;

  SELECT * INTO v_existing FROM round2_bids
  WHERE team_id = p_team_id AND question_id = p_question_id;

  IF FOUND THEN
    v_new_total := v_existing.bid_amount + p_bid_amount;
    UPDATE round2_bids SET
      selected_option = p_selected_option,
      bid_amount      = v_new_total,
      bid_timestamp   = NOW(),
      status          = 'placed'
    WHERE team_id = p_team_id AND question_id = p_question_id;
  ELSE
    v_new_total := p_bid_amount;
    INSERT INTO round2_bids (
      team_id, question_id, selected_option, bid_amount, bid_timestamp, status
    ) VALUES (
      p_team_id, p_question_id, p_selected_option, p_bid_amount, NOW(), 'placed'
    );
  END IF;

  RETURN QUERY SELECT TRUE, format(
    'Bid placed! Total wager: %s coins on Option %s.',
    v_new_total, p_selected_option
  )::TEXT, v_new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION place_bid(UUID, UUID, CHAR(1), INTEGER) TO postgres, anon, authenticated, service_role;


-- 5. validate_mission_answer — Enforce Sequential Unlocks in SQL
DROP FUNCTION IF EXISTS validate_mission_answer(UUID, INTEGER, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION validate_mission_answer(
  p_team_id UUID,
  p_mission_number INTEGER,
  p_submitted_answer TEXT
) RETURNS JSONB AS $$
DECLARE
  v_correct_answer TEXT;
  v_clue_piece TEXT;
  v_is_correct BOOLEAN := FALSE;
  v_existing RECORD;
  v_completed_count INTEGER;
  v_clean_submit TEXT;
  v_clean_correct TEXT;
BEGIN
  -- Enforce sequential access: Mission N requires Mission N-1 to be correct
  IF p_mission_number > 1 THEN
    IF NOT EXISTS (
      SELECT 1 FROM round3_mission_attempts
      WHERE team_id = p_team_id AND mission_number = (p_mission_number - 1) AND is_correct = true
    ) THEN
      RETURN jsonb_build_object('already_completed', false, 'is_correct', false, 'message', 'Previous mission must be completed first.');
    END IF;
  END IF;

  SELECT * INTO v_existing FROM round3_mission_attempts
  WHERE team_id = p_team_id AND mission_number = p_mission_number AND is_correct = true;

  IF FOUND THEN
    RETURN jsonb_build_object('already_completed', true, 'is_correct', true, 'clue_piece', v_existing.clue_piece_revealed);
  END IF;

  SELECT staff_answer, clue_piece INTO v_correct_answer, v_clue_piece
  FROM round3_missions WHERE mission_number = p_mission_number AND is_active = true;

  v_clean_submit := LOWER(TRIM(p_submitted_answer));
  v_clean_correct := LOWER(TRIM(v_correct_answer));

  v_is_correct := (v_clean_submit = v_clean_correct);

  IF NOT v_is_correct AND p_mission_number = 4 AND (v_clean_submit = '42' OR v_clean_submit = '042') THEN
    v_is_correct := TRUE;
  END IF;

  INSERT INTO round3_mission_attempts (team_id, mission_number, submitted_answer, is_correct, clue_piece_revealed, completed_at)
  VALUES (p_team_id, p_mission_number, p_submitted_answer, v_is_correct,
          CASE WHEN v_is_correct THEN v_clue_piece ELSE NULL END,
          CASE WHEN v_is_correct THEN NOW() ELSE NULL END)
  ON CONFLICT (team_id, mission_number) DO UPDATE
    SET submitted_answer = EXCLUDED.submitted_answer,
        is_correct = EXCLUDED.is_correct,
        clue_piece_revealed = EXCLUDED.clue_piece_revealed,
        completed_at = EXCLUDED.completed_at;

  IF v_is_correct THEN
    SELECT COUNT(*) INTO v_completed_count FROM round3_mission_attempts
    WHERE team_id = p_team_id AND is_correct = true;

    IF v_completed_count >= 5 THEN
      UPDATE round3_team_state
      SET status = 'vault_open'
      WHERE team_id = p_team_id AND status != 'completed';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'clue_piece', CASE WHEN v_is_correct THEN v_clue_piece ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_mission_answer(UUID, INTEGER, TEXT) TO postgres, anon, authenticated, service_role;


-- 6. Get Violation Counts RPC Function Fix
DROP FUNCTION IF EXISTS get_violation_counts() CASCADE;

CREATE OR REPLACE FUNCTION get_violation_counts()
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  total_violations BIGINT,
  fullscreen_exits BIGINT,
  tab_switches BIGINT,
  devtools_detections BIGINT,
  is_flagged BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as team_id,
    t.team_name,
    COUNT(v.id)::BIGINT as total_violations,
    COUNT(v.id) FILTER (WHERE v.violation_type = 'fullscreen_exit')::BIGINT as fullscreen_exits,
    COUNT(v.id) FILTER (WHERE v.violation_type = 'tab_switch')::BIGINT as tab_switches,
    COUNT(v.id) FILTER (WHERE v.violation_type IN ('devtools_open', 'devtools_detected'))::BIGINT as devtools_detections,
    (COUNT(v.id) >= 3) as is_flagged
  FROM teams t
  LEFT JOIN anti_cheat_violations v ON t.id = v.team_id
  GROUP BY t.id, t.team_name
  ORDER BY total_violations DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_violation_counts() TO postgres, anon, authenticated, service_role;


-- 7. Get Leaderboard RPC Function Fix
DROP FUNCTION IF EXISTS get_leaderboard() CASCADE;

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE(
  rank BIGINT,
  team_id UUID,
  team_name TEXT,
  r1_score INTEGER,
  r2_score INTEGER,
  r3_score INTEGER,
  r2_coins INTEGER,
  total_violations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH r1_scores AS (
    SELECT r.team_id, MAX(r.score) as r1_score
    FROM round1_attempts r
    WHERE r.status IN ('submitted', 'auto_submitted')
    GROUP BY r.team_id
  ),
  r2_scores AS (
    SELECT r.team_id, r.score as r2_score, r.coins as r2_coins
    FROM round2_team_state r
  ),
  r3_scores AS (
    SELECT r.team_id, r.score as r3_score
    FROM round3_team_state r
  ),
  v_counts AS (
    SELECT v.team_id, COUNT(v.id) as total_violations
    FROM anti_cheat_violations v
    GROUP BY v.team_id
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY (COALESCE(r1.r1_score, 0) + COALESCE(r2.r2_score, 0) + COALESCE(r3.r3_score, 0)) DESC, t.team_name ASC
    ) as rank,
    t.id as team_id,
    t.team_name,
    COALESCE(r1.r1_score, 0)::INTEGER as r1_score,
    COALESCE(r2.r2_score, 0)::INTEGER as r2_score,
    COALESCE(r3.r3_score, 0)::INTEGER as r3_score,
    COALESCE(r2.r2_coins, 100)::INTEGER as r2_coins,
    COALESCE(vc.total_violations, 0)::BIGINT as total_violations
  FROM teams t
  LEFT JOIN r1_scores r1 ON t.id = r1.team_id
  LEFT JOIN r2_scores r2 ON t.id = r2.team_id
  LEFT JOIN r3_scores r3 ON t.id = r3.team_id
  LEFT JOIN v_counts vc ON t.id = vc.team_id
  ORDER BY (COALESCE(r1.r1_score, 0) + COALESCE(r2.r2_score, 0) + COALESCE(r3.r3_score, 0)) DESC, t.team_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_leaderboard() TO postgres, anon, authenticated, service_role;


-- 8. Add All Competition Tables to Realtime Publication for Live Admin Stats
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'teams') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE teams;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'competition_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE competition_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'round1_attempts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE round1_attempts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'round2_team_state') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE round2_team_state;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'round2_bids') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE round2_bids;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'round2_questions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE round2_questions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'round3_team_state') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE round3_team_state;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'anti_cheat_violations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE anti_cheat_violations;
  END IF;
END $$;
