-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 010_reset_all_rounds_function.sql
-- RPC Function to reset Round 1, Round 2, Round 3 stats and start afresh
-- ============================================================

CREATE OR REPLACE FUNCTION reset_all_rounds()
RETURNS JSONB AS $$
DECLARE
  v_teams_count INTEGER := 0;
BEGIN
  -- 1. Reset Round 1
  TRUNCATE TABLE round1_answers CASCADE;
  TRUNCATE TABLE round1_attempts CASCADE;
  UPDATE round1_questions SET is_active = TRUE;

  -- 2. Reset Round 2
  TRUNCATE TABLE round2_results CASCADE;
  TRUNCATE TABLE round2_bids CASCADE;

  -- Reset ALL question statuses: Q1 -> 'bidding_open', Q2-Q6 -> 'waiting'
  UPDATE round2_questions 
  SET status = CASE WHEN question_number = 1 THEN 'bidding_open' ELSE 'waiting' END, 
      resolved_team_id = NULL, 
      updated_at = NOW();
  
  DELETE FROM round2_team_state;
  INSERT INTO round2_team_state (team_id, score, coins, current_question, status)
  SELECT id, 0, 100, 1, 'waiting' FROM teams
  ON CONFLICT (team_id) DO UPDATE SET
    score = 0,
    coins = 100,
    current_question = 1,
    status = 'waiting',
    updated_at = NOW();

  -- 3. Reset Round 3
  TRUNCATE TABLE round3_bonus_attempts CASCADE;
  TRUNCATE TABLE round3_vault_attempts CASCADE;
  TRUNCATE TABLE round3_mission_attempts CASCADE;
  UPDATE round3_missions SET is_active = TRUE;

  DELETE FROM round3_team_state;
  INSERT INTO round3_team_state (team_id, status, hints_used, finish_time_seconds, vault_attempts, vault_unlocked, started_at, completed_at)
  SELECT id, 'not_started', 0, NULL, 0, FALSE, NULL, NULL FROM teams
  ON CONFLICT (team_id) DO UPDATE SET
    status = 'not_started',
    hints_used = 0,
    finish_time_seconds = NULL,
    vault_attempts = 0,
    vault_unlocked = FALSE,
    started_at = NULL,
    completed_at = NULL,
    updated_at = NOW();

  -- 4. Reset Anti-Cheat violations
  TRUNCATE TABLE anti_cheat_violations CASCADE;

  -- 5. Reset Team login status
  UPDATE teams SET login_status = FALSE, updated_at = NOW();
  SELECT COUNT(*) INTO v_teams_count FROM teams;

  -- 6. Reset Competition Settings (Round 1 Active, R2/R3 inactive, Q1 selected)
  UPDATE competition_settings SET
    current_round = 1,
    round1_active = TRUE,
    round2_active = FALSE,
    round3_active = FALSE,
    current_round2_question = 1,
    show_round1_explanations = FALSE,
    round3_initialized = FALSE,
    round3_results_published = FALSE,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'All rounds (R1, R2, R3) and competition settings have been completely reset to beginning!',
    'teams_reset', v_teams_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
