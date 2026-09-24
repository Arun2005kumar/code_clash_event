-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 007_comprehensive_round2_fix.sql
-- COMPREHENSIVE Round 2 fix:
-- 1. Fix bid_amount constraint (was 1,2,5 → now 1,2,4)
-- 2. Replace place_bid with true UPSERT + coin deduction at bid time
-- 3. Replace lock_hammer without bidding_closed requirement
-- 4. Fix next_round2_question to also set question status to bidding_open
-- 5. Ensure round2_results INSERT/UPDATE policy exists
-- ============================================================

-- ============================================================
-- 1. FIX BID_AMOUNT CONSTRAINT
-- The schema had CHECK (bid_amount IN (1, 2, 5)) but code uses (1,2,4)
-- ============================================================
ALTER TABLE round2_bids DROP CONSTRAINT IF EXISTS round2_bids_bid_amount_check;
ALTER TABLE round2_bids ADD CONSTRAINT round2_bids_bid_amount_check
  CHECK (bid_amount IN (1, 2, 4));

-- ============================================================
-- 2. REPLACE place_bid — TRUE UPSERT, no status gate
-- Coins deducted at bid time (diff applied on update).
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
  v_question   round2_questions%ROWTYPE;
  v_settings   competition_settings%ROWTYPE;
  v_existing   round2_bids%ROWTYPE;
  v_coin_diff  INTEGER;
BEGIN
  -- Check round 2 active
  SELECT * INTO v_settings FROM competition_settings LIMIT 1;
  IF NOT v_settings.round2_active THEN
    RETURN QUERY SELECT FALSE, 'Round 2 is not currently active.'::TEXT;
    RETURN;
  END IF;

  -- Get / create team state (lock row)
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

  -- Block if already resolved
  IF v_question.status = 'resolved' THEN
    RETURN QUERY SELECT FALSE, 'This question has already been resolved.'::TEXT;
    RETURN;
  END IF;

  -- Validate bid amount
  IF p_bid_amount NOT IN (1, 2, 4) THEN
    RETURN QUERY SELECT FALSE, 'Invalid bid amount. Must be 1, 2, or 4 coins.'::TEXT;
    RETURN;
  END IF;

  -- Validate option
  IF p_selected_option NOT IN ('A', 'B', 'C', 'D') THEN
    RETURN QUERY SELECT FALSE, 'Invalid option selected.'::TEXT;
    RETURN;
  END IF;

  -- Check if team already has a bid for this question
  SELECT * INTO v_existing FROM round2_bids
  WHERE team_id = p_team_id AND question_id = p_question_id;

  IF FOUND THEN
    -- Updating existing bid: coin diff = new - old
    v_coin_diff := p_bid_amount - v_existing.bid_amount;
    IF v_coin_diff > 0 AND v_team_state.coins < v_coin_diff THEN
      RETURN QUERY SELECT FALSE, format(
        'Insufficient coins to upgrade bid. You have %s coins; upgrading from %s to %s costs %s more.',
        v_team_state.coins, v_existing.bid_amount, p_bid_amount, v_coin_diff
      );
      RETURN;
    END IF;
    -- Apply coin adjustment
    UPDATE round2_team_state SET
      coins = coins - v_coin_diff,
      updated_at = NOW()
    WHERE team_id = p_team_id;
  ELSE
    -- New bid: check coins
    IF v_team_state.coins < p_bid_amount THEN
      RETURN QUERY SELECT FALSE, format(
        'Insufficient coins. You have %s coins but tried to bid %s.',
        v_team_state.coins, p_bid_amount
      );
      RETURN;
    END IF;
    -- Deduct coins
    UPDATE round2_team_state SET
      coins = coins - p_bid_amount,
      updated_at = NOW()
    WHERE team_id = p_team_id;
  END IF;

  -- UPSERT bid
  INSERT INTO round2_bids (
    team_id, question_id, selected_option, bid_amount, bid_timestamp, status
  ) VALUES (
    p_team_id, p_question_id, p_selected_option, p_bid_amount, NOW(), 'placed'
  )
  ON CONFLICT (team_id, question_id) DO UPDATE SET
    selected_option = EXCLUDED.selected_option,
    bid_amount      = EXCLUDED.bid_amount,
    bid_timestamp   = NOW(),
    status          = 'placed';

  RETURN QUERY SELECT TRUE, 'Bid locked in successfully!'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. REPLACE lock_hammer — NO bidding_closed gate required
