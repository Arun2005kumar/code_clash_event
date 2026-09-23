-- ============================================================
-- CODING CLUB CHALLENGE — PostgreSQL Functions (RPCs)
-- Migration: 003_functions.sql
-- Run AFTER 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- FUNCTION: set_team_context
-- Sets the current team ID in session for RLS checks
-- Called by client before any team-scoped query
-- ============================================================
CREATE OR REPLACE FUNCTION set_team_context(p_team_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_team_id', p_team_id::TEXT, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: validate_team_login
-- Validates team credentials OR registers a new team in real-time
-- SECURITY DEFINER so it can insert/read teams table bypassing RLS
-- ============================================================
CREATE OR REPLACE FUNCTION validate_team_login(
  p_team_name TEXT,
  p_leader_name TEXT,
  p_leader_reg_no TEXT
)
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  leader_name TEXT,
  leader_reg_no TEXT,
  login_status BOOLEAN,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_team teams%ROWTYPE;
BEGIN
  -- 1. Search for existing team by name (case insensitive)
  SELECT * INTO v_team
  FROM teams
  WHERE LOWER(TRIM(teams.team_name)) = LOWER(TRIM(p_team_name));

  IF FOUND THEN
    -- Verify if leader details match
    IF LOWER(TRIM(v_team.leader_name)) = LOWER(TRIM(p_leader_name))
       AND LOWER(TRIM(v_team.leader_reg_no)) = LOWER(TRIM(p_leader_reg_no)) THEN

      -- Mark team as logged in
      UPDATE teams SET login_status = TRUE, updated_at = NOW()
      WHERE id = v_team.id;

      -- Ensure Round 2 state exists (100 coins default)
      INSERT INTO round2_team_state (team_id, score, coins, current_question, status)
      VALUES (v_team.id, 0, 100, 1, 'waiting')
      ON CONFLICT (team_id) DO NOTHING;

      -- Set session context
      PERFORM set_config('app.current_team_id', v_team.id::TEXT, TRUE);

      RETURN QUERY SELECT
        v_team.id,
        v_team.team_name,
        v_team.leader_name,
        v_team.leader_reg_no,
        TRUE,
        TRUE,
        'Welcome back! Login successful.'::TEXT;
      RETURN;
    ELSE
      RETURN QUERY SELECT
        NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
        FALSE, FALSE, 'Team name is already registered with different leader details. Please check your inputs.'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- 2. Check if registration number is used under another team name
  SELECT * INTO v_team
  FROM teams
  WHERE LOWER(TRIM(teams.leader_reg_no)) = LOWER(TRIM(p_leader_reg_no));

  IF FOUND THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      FALSE, FALSE, ('Registration number is already registered under team "' || v_team.team_name || '".')::TEXT;
    RETURN;
  END IF;

  -- 3. REAL-TIME REGISTRATION: Insert new team dynamically
  INSERT INTO teams (team_name, leader_name, leader_reg_no, login_status)
  VALUES (TRIM(p_team_name), TRIM(p_leader_name), UPPER(TRIM(p_leader_reg_no)), TRUE)
  RETURNING * INTO v_team;

  -- Create initial Round 2 team state (100 starting coins, 0 score)
  INSERT INTO round2_team_state (team_id, score, coins, current_question, status)
  VALUES (v_team.id, 0, 100, 1, 'waiting')
  ON CONFLICT (team_id) DO NOTHING;

  -- Set session context
  PERFORM set_config('app.current_team_id', v_team.id::TEXT, TRUE);

  RETURN QUERY SELECT
    v_team.id,
    v_team.team_name,
    v_team.leader_name,
    v_team.leader_reg_no,
    TRUE,
    TRUE,
    'Team registered successfully in real-time! Welcome to Coding Club Challenge.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: start_round1_attempt
-- Creates a new Round 1 attempt for a team (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION start_round1_attempt(p_team_id UUID)
RETURNS TABLE(attempt_id UUID, already_submitted BOOLEAN) AS $$
DECLARE
  v_attempt round1_attempts%ROWTYPE;
  v_settings competition_settings%ROWTYPE;
BEGIN
  -- Check if round 1 is active
  SELECT * INTO v_settings FROM competition_settings LIMIT 1;
  IF NOT v_settings.round1_active THEN
    RAISE EXCEPTION 'Round 1 is not currently active.';
  END IF;

  -- Check for existing attempt
  SELECT * INTO v_attempt FROM round1_attempts WHERE team_id = p_team_id;

  IF FOUND THEN
    IF v_attempt.status IN ('submitted', 'auto_submitted') THEN
      RETURN QUERY SELECT v_attempt.id, TRUE;
      RETURN;
    END IF;
    -- Return existing in-progress attempt
    RETURN QUERY SELECT v_attempt.id, FALSE;
    RETURN;
  END IF;

  -- Create new attempt
  INSERT INTO round1_attempts (team_id, started_at, status)
  VALUES (p_team_id, NOW(), 'in_progress')
  RETURNING id INTO v_attempt;

  RETURN QUERY SELECT v_attempt.id, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: save_round1_answer
-- Saves or updates a single answer (upsert)
-- ============================================================
CREATE OR REPLACE FUNCTION save_round1_answer(
  p_attempt_id UUID,
  p_question_id UUID,
  p_selected_option CHAR(1)
)
RETURNS VOID AS $$
DECLARE
  v_attempt round1_attempts%ROWTYPE;
BEGIN
  -- Validate attempt is in progress
  SELECT * INTO v_attempt FROM round1_attempts WHERE id = p_attempt_id;
  IF NOT FOUND OR v_attempt.status != 'in_progress' THEN
    RAISE EXCEPTION 'Attempt is not in progress or does not exist.';
  END IF;

  -- Upsert answer (no is_correct yet — calculated on submit)
  INSERT INTO round1_answers (attempt_id, question_id, selected_option, is_correct, answered_at)
  VALUES (p_attempt_id, p_question_id, p_selected_option, FALSE, NOW())
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET
    selected_option = EXCLUDED.selected_option,
    answered_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: submit_round1
-- Server-side scoring: calculates score, marks attempt as done
-- CRITICAL: correct_option never sent to client
-- ============================================================
CREATE OR REPLACE FUNCTION submit_round1(
  p_attempt_id UUID,
  p_submit_type TEXT DEFAULT 'submitted' -- 'submitted' or 'auto_submitted'
)
RETURNS TABLE(
  score INTEGER,
  correct_count INTEGER,
  total_questions INTEGER,
  time_used_seconds INTEGER
) AS $$
DECLARE
  v_attempt round1_attempts%ROWTYPE;
  v_score INTEGER := 0;
  v_correct INTEGER := 0;
  v_time_used INTEGER;
BEGIN
  -- Get attempt with lock to prevent race conditions
  SELECT * INTO v_attempt FROM round1_attempts
  WHERE id = p_attempt_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found.';
  END IF;

  IF v_attempt.status IN ('submitted', 'auto_submitted') THEN
    -- Already submitted — return existing score
    RETURN QUERY SELECT
      v_attempt.score,
      v_attempt.correct_answers,
      v_attempt.total_questions,
      v_attempt.time_used_seconds;
    RETURN;
  END IF;

  -- Calculate time used
  v_time_used := EXTRACT(EPOCH FROM (NOW() - v_attempt.started_at))::INTEGER;

  -- Update is_correct for all answers by joining with questions
  UPDATE round1_answers ra
  SET is_correct = (ra.selected_option = rq.correct_option)
  FROM round1_questions rq
  WHERE ra.question_id = rq.id
    AND ra.attempt_id = p_attempt_id;

  -- Count correct answers
  SELECT COUNT(*) INTO v_correct
  FROM round1_answers
  WHERE attempt_id = p_attempt_id AND is_correct = TRUE;

  v_score := v_correct; -- 1 point per correct answer

  -- Update attempt record
  UPDATE round1_attempts SET
    status = p_submit_type,
    submitted_at = NOW(),
    score = v_score,
    correct_answers = v_correct,
    total_questions = 30,
    time_used_seconds = v_time_used
  WHERE id = p_attempt_id;

  RETURN QUERY SELECT v_score, v_correct, 30, v_time_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- OVERLOAD: save_round1_answer by p_team_id
CREATE OR REPLACE FUNCTION save_round1_answer(
  p_team_id UUID,
  p_question_id UUID,
  p_selected_option CHAR(1)
)
RETURNS VOID AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  SELECT id INTO v_attempt_id FROM round1_attempts WHERE team_id = p_team_id ORDER BY started_at DESC LIMIT 1;
  IF v_attempt_id IS NULL THEN
    INSERT INTO round1_attempts (team_id, started_at, status)
    VALUES (p_team_id, NOW(), 'in_progress')
    RETURNING id INTO v_attempt_id;
  END IF;

  PERFORM save_round1_answer(v_attempt_id, p_question_id, p_selected_option);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- OVERLOAD: submit_round1 by p_team_id
CREATE OR REPLACE FUNCTION submit_round1(
  p_team_id UUID,
  p_submit_type TEXT DEFAULT 'submitted'
)
RETURNS TABLE(
  score INTEGER,
  correct_count INTEGER,
  total_questions INTEGER,
  time_used_seconds INTEGER
) AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  SELECT id INTO v_attempt_id FROM round1_attempts WHERE team_id = p_team_id ORDER BY started_at DESC LIMIT 1;
  IF v_attempt_id IS NULL THEN
    INSERT INTO round1_attempts (team_id, started_at, status)
    VALUES (p_team_id, NOW(), 'in_progress')
    RETURNING id INTO v_attempt_id;
  END IF;

  RETURN QUERY SELECT * FROM submit_round1(v_attempt_id, p_submit_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: initialize_round2_team_state
-- Sets up a team's Round 2 state (called by admin when activating R2)
-- ============================================================
CREATE OR REPLACE FUNCTION initialize_round2_states()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO round2_team_state (team_id, score, coins, current_question, status)
  SELECT t.id, 0, 100, 1, 'active'
  FROM teams t
  WHERE NOT EXISTS (
    SELECT 1 FROM round2_team_state rts WHERE rts.team_id = t.id
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: place_bid
-- Validates and places a bid atomically
-- Prevents: insufficient coins, duplicate bids, wrong question
-- ============================================================
CREATE OR REPLACE FUNCTION place_bid(
  p_team_id UUID,
  p_question_id UUID,
  p_selected_option CHAR(1),
  p_bid_amount INTEGER
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_team_state round2_team_state%ROWTYPE;
  v_question round2_questions%ROWTYPE;
  v_existing_bid round2_bids%ROWTYPE;
  v_settings competition_settings%ROWTYPE;
BEGIN
  -- Get settings to check if round 2 is active
  SELECT * INTO v_settings FROM competition_settings LIMIT 1;
  IF NOT v_settings.round2_active THEN
    RETURN QUERY SELECT FALSE, 'Round 2 is not currently active.'::TEXT;
    RETURN;
  END IF;

  -- Lock team state row
  SELECT * INTO v_team_state FROM round2_team_state
  WHERE team_id = p_team_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Team Round 2 state not initialized.'::TEXT;
    RETURN;
  END IF;

  -- Get question
  SELECT * INTO v_question FROM round2_questions WHERE id = p_question_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Question not found.'::TEXT;
    RETURN;
  END IF;

  -- Check question is in bidding_open state
  IF v_question.status != 'bidding_open' THEN
    RETURN QUERY SELECT FALSE, 'Bidding is not currently open for this question.'::TEXT;
    RETURN;
  END IF;

  -- Check bid amount is valid
  IF p_bid_amount NOT IN (1, 2, 5) THEN
    RETURN QUERY SELECT FALSE, 'Invalid bid amount. Must be 1, 2, or 5 coins.'::TEXT;
    RETURN;
  END IF;

  -- Check sufficient coins
  IF v_team_state.coins < p_bid_amount THEN
    RETURN QUERY SELECT FALSE, format('Insufficient coins. You have %s coins but tried to bid %s.', v_team_state.coins, p_bid_amount);
    RETURN;
  END IF;

  -- Check for existing bid (prevent duplicate)
  SELECT * INTO v_existing_bid FROM round2_bids
  WHERE team_id = p_team_id AND question_id = p_question_id;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, 'You have already placed a bid for this question.'::TEXT;
    RETURN;
  END IF;

  -- Validate option
  IF p_selected_option NOT IN ('A', 'B', 'C', 'D') THEN
    RETURN QUERY SELECT FALSE, 'Invalid option selected.'::TEXT;
    RETURN;
  END IF;

  -- Place the bid
  INSERT INTO round2_bids (
    team_id, question_id, selected_option, bid_amount, bid_timestamp, status
  ) VALUES (
    p_team_id, p_question_id, p_selected_option, p_bid_amount, NOW(), 'placed'
  );

  RETURN QUERY SELECT TRUE, 'Bid placed successfully!'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: lock_hammer
-- Admin locks the winning bid — core auction resolution
-- Uses transaction to prevent race conditions
-- ============================================================
CREATE OR REPLACE FUNCTION lock_hammer(
  p_question_id UUID,
  p_winning_team_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  winner_correct BOOLEAN,
  score_change INTEGER,
  coin_change INTEGER
) AS $$
DECLARE
  v_question round2_questions%ROWTYPE;
  v_winning_bid round2_bids%ROWTYPE;
  v_team_state round2_team_state%ROWTYPE;
  v_is_correct BOOLEAN;
  v_score_delta INTEGER := 0;
  v_coin_delta INTEGER := 0;
BEGIN
  -- Lock question row
  SELECT * INTO v_question FROM round2_questions
  WHERE id = p_question_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Question not found.'::TEXT, FALSE, 0, 0;
    RETURN;
  END IF;

  -- Prevent double hammer
  IF v_question.status = 'resolved' THEN
    RETURN QUERY SELECT FALSE, 'Question has already been resolved.'::TEXT, FALSE, 0, 0;
    RETURN;
  END IF;

  IF v_question.status != 'bidding_closed' THEN
    RETURN QUERY SELECT FALSE, 'Question bidding is not closed yet.'::TEXT, FALSE, 0, 0;
    RETURN;
  END IF;

  -- Get the winning bid
  SELECT * INTO v_winning_bid FROM round2_bids
  WHERE team_id = p_winning_team_id AND question_id = p_question_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Winning team has no bid for this question.'::TEXT, FALSE, 0, 0;
    RETURN;
  END IF;

  -- Lock team state
  SELECT * INTO v_team_state FROM round2_team_state
  WHERE team_id = p_winning_team_id FOR UPDATE;

  -- Check if winning team's answer is correct
  v_is_correct := (v_winning_bid.selected_option = v_question.correct_option);

  IF v_is_correct THEN
    -- Correct: score += 10, coins unchanged
    v_score_delta := 10;
    v_coin_delta := 0;

    UPDATE round2_team_state SET
      score = score + 10,
      updated_at = NOW()
    WHERE team_id = p_winning_team_id;
  ELSE
    -- Wrong: score unchanged, coins -= bid amount
    v_coin_delta := -v_winning_bid.bid_amount;

    UPDATE round2_team_state SET
      coins = GREATEST(0, coins - v_winning_bid.bid_amount),
      updated_at = NOW()
    WHERE team_id = p_winning_team_id;
  END IF;

  -- Mark winning bid
  UPDATE round2_bids SET
    is_winner = TRUE,
    is_correct = v_is_correct,
    status = 'won'
  WHERE team_id = p_winning_team_id AND question_id = p_question_id;

  -- Mark all other bids as lost
  UPDATE round2_bids SET
    is_winner = FALSE,
    is_correct = (selected_option = v_question.correct_option),
    status = 'lost'
  WHERE question_id = p_question_id
    AND team_id != p_winning_team_id
    AND status = 'placed';

  -- Insert result record for winner
  INSERT INTO round2_results (
    team_id, question_id, bid_amount, result, score_change, coin_change, resolved_at
  ) VALUES (
    p_winning_team_id, p_question_id, v_winning_bid.bid_amount,
    CASE WHEN v_is_correct THEN 'won_correct' ELSE 'won_incorrect' END,
    v_score_delta, v_coin_delta, NOW()
  )
  ON CONFLICT (team_id, question_id) DO NOTHING;

  -- Insert not_winner results for other bidders
  INSERT INTO round2_results (
    team_id, question_id, bid_amount, result, score_change, coin_change, resolved_at
  )
  SELECT
    rb.team_id, rb.question_id, rb.bid_amount,
    'not_winner', 0, 0, NOW()
  FROM round2_bids rb
  WHERE rb.question_id = p_question_id
    AND rb.team_id != p_winning_team_id
  ON CONFLICT (team_id, question_id) DO NOTHING;

  -- Resolve the question
  UPDATE round2_questions SET
    status = 'resolved',
    resolved_team_id = p_winning_team_id,
    updated_at = NOW()
  WHERE id = p_question_id;

  RETURN QUERY SELECT TRUE, 'Question resolved successfully!'::TEXT, v_is_correct, v_score_delta, v_coin_delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: log_violation
-- Records an anti-cheat violation for a team
-- ============================================================
CREATE OR REPLACE FUNCTION log_violation(
  p_team_id UUID,
  p_violation_type TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO anti_cheat_violations (team_id, violation_type, details, created_at)
  VALUES (p_team_id, p_violation_type, p_details, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: get_violation_counts
-- Returns violation counts per team (for admin dashboard)
-- ============================================================
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
    t.id,
    t.team_name,
    COUNT(v.id) as total_violations,
    COUNT(v.id) FILTER (WHERE v.violation_type = 'fullscreen_exit') as fullscreen_exits,
    COUNT(v.id) FILTER (WHERE v.violation_type = 'tab_switch') as tab_switches,
    COUNT(v.id) FILTER (WHERE v.violation_type = 'devtools_detected') as devtools_detections,
    COUNT(v.id) >= 3 as is_flagged
  FROM teams t
  LEFT JOIN anti_cheat_violations v ON t.id = v.team_id
  GROUP BY t.id, t.team_name
  ORDER BY total_violations DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: advance_round2_question
-- Admin advances to the next question
-- ============================================================
CREATE OR REPLACE FUNCTION advance_round2_question()
RETURNS TABLE(next_question INTEGER, success BOOLEAN) AS $$
DECLARE
  v_settings competition_settings%ROWTYPE;
  v_next_q INTEGER;
BEGIN
  SELECT * INTO v_settings FROM competition_settings LIMIT 1 FOR UPDATE;

  IF v_settings.current_round2_question >= 6 THEN
    RETURN QUERY SELECT 6, FALSE;
    RETURN;
  END IF;

  v_next_q := v_settings.current_round2_question + 1;

  UPDATE competition_settings SET
    current_round2_question = v_next_q,
    updated_at = NOW();

  UPDATE round2_questions SET
    status = 'bidding_open'
  WHERE question_number = v_next_q;

  RETURN QUERY SELECT v_next_q, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: get_leaderboard
-- Returns current team rankings for admin view
-- ============================================================
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE(
  rank BIGINT,
  team_id UUID,
  team_name TEXT,
  r1_score INTEGER,
  r2_score INTEGER,
  r2_coins INTEGER,
  total_violations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(r2.score, 0) + COALESCE(r1.score, 0) DESC) as rank,
    t.id,
    t.team_name,
    COALESCE(r1.score, 0) as r1_score,
    COALESCE(r2.score, 0) as r2_score,
    COALESCE(r2.coins, 0) as r2_coins,
    COUNT(v.id) as total_violations
  FROM teams t
  LEFT JOIN round1_attempts r1 ON t.id = r1.team_id
  LEFT JOIN round2_team_state r2 ON t.id = r2.team_id
  LEFT JOIN anti_cheat_violations v ON t.id = v.team_id
  GROUP BY t.id, t.team_name, r1.score, r2.score, r2.coins
  ORDER BY (COALESCE(r2.score, 0) + COALESCE(r1.score, 0)) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
