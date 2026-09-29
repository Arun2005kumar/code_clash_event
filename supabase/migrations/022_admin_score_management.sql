-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 022_admin_score_management.sql
-- Add Editable Score Option, Score Override Audit Trail,
-- and Mandatory Pre-Publishing Workflow.
-- ============================================================

-- 1. Create team_scores table to track calculated vs override scores
CREATE TABLE IF NOT EXISTS team_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  r1_score INTEGER DEFAULT 0,
  r2_score INTEGER DEFAULT 0,
  r3_score INTEGER DEFAULT 0,
  bonus_adjustment INTEGER DEFAULT 0,
  calculated_score INTEGER DEFAULT 0,
  admin_override_score INTEGER DEFAULT NULL,
  final_score INTEGER GENERATED ALWAYS AS (COALESCE(admin_override_score, calculated_score)) STORED,
  score_override_reason TEXT,
  score_modified_by TEXT,
  score_modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on team_scores
ALTER TABLE team_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_scores_select_public" ON team_scores;
CREATE POLICY "team_scores_select_public" ON team_scores FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "team_scores_insert_public" ON team_scores;
CREATE POLICY "team_scores_insert_public" ON team_scores FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "team_scores_update_public" ON team_scores;
CREATE POLICY "team_scores_update_public" ON team_scores FOR UPDATE USING (TRUE);


-- 2. Create score_audit_logs table for manual score modification history
CREATE TABLE IF NOT EXISTS score_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  previous_score INTEGER,
  new_score INTEGER NOT NULL,
  modified_by TEXT NOT NULL DEFAULT 'Admin',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on score_audit_logs
ALTER TABLE score_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "score_audit_logs_select_public" ON score_audit_logs;
CREATE POLICY "score_audit_logs_select_public" ON score_audit_logs FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "score_audit_logs_insert_public" ON score_audit_logs;
CREATE POLICY "score_audit_logs_insert_public" ON score_audit_logs FOR INSERT WITH CHECK (TRUE);


-- 3. Add results_published and published_at columns to competition_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competition_settings' AND column_name = 'results_published') THEN
    ALTER TABLE competition_settings ADD COLUMN results_published BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competition_settings' AND column_name = 'published_at') THEN
    ALTER TABLE competition_settings ADD COLUMN published_at TIMESTAMPTZ;
  END IF;
END $$;


-- 4. RPC Function: Sync/recalculate all team scores from live round tables
CREATE OR REPLACE FUNCTION sync_team_calculated_scores()
RETURNS VOID AS $$
BEGIN
  INSERT INTO team_scores (team_id, r1_score, r2_score, r3_score, calculated_score, updated_at)
  SELECT
    t.id as team_id,
    COALESCE(r1.score, 0) as r1_score,
    COALESCE(r2.score, 0) as r2_score,
    (CASE WHEN COALESCE(r3.vault_unlocked, FALSE) THEN 10 ELSE 0 END) as r3_score,
    (COALESCE(r1.score, 0) + COALESCE(r2.score, 0) + (CASE WHEN COALESCE(r3.vault_unlocked, FALSE) THEN 10 ELSE 0 END)) as calculated_score,
    NOW()
  FROM teams t
  LEFT JOIN (
    SELECT team_id, MAX(score) as score
    FROM round1_attempts
    WHERE status IN ('submitted', 'auto_submitted')
    GROUP BY team_id
  ) r1 ON t.id = r1.team_id
  LEFT JOIN round2_team_state r2 ON t.id = r2.team_id
  LEFT JOIN round3_team_state r3 ON t.id = r3.team_id
  ON CONFLICT (team_id) DO UPDATE SET
    r1_score = EXCLUDED.r1_score,
    r2_score = EXCLUDED.r2_score,
    r3_score = EXCLUDED.r3_score,
    calculated_score = EXCLUDED.calculated_score,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_team_calculated_scores() TO postgres, anon, authenticated, service_role;


