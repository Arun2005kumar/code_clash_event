-- Ensure all setting columns exist on competition_settings
ALTER TABLE competition_settings
  ADD COLUMN IF NOT EXISTS round1_initialized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS round2_initialized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS round3_initialized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS round3_results_published BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION reset_all_rounds()
RETURNS JSONB AS $$
DECLARE
  v_deleted_teams INTEGER := 0;
BEGIN
  -- 1. Truncate all attempts, submissions, bids, states & violations
  TRUNCATE TABLE round3_bonus_attempts CASCADE;
  TRUNCATE TABLE round3_vault_attempts CASCADE;
  TRUNCATE TABLE round3_mission_attempts CASCADE;
  TRUNCATE TABLE round3_team_state CASCADE;

  TRUNCATE TABLE round2_results CASCADE;
  TRUNCATE TABLE round2_bids CASCADE;
  TRUNCATE TABLE round2_team_state CASCADE;

  TRUNCATE TABLE round1_answers CASCADE;
  TRUNCATE TABLE round1_attempts CASCADE;

  TRUNCATE TABLE anti_cheat_violations CASCADE;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_scores') THEN
    EXECUTE 'TRUNCATE TABLE team_scores CASCADE';
  END IF;

  -- 2. Count and wipe all user accounts / teams
  SELECT COUNT(*) INTO v_deleted_teams FROM teams;
  TRUNCATE TABLE teams CASCADE;

  -- 3. Preserve questions & missions, reset active/waiting flags
  UPDATE round1_questions SET is_active = TRUE;

  UPDATE round2_questions 
  SET status = 'waiting', 
      resolved_team_id = NULL, 
      updated_at = NOW();

  UPDATE round3_missions SET is_active = TRUE;

  -- 4. Reset Competition Settings to clean start (Round 1 Active)
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
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Platform completely reset! User accounts, stats, and attempts deleted. All 30 R1 questions, 6 R2 questions, and 5 R3 missions preserved.',
    'teams_deleted', v_deleted_teams
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