-- Admin can drop hammer any time before resolved.
-- Scoring: correct → +pts by tier, wrong → no extra penalty
-- (coins already deducted at bid placement)
-- ============================================================
CREATE OR REPLACE FUNCTION lock_hammer(
  p_question_id     UUID,
  p_winning_team_id UUID
)
RETURNS TABLE(
  success        BOOLEAN,
  message        TEXT,
  winner_correct BOOLEAN,
  score_change   INTEGER,
  coin_change    INTEGER
) AS $$
DECLARE
  v_question    round2_questions%ROWTYPE;
  v_winning_bid round2_bids%ROWTYPE;
  v_is_correct  BOOLEAN;
  v_score_delta INTEGER := 0;
  v_coin_delta  INTEGER := 0;
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

  -- Determine correctness
  v_is_correct := (v_winning_bid.selected_option = v_question.correct_option);

  -- Award score on correct answer (tier-based)
  IF v_is_correct THEN
    v_score_delta := CASE v_winning_bid.bid_amount
      WHEN 1 THEN 2
      WHEN 2 THEN 5
      ELSE 10   -- 4 coins → 10 pts
    END;

    UPDATE round2_team_state SET
      score = score + v_score_delta,
      updated_at = NOW()
    WHERE team_id = p_winning_team_id;
  END IF;
  -- Coins already deducted at bid time; no extra deduction on wrong answer

  -- Mark winning bid
  UPDATE round2_bids SET
    is_winner  = TRUE,
    is_correct = v_is_correct,
    status     = 'won'
  WHERE team_id = p_winning_team_id AND question_id = p_question_id;

  -- Mark all other bids as lost
  UPDATE round2_bids SET
    is_winner  = FALSE,
    is_correct = (selected_option = v_question.correct_option),
    status     = 'lost'
  WHERE question_id = p_question_id
    AND team_id != p_winning_team_id
    AND status = 'placed';

  -- Insert winner result
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

  -- Resolve question
  UPDATE round2_questions SET
    status           = 'resolved',
    resolved_team_id = p_winning_team_id,
    updated_at       = NOW()
  WHERE id = p_question_id;

  RETURN QUERY SELECT TRUE, 'Hammer dropped successfully!'::TEXT, v_is_correct, v_score_delta, v_coin_delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 4. REPLACE next_round2_question
-- Sets the target question to 'bidding_open' so users can see it
-- ============================================================
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

  -- Update settings
  UPDATE competition_settings SET
    current_round2_question = v_next,
    updated_at = NOW();

  -- Set all non-resolved questions to waiting
  UPDATE round2_questions SET
    status = 'waiting',
    updated_at = NOW()
  WHERE question_number != v_next
    AND status IN ('bidding_open', 'live');

  -- Activate the new question (only if not already resolved)
  UPDATE round2_questions SET
    status = 'bidding_open',
    updated_at = NOW()
  WHERE question_number = v_next
    AND status != 'resolved';

  RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. Ensure round2_results policies exist
-- ============================================================
DROP POLICY IF EXISTS "round2_results_insert_admin" ON round2_results;
DROP POLICY IF EXISTS "round2_results_insert_all" ON round2_results;
CREATE POLICY "round2_results_insert_all"
  ON round2_results FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round2_results_update_all" ON round2_results;
CREATE POLICY "round2_results_update_all"
  ON round2_results FOR UPDATE
  USING (TRUE);