-- 5. RPC Function: Update team score override (Admin override action)
CREATE OR REPLACE FUNCTION update_team_score_override(
  p_team_id UUID,
  p_override_score INTEGER,
  p_reason TEXT DEFAULT 'Manual correction',
  p_modified_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
  v_is_published BOOLEAN;
  v_prev_final_score INTEGER;
  v_team_name TEXT;
  v_new_final_score INTEGER;
BEGIN
  -- Check if results are locked (published)
  SELECT COALESCE(results_published, round3_results_published, FALSE)
  INTO v_is_published
  FROM competition_settings
  LIMIT 1;

  IF v_is_published IS TRUE THEN
    RAISE EXCEPTION 'Results are published. Scores are locked. Please unpublish results first to make edits.';
  END IF;

  -- Ensure base score record exists
  PERFORM sync_team_calculated_scores();

  -- Get current team info and previous final score
  SELECT team_name INTO v_team_name FROM teams WHERE id = p_team_id;
  IF v_team_name IS NULL THEN
    RAISE EXCEPTION 'Team not found.';
  END IF;

  SELECT final_score INTO v_prev_final_score FROM team_scores WHERE team_id = p_team_id;

  -- Apply manual override
  UPDATE team_scores
  SET
    admin_override_score = p_override_score,
    score_override_reason = p_reason,
    score_modified_by = p_modified_by,
    score_modified_at = NOW(),
    updated_at = NOW()
  WHERE team_id = p_team_id;

  SELECT final_score INTO v_new_final_score FROM team_scores WHERE team_id = p_team_id;

  -- Insert audit trail log
  INSERT INTO score_audit_logs (team_id, previous_score, new_score, modified_by, reason, created_at)
  VALUES (p_team_id, v_prev_final_score, v_new_final_score, p_modified_by, p_reason, NOW());

  RETURN jsonb_build_object(
    'success', true,
    'team_id', p_team_id,
    'previous_score', v_prev_final_score,
    'new_score', v_new_final_score,
    'admin_override', p_override_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_team_score_override(UUID, INTEGER, TEXT, TEXT) TO postgres, anon, authenticated, service_role;


-- 6. RPC Function: Clear team score override (Revert to calculated score)
CREATE OR REPLACE FUNCTION clear_team_score_override(
  p_team_id UUID,
  p_modified_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
  v_is_published BOOLEAN;
  v_prev_final_score INTEGER;
  v_calc_score INTEGER;
BEGIN
  SELECT COALESCE(results_published, round3_results_published, FALSE)
  INTO v_is_published
  FROM competition_settings
  LIMIT 1;

  IF v_is_published IS TRUE THEN
    RAISE EXCEPTION 'Results are published. Scores are locked.';
  END IF;

  SELECT final_score, calculated_score INTO v_prev_final_score, v_calc_score
  FROM team_scores WHERE team_id = p_team_id;

  UPDATE team_scores
  SET
    admin_override_score = NULL,
    score_override_reason = NULL,
    score_modified_by = p_modified_by,
    score_modified_at = NOW(),
    updated_at = NOW()
  WHERE team_id = p_team_id;

  INSERT INTO score_audit_logs (team_id, previous_score, new_score, modified_by, reason, created_at)
  VALUES (p_team_id, v_prev_final_score, v_calc_score, p_modified_by, 'Reverted to calculated score', NOW());

  RETURN jsonb_build_object(
    'success', true,
    'team_id', p_team_id,
    'previous_score', v_prev_final_score,
    'new_score', v_calc_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clear_team_score_override(UUID, TEXT) TO postgres, anon, authenticated, service_role;


-- 7. RPC Function: Publish Results
CREATE OR REPLACE FUNCTION publish_competition_results()
RETURNS JSONB AS $$
BEGIN
  PERFORM sync_team_calculated_scores();

  UPDATE competition_settings
  SET
    results_published = TRUE,
    round3_results_published = TRUE,
    published_at = NOW(),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Results published successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION publish_competition_results() TO postgres, anon, authenticated, service_role;


-- 8. RPC Function: Unpublish Results
CREATE OR REPLACE FUNCTION unpublish_competition_results()
RETURNS JSONB AS $$
BEGIN
  UPDATE competition_settings
  SET
    results_published = FALSE,
    round3_results_published = FALSE,
    published_at = NULL,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Results unpublished successfully. Scores are now editable in Draft mode.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unpublish_competition_results() TO postgres, anon, authenticated, service_role;


-- 9. Updated RPC Function: get_leaderboard using final_score logic
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
  total_violations BIGINT,
  calculated_score INTEGER,
  admin_override_score INTEGER,
  final_score INTEGER
) AS $$
BEGIN
  PERFORM sync_team_calculated_scores();

  RETURN QUERY
  WITH v_counts AS (
    SELECT v.team_id, COUNT(v.id) as total_violations
    FROM anti_cheat_violations v
    GROUP BY v.team_id
  ),
  r2_coins_map AS (
    SELECT r.team_id, r.coins as r2_coins
    FROM round2_team_state r
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY ts.final_score DESC, t.team_name ASC
    ) as rank,
    t.id as team_id,
    t.team_name,
    ts.r1_score,
    ts.r2_score,
    ts.r3_score,
    COALESCE(rc.r2_coins, 100)::INTEGER as r2_coins,
    COALESCE(vc.total_violations, 0)::BIGINT as total_violations,
    ts.calculated_score,
    ts.admin_override_score,
    ts.final_score
  FROM teams t
  JOIN team_scores ts ON t.id = ts.team_id
  LEFT JOIN r2_coins_map rc ON t.id = rc.team_id
  LEFT JOIN v_counts vc ON t.id = vc.team_id
  ORDER BY ts.final_score DESC, t.team_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_leaderboard() TO postgres, anon, authenticated, service_role;


-- 10. Enable Supabase Realtime for team_scores and score_audit_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'team_scores') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_scores;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'score_audit_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE score_audit_logs;
  END IF;
END $$;
