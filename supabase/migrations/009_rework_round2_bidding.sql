-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 009_rework_round2_bidding.sql
-- Rework Round 2 logic:
-- 1. place_bid: ACCUMULATES bid amount (each click adds to total)
--    - deducts coins per click
--    - can update selected_option any time
-- 2. lock_hammer_with_verdict: Admin calls with winner + correct/wrong verdict
--    - correct => award score based on total wager, reset winner coins to 100
--    - wrong => no coin recovery (already deducted on each bid)
-- 3. reveal_correct_answer: Admin can reveal the correct option for display
-- ============================================================

-- ============================================================
-- 1. REFRESH ROUND 2 QUESTIONS (Ensure option_a..d are correct in DB)
-- ============================================================
INSERT INTO round2_questions (question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation) VALUES
(1, 'Q1 — State Mutation Trap 💀

x = 3
y = 7
z = 2

for i = 1 to 3:

    if x < y:
        x = x + z
        z = z + 1
    else:
        y = y - z
        z = z - 1

    if y - x == z:
        x = x + 2

print(x, y, z)', '12, 7, 5', '10, 7, 5', '12, 6, 5', '10, 6, 4', 'A', 'Tracing state mutations step-by-step results in x = 12, y = 7, z = 5.'),
(2, 'Q2 — Nested Branch Trace

x = 2
y = 3
z = 1

for i = 1 to 4:

    if x + y > 5:

        x = x - z

        if x < y:
            y = y + z
        else:
            z = z + 1

    else:

        y = y - x
        z = z + y

    if x == y:
        z = z * 2

print(x, y, z)', '1, 5, 2', '3, 4, 2', '3, 5, 2', '2, 5, 4', 'D', 'Tracing nested conditions over 4 iterations yields x = 2, y = 5, z = 4.'),
(3, 'Q3 — Binary Decoder 🔢

Decode the symbols:

- 👆 = 1
- 👇 = 0

Sequence:

👆 👇 👆 👇 👆 👇 👇 👆

What is the decimal value?', '166', '169', '170', '174', 'B', '1010 1001 = 128 + 32 + 8 + 1 = 169.'),
(4, 'Q4 — Data Type + Numerical Calculation 📦

Legend:

- 🔵 = Integer
- 🟡 = Decimal
- 🟢 = Character
- 🔴 = Boolean

Expression:

🔵 12
÷
🔵 5
+
🔵 3

If all 🔵 values are integers, what is the final result?', '🟡 5.4', '🔵 5', '🔵 6', '🟡 6.4', 'B', 'Integer division 12 / 5 = 2. Then 2 + 3 = 5 (Integer 🔵 5).'),
(5, 'Q5 — Short-Circuit + Side Effect 🔥

Assume AND uses short-circuit evaluation.

x = 2
y = 5

for i = 1 to 4:

    if x > 5 AND (y = y + 2) > 6:
        x = x + 1
    else:
        x = x + y

print(x, y)', '26, 13', '22, 5', '26, 5', '30, 13', 'C', 'x > 5 evaluates to False initially, short-circuiting (y = y + 2) so y remains 5. x accumulates to 26.'),
(6, 'Q6 — Emoji Logic Puzzle 🧠

Decode the emoji sequence and find out what the entire cycle represents.

☕  + 🧠   → 💡
💡  + 💻   → 🧑💻
🧑💻 + 🐛   → 😵
😵  + 🔍   → 🧠
🧠  + ⌨️   → ✅

What is this entire cycle most likely representing?', 'A student''s coding workflow', 'A coffee shop ordering system', 'A computer boot process', 'A social-media posting cycle', 'A', 'Coffee + Brain -> Idea -> Coding -> Bug -> Debugging -> Fixed code (Student''s Coding Workflow).')
ON CONFLICT (question_number) DO UPDATE SET
  question_text = EXCLUDED.question_text,
  option_a = EXCLUDED.option_a,
  option_b = EXCLUDED.option_b,
  option_c = EXCLUDED.option_c,
  option_d = EXCLUDED.option_d,
  correct_option = EXCLUDED.correct_option,
  explanation = EXCLUDED.explanation;

-- UPDATE PUBLIC VIEW TO EXPOSE correct_option WHEN RESOLVED
DROP VIEW IF EXISTS round2_questions_public CASCADE;
CREATE OR REPLACE VIEW round2_questions_public AS
SELECT
  id,
  question_number,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  explanation,
  status,
  CASE WHEN status = 'resolved' THEN correct_option ELSE NULL END AS correct_option,
  resolved_team_id,
  created_at
FROM round2_questions
ORDER BY question_number;

-- ENSURE REALTIME ON round2 TABLES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'round2_results') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE round2_results;
  END IF;
END $$;

-- ============================================================
-- 2. FIX bid_amount constraint to allow any positive integer
-- ============================================================
ALTER TABLE round2_bids DROP CONSTRAINT IF EXISTS round2_bids_bid_amount_check;
ALTER TABLE round2_bids ADD CONSTRAINT round2_bids_bid_amount_check
  CHECK (bid_amount >= 0);

-- ============================================================
-- 2. place_bid — ADDITIVE bidding
-- Each call ADDS p_bid_amount to the team's existing total wager.
-- Coins are deducted immediately per click.
-- selected_option is updated to whatever option is currently selected.
-- ============================================================
DROP FUNCTION IF EXISTS place_bid(UUID, UUID, CHAR, INTEGER);
DROP FUNCTION IF EXISTS place_bid(UUID, UUID, CHAR(1), INTEGER);

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
  -- Check round 2 active
  SELECT * INTO v_settings FROM competition_settings LIMIT 1;
  IF NOT v_settings.round2_active THEN
    RETURN QUERY SELECT FALSE, 'Round 2 is not currently active.'::TEXT, 0;
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
    RETURN QUERY SELECT FALSE, 'Question not found.'::TEXT, 0;
    RETURN;
  END IF;

  -- Block if already resolved
  IF v_question.status = 'resolved' THEN
    RETURN QUERY SELECT FALSE, 'This question has already been resolved.'::TEXT, 0;
    RETURN;
  END IF;

  -- Validate bid increment
  IF p_bid_amount NOT IN (1, 2, 4) THEN
    RETURN QUERY SELECT FALSE, 'Invalid bid increment. Must be 1, 2, or 4 coins.'::TEXT, 0;
    RETURN;
  END IF;

  -- Validate option
  IF p_selected_option NOT IN ('A', 'B', 'C', 'D') THEN
    RETURN QUERY SELECT FALSE, 'Invalid option selected.'::TEXT, 0;
    RETURN;
  END IF;

  -- Check if team has sufficient coins for this increment
  IF v_team_state.coins < p_bid_amount THEN
    RETURN QUERY SELECT FALSE, format(
      'Not enough coins! You have %s coins but tried to add %s.',
      v_team_state.coins, p_bid_amount
    )::TEXT, 0;
    RETURN;
  END IF;

  -- Deduct coins immediately (always additive)
  UPDATE round2_team_state SET
    coins = coins - p_bid_amount,
    updated_at = NOW()
  WHERE team_id = p_team_id;

  -- Check if team already has a bid for this question
  SELECT * INTO v_existing FROM round2_bids
  WHERE team_id = p_team_id AND question_id = p_question_id;

  IF FOUND THEN
    -- ADD to existing total, update selected option
    v_new_total := v_existing.bid_amount + p_bid_amount;
    UPDATE round2_bids SET
      selected_option = p_selected_option,
      bid_amount      = v_new_total,
      bid_timestamp   = NOW(),
      status          = 'placed'
    WHERE team_id = p_team_id AND question_id = p_question_id;
  ELSE
    -- First bid for this question
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


-- ============================================================
-- 3. lock_hammer_with_verdict — Admin drops hammer AND declares verdict
-- Admin sees the correct answer and clicks CORRECT or WRONG.
-- correct => award pts based on wager tier, reset winner coins to 100
-- wrong => no coin recovery (already deducted)
-- ============================================================
DROP FUNCTION IF EXISTS lock_hammer_with_verdict(UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION lock_hammer_with_verdict(
  p_question_id     UUID,
  p_winning_team_id UUID,
  p_is_correct      BOOLEAN
)
RETURNS TABLE(
  success       BOOLEAN,
  message       TEXT,
  score_change  INTEGER
) AS $$
DECLARE
  v_question    round2_questions%ROWTYPE;
  v_winning_bid round2_bids%ROWTYPE;
  v_score_delta INTEGER := 0;
BEGIN
  -- Lock question row
  SELECT * INTO v_question FROM round2_questions
  WHERE id = p_question_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Question not found.'::TEXT, 0;
    RETURN;
  END IF;

  -- Prevent double hammer
  IF v_question.status = 'resolved' THEN
    RETURN QUERY SELECT FALSE, 'Question has already been resolved.'::TEXT, 0;
    RETURN;
  END IF;

  -- Get the winning bid
  SELECT * INTO v_winning_bid FROM round2_bids
  WHERE team_id = p_winning_team_id AND question_id = p_question_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Winning team has no bid for this question.'::TEXT, 0;
    RETURN;
  END IF;

  -- Score based on total wager amount (tier thresholds)
  IF p_is_correct THEN
    v_score_delta := CASE
      WHEN v_winning_bid.bid_amount >= 8 THEN 15
      WHEN v_winning_bid.bid_amount >= 4 THEN 10
      WHEN v_winning_bid.bid_amount >= 2 THEN 5
      ELSE 2
    END;

    -- Award score AND reset coins to 100
    UPDATE round2_team_state SET
      score = score + v_score_delta,
      coins = 100,
      updated_at = NOW()
    WHERE team_id = p_winning_team_id;
  END IF;
  -- Wrong: coins already deducted on bid clicks, no recovery

  -- Mark winning bid
  UPDATE round2_bids SET
    is_winner  = TRUE,
    is_correct = p_is_correct,
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
    CASE WHEN p_is_correct THEN 'won_correct' ELSE 'won_incorrect' END,
    v_score_delta, 0, NOW()
  )
  ON CONFLICT (team_id, question_id) DO NOTHING;

  -- Insert not_winner results for others
  INSERT INTO round2_results (
    team_id, question_id, bid_amount, result, score_change, coin_change, resolved_at
  )
  SELECT rb.team_id, rb.question_id, rb.bid_amount, 'not_winner', 0, 0, NOW()
  FROM round2_bids rb
  WHERE rb.question_id = p_question_id
    AND rb.team_id != p_winning_team_id
  ON CONFLICT (team_id, question_id) DO NOTHING;

  -- Mark question as resolved (store correct_option in resolved_team_id for display)
  UPDATE round2_questions SET
    status           = 'resolved',
    resolved_team_id = p_winning_team_id,
    updated_at       = NOW()
  WHERE id = p_question_id;

  RETURN QUERY SELECT TRUE, format(
    'Hammer dropped! %s awarded %s points.',
    p_winning_team_id::TEXT, v_score_delta
  )::TEXT, v_score_delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 4. Keep old lock_hammer for backward compat but reroute to new function
-- ============================================================
DROP FUNCTION IF EXISTS lock_hammer(UUID, UUID);

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
BEGIN
  SELECT * INTO v_question FROM round2_questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Question not found.'::TEXT, FALSE, 0, 0;
    RETURN;
  END IF;

  SELECT * INTO v_winning_bid FROM round2_bids
  WHERE team_id = p_winning_team_id AND question_id = p_question_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'No bid found.'::TEXT, FALSE, 0, 0;
    RETURN;
  END IF;

  v_is_correct := (v_winning_bid.selected_option = v_question.correct_option);

  -- Delegate to new function
  PERFORM lock_hammer_with_verdict(p_question_id, p_winning_team_id, v_is_correct);

  RETURN QUERY SELECT TRUE, 'Hammer dropped.'::TEXT, v_is_correct, 0, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. next_round2_question — with explicit WHERE clause
-- ============================================================
DROP FUNCTION IF EXISTS next_round2_question(INTEGER);
DROP FUNCTION IF EXISTS next_round2_question();

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
    updated_at = NOW()
  WHERE TRUE;

  UPDATE round2_questions SET
    status = 'waiting',
    updated_at = NOW()
  WHERE question_number != v_next
    AND status IN ('bidding_open', 'live');

  UPDATE round2_questions SET
    status = 'bidding_open',
    updated_at = NOW()
  WHERE question_number = v_next
    AND status != 'resolved';

  RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
