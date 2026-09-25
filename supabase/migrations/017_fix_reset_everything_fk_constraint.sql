-- CODING CLUB CHALLENGE — Migration: 017_fix_reset_everything_fk_constraint.sql
-- Fixes foreign key constraint on round2_questions.resolved_team_id preventing reset_all_rounds() from deleting teams.

-- 1. Alter round2_questions foreign key constraint to ON DELETE SET NULL
ALTER TABLE round2_questions 
  DROP CONSTRAINT IF EXISTS round2_questions_resolved_team_id_fkey;

ALTER TABLE round2_questions 
  ADD CONSTRAINT round2_questions_resolved_team_id_fkey 
  FOREIGN KEY (resolved_team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- 2. Update reset_all_rounds RPC function to clear resolved_team_id BEFORE deleting teams
DROP FUNCTION IF EXISTS reset_all_rounds() CASCADE;

CREATE OR REPLACE FUNCTION reset_all_rounds()
RETURNS JSONB AS $$
DECLARE
  v_deleted_teams INTEGER := 0;
BEGIN
  -- 1. Reset round2_questions resolved_team_id & status FIRST to avoid foreign key conflicts
  UPDATE round2_questions 
  SET status = 'waiting', 
      resolved_team_id = NULL, 
      updated_at = NOW()
  WHERE TRUE;

  -- 2. Wipe all attempt logs, submissions, bids, state, and anti-cheat violations
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

  -- 3. Count and wipe all user accounts / teams
  SELECT COUNT(*) INTO v_deleted_teams FROM teams WHERE TRUE;
  DELETE FROM teams WHERE TRUE;

  -- 4. Preserve questions & missions, reset active/waiting flags
  UPDATE round1_questions SET is_active = TRUE WHERE TRUE;
  UPDATE round3_missions SET is_active = TRUE WHERE TRUE;

  -- 5. Reset Competition Settings to clean start (Round 1 Active)
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
