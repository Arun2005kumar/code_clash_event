-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 006_fix_round2_bidding.sql
-- Fixes Round 2 bidding RPC functions (place_bid, lock_hammer, next_round2_question)
-- Supports 1, 2, 4 coin bid tiers, allows bid updates via UPSERT, and
-- enables admin live hammer drop without requiring strict bidding_closed status.
-- ============================================================

-- 1. FUNCTION: place_bid (UPSERT pattern, allows 1, 2, 4 coins)
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
  v_settings competition_settings%ROWTYPE;
BEGIN
  -- Get settings to check if round 2 is active
  SELECT * INTO v_settings FROM competition_settings LIMIT 1;
  IF NOT v_settings.round2_active THEN
    RETURN QUERY SELECT FALSE, 'Round 2 is not currently active.'::TEXT;
    RETURN;
  END IF;

  -- Ensure team state exists with 100 default coins if missing
  SELECT * INTO v_team_state FROM round2_team_state
  WHERE team_id = p_team_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO round2_team_state (team_id, score, coins, current_question, status)
    VALUES (p_team_id, 0, 100, 1, 'active')
    RETURNING * INTO v_team_state;
  END IF;

  -- Get question
  SELECT * INTO v_question FROM round2_questions WHERE id = p_question_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Question not found.'::TEXT;
    RETURN;
  END IF;

  -- Check question is not already resolved
  IF v_question.status = 'resolved' THEN
    RETURN QUERY SELECT FALSE, 'Bidding is closed for this resolved question.'::TEXT;
    RETURN;
  END IF;

  -- Check bid amount is valid (1, 2, or 4 coins)
  IF p_bid_amount NOT IN (1, 2, 4) THEN
    RETURN QUERY SELECT FALSE, 'Invalid bid amount. Must be 1, 2, or 4 coins.'::TEXT;
    RETURN;
  END IF;

  -- Check sufficient coins
  IF v_team_state.coins < p_bid_amount THEN
    RETURN QUERY SELECT FALSE, format('Insufficient coins. You have %s coins but tried to bid %s.', v_team_state.coins, p_bid_amount);
    RETURN;
  END IF;

  -- Validate option
  IF p_selected_option NOT IN ('A', 'B', 'C', 'D') THEN
    RETURN QUERY SELECT FALSE, 'Invalid option selected.'::TEXT;
    RETURN;
  END IF;

  -- UPSERT bid (allow team to update/change their bid during live bidding)
  INSERT INTO round2_bids (
    team_id, question_id, selected_option, bid_amount, bid_timestamp, status
  ) VALUES (
    p_team_id, p_question_id, p_selected_option, p_bid_amount, NOW(), 'placed'
  )
  ON CONFLICT (team_id, question_id) DO UPDATE SET
    selected_option = EXCLUDED.selected_option,
    bid_amount = EXCLUDED.bid_amount,
    bid_timestamp = NOW(),
    status = 'placed';

  RETURN QUERY SELECT TRUE, 'Bid locked in successfully!'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. FUNCTION: lock_hammer (Admin Locks Hammer & Adjudicates Score/Coins)
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
    -- Correct: score += 2/5/10 based on wager tier (1->2, 2->5, 4->10)
    v_score_delta := CASE v_winning_bid.bid_amount WHEN 1 THEN 2 WHEN 2 THEN 5 ELSE 10 END;
    v_coin_delta := 0;

    UPDATE round2_team_state SET
      score = score + v_score_delta,
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

  -- Insert into round2_results for audit & result view
  INSERT INTO round2_results (team_id, question_id, result, score_change, coin_change, bid_amount)
  VALUES (
    p_winning_team_id,
    p_question_id,
    CASE WHEN v_is_correct THEN 'won_correct' ELSE 'won_incorrect' END,
    v_score_delta,
    v_coin_delta,
    v_winning_bid.bid_amount
  )
  ON CONFLICT DO NOTHING;

  -- Mark question as resolved
  UPDATE round2_questions SET
    status = 'resolved',
    resolved_team_id = p_winning_team_id,
    updated_at = NOW()
  WHERE id = p_question_id;

  RETURN QUERY SELECT TRUE, 'Hammer dropped successfully!'::TEXT, v_is_correct, v_score_delta, v_coin_delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. FUNCTION: next_round2_question (Advances Lot Question Number)
CREATE OR REPLACE FUNCTION next_round2_question(p_target_question INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
  v_curr INTEGER;
BEGIN
  IF p_target_question IS NOT NULL THEN
    v_next := p_target_question;
  ELSE
    SELECT current_round2_question INTO v_curr FROM competition_settings LIMIT 1;
    v_next := LEAST(6, COALESCE(v_curr, 1) + 1);
  END IF;

  UPDATE competition_settings SET
    current_round2_question = v_next,
    updated_at = NOW();

  RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
