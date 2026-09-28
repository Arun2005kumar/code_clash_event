-- 020_enforce_strict_hammer_lock.sql
-- Strictly enforce hammer lock across lock_hammer_for_question and place_bid RPCs

DROP FUNCTION IF EXISTS lock_hammer_for_question(UUID) CASCADE;

CREATE OR REPLACE FUNCTION lock_hammer_for_question(p_question_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
  v_qnum INTEGER := 1;
BEGIN
  -- Infer question number if fallback UUID pattern is passed
  IF p_question_id::text LIKE '00000002-0000-0000-0000-00000000000%' THEN
    BEGIN
      v_qnum := SUBSTRING(p_question_id::text FROM 36)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      v_qnum := 1;
    END;
  END IF;

  -- Update status to locked for ALL rows matching p_question_id OR v_qnum
  UPDATE round2_questions
  SET status = 'locked', updated_at = NOW()
  WHERE id = p_question_id OR question_number = v_qnum;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    -- If no row updated, insert row with status = 'locked' and correct question_number
    INSERT INTO round2_questions (id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, status)
    VALUES (
      p_question_id,
      v_qnum,
      'Round 2 Question',
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'A',
      'locked'
    )
    ON CONFLICT (id) DO UPDATE SET status = 'locked', updated_at = NOW();

    -- Also lock any other question rows matching question_number
    UPDATE round2_questions
    SET status = 'locked', updated_at = NOW()
    WHERE question_number = v_qnum;
  END IF;

  -- Touch competition_settings to trigger realtime event across all client screens
  UPDATE competition_settings SET updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000000';

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION lock_hammer_for_question(UUID) TO postgres, anon, authenticated, service_role;


-- Update place_bid RPC to strictly reject bids when status is locked, hammer_locked, or resolved
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
  v_qnum       INTEGER := 1;
  v_is_locked  BOOLEAN := FALSE;
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

  -- Infer question number
  IF p_question_id::text LIKE '00000002-0000-0000-0000-00000000000%' THEN
    BEGIN
      v_qnum := SUBSTRING(p_question_id::text FROM 36)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      v_qnum := 1;
    END;
  END IF;

  -- Check if ANY question row matching id or question_number has status IN ('resolved', 'locked', 'hammer_locked')
  SELECT EXISTS (
    SELECT 1 FROM round2_questions
    WHERE (id = p_question_id OR question_number = v_qnum)
      AND status IN ('resolved', 'locked', 'hammer_locked')
  ) INTO v_is_locked;

  IF v_is_locked THEN
    RETURN QUERY SELECT FALSE, 'Hammer is locked! Bidding is closed for this lot.'::TEXT, 0;
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

  -- Check existing bid
  SELECT * INTO v_existing FROM round2_bids
  WHERE team_id = p_team_id AND question_id = p_question_id;

  IF FOUND THEN
    v_new_total := v_existing.bid_amount + p_bid_amount;

    UPDATE round2_bids SET
      selected_option = p_selected_option,
      bid_amount      = v_new_total,
      bid_timestamp   = NOW(),
      status          = 'placed'
    WHERE id = v_existing.id;
  ELSE
    v_new_total := p_bid_amount;

    INSERT INTO round2_bids (
      team_id, question_id, selected_option, bid_amount, bid_timestamp, status
    ) VALUES (
      p_team_id, p_question_id, p_selected_option, p_bid_amount, NOW(), 'placed'
    );
  END IF;

  -- Deduct coins from team purse
  UPDATE round2_team_state SET
    coins      = coins - p_bid_amount,
    updated_at = NOW()
  WHERE team_id = p_team_id;

  RETURN QUERY SELECT TRUE, 'Bid placed successfully.'::TEXT, v_new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION place_bid(UUID, UUID, CHAR(1), INTEGER) TO postgres, anon, authenticated, service_role;
