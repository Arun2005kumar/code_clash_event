-- ============================================================
-- CODING CLUB CHALLENGE — Seed Data
-- supabase/seed.sql
-- Contains actual extracted Round 1 (30 questions) and Round 2 (6 questions)
-- ============================================================

-- ============================================================
-- FULL RESET: Clear all existing team attempts, violations, & states
-- ============================================================
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
TRUNCATE TABLE teams CASCADE;

-- ============================================================
-- SAMPLE TEAMS
-- ============================================================
INSERT INTO teams (team_name, leader_name, leader_reg_no) VALUES
  ('ByteBlasters', 'Arjun Sharma', 'CS2021001'),
  ('CodeCraft', 'Priya Nair', 'CS2021002'),
  ('NullPointers', 'Rahul Verma', 'CS2021003'),
  ('StackOverflow', 'Sneha Patel', 'CS2021004'),
  ('AlgoAces', 'Karan Mehta', 'CS2021005'),
  ('BinaryBrigade', 'Deepika Rao', 'CS2021006'),
  ('RuntimeErrors', 'Vikram Singh', 'CS2021007'),
  ('InfiniteLoop', 'Ananya Kumar', 'CS2021008')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROUND 1 QUESTIONS (30 Unique Questions - Java & DSA)
-- ============================================================
INSERT INTO round1_questions (question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation) VALUES
(1, 'Which statement about binary search is correct?', 'It always examines every element', 'It repeatedly reduces the search space by approximately half', 'It can only work on strings', 'It requires a stack', 'B', 'Binary search divides the sorted search space in half at each step, achieving O(log n) time complexity.'),
(2, 'What is the primary reason a linked list requires extra memory compared with an array storing the same data?', 'It stores duplicate data', 'Each node generally stores an additional link/reference', 'It always uses contiguous memory', 'It automatically sorts elements', 'B', 'Each linked list node must store a reference/pointer to the next node in addition to the data element.'),
(3, 'What will be the output of the following Java expression?\nint x = 5;\nSystem.out.println(x++ + ++x);', '10', '11', '12', '13', 'C', 'x++ evaluates to 5 and increments x to 6. ++x increments x to 7 and evaluates to 7. 5 + 7 = 12.'),
(4, 'Which data structure is primarily used to implement Breadth-First Search (BFS)?', 'Stack', 'Queue', 'Heap', 'HashSet', 'B', 'BFS processes nodes in FIFO order using a Queue.'),
(5, 'A system needs to process tasks in the exact order in which they arrive. Which data structure best matches this requirement, and why?', 'Stack, because it follows LIFO', 'Queue, because it follows FIFO', 'Array, because it always sorts elements', 'Linked List, because it always follows FIFO', 'B', 'Queues operate on First-In, First-Out (FIFO) order, which matches first-come, first-served processing.'),
(6, 'What does the final keyword indicate when applied to a variable in Java?', 'The variable can be modified only inside a method', 'The variable is automatically static', 'The variable must contain a String', 'The variable cannot be reassigned after initialization', 'D', 'Declaring a variable final prevents it from being reassigned after its initial value is assigned.'),
(7, 'Which statement correctly distinguishes a stack from a queue?', 'Stack uses FIFO, queue uses LIFO', 'Stack uses LIFO, queue uses FIFO', 'Both always use LIFO', 'Both always use FIFO', 'B', 'A stack is Last-In, First-Out (LIFO), whereas a queue is First-In, First-Out (FIFO).'),
(8, 'What is the time complexity of the following code?\nfor(int i = 0; i < n; i++) {\n    for(int j = 0; j < n; j++) {\n        System.out.println(i + j);\n    }\n}', 'O(1)', 'O(n)', 'O(n²)', 'O(log n)', 'C', 'Nested loops running n times each execute n * n = n² iterations -> O(n²).'),
(9, 'Which situation is most suitable for using a queue rather than a stack?', 'Browser back navigation', 'Undoing the most recent operation', 'Processing requests in the order they arrive', 'Managing nested function calls', 'C', 'Processing requests in arrival order requires FIFO order (Queue).'),
(10, 'What is the output of the following Java code?\nString s1 = "Java";\nString s2 = "Java";\nString s3 = new String("Java");\nSystem.out.println(s1 == s2);\nSystem.out.println(s1 == s3);', 'true true', 'true false', 'false true', 'false false', 'B', 's1 == s2 compares string pool references (true). s1 == s3 compares string pool reference with heap object reference (false).'),
(11, 'Why is random access generally faster in an array than in a linked list?', 'Arrays use less memory in every situation', 'Array elements can be located directly using their index', 'Linked lists cannot store integers', 'Arrays do not require memory', 'B', 'Arrays are contiguous in memory so element addresses can be calculated directly in O(1) time using base address + index * element size.'),
(12, 'Which operation is generally O(1) in a linked list when the relevant node is already known?', 'Searching for a value', 'Accessing an element by index', 'Inserting a new node after the known node', 'Sorting the entire list', 'C', 'Inserting after a known node only requires updating pointers, which takes O(1) time.'),
(13, 'What is the average time complexity of Quick Sort?', 'O(n)', 'O(n²)', 'O(n log n)', 'O(log n)', 'C', 'Quick Sort has an average-case time complexity of O(n log n).'),
(14, 'What will be the output of the following Java code?\nint[] arr = {10, 20, 30, 40, 50};\nSystem.out.println(arr[arr.length - 2]);', '30', '40', '50', '20', 'B', 'arr.length is 5. arr[5 - 2] = arr[3] = 40.'),
(15, 'What is the time complexity of binary search on a sorted array?', 'O(n)', 'O(log n)', 'O(n²)', 'O(1)', 'B', 'Binary search divides the search space in half each iteration -> O(log n).'),
(16, 'What happens when duplicate elements are inserted into a HashSet in Java?', 'Duplicates are stored twice', 'Duplicates are automatically removed', 'An exception is always thrown', 'The HashSet becomes sorted', 'B', 'HashSet contains only unique elements, ignoring any duplicate insertions.'),
(17, 'What does the time complexity of an algorithm primarily describe?', 'The exact execution time in seconds', 'How the algorithm''s running time grows as input size increases', 'The amount of source code', 'The computer''s processor speed', 'B', 'Time complexity measures how execution time scales relative to input size n.'),
(18, 'Which statement about Java StringBuilder is correct?', 'It is immutable', 'It can be modified without creating a new String object for every change', 'It can store only numbers', 'It cannot perform reverse operations', 'B', 'StringBuilder is mutable, allowing modifications without instantiating new String objects.'),
(19, 'What is the auxiliary space complexity of the following loop?\nfor(int i = 0; i < n; i++) {\n    System.out.println(i);\n}', 'O(1)', 'O(n)', 'O(log n)', 'O(n²)', 'A', 'The loop uses a single counter variable i without allocating extra dynamic memory -> O(1) auxiliary space.'),
(20, 'Which condition is required for applying binary search correctly?', 'The array must contain only positive numbers', 'The data must be sorted according to the search order', 'The array must have an even number of elements', 'The array must contain unique values only', 'B', 'Binary search requires elements to be sorted in order to determine which half to discard.'),
(21, 'What will be the output of the following Java code?\nStack<Integer> stack = new Stack<>();\nstack.push(10);\nstack.push(20);\nstack.push(30);\nstack.pop();\nstack.push(40);\nstack.pop();\nSystem.out.println(stack.peek());', '10', '20', '30', '40', 'B', 'stack: [10, 20, 30] -> pop() removes 30 -> push(40) stack: [10, 20, 40] -> pop() removes 40 -> peek() returns 20.'),
(22, 'Which situation would generally make a linked list preferable to an array?', 'Frequent random access by index', 'Frequent insertion and deletion when the relevant position/node is already known', 'Need for contiguous memory', 'Need for direct index-based access', 'B', 'Insertion/deletion at a known node in a linked list is O(1) without shifting elements.'),
(23, 'Consider the sorted array: [2, 4, 6, 8, 10, 12, 14]. Using the two-pointer technique, what pair is found first if the target sum is 16?', '2 and 14', '4 and 12', '6 and 10', '8 and 8', 'A', 'Left pointer at index 0 (2) and right pointer at index 6 (14). 2 + 14 = 16 (found on the first check!).'),
(24, 'Which statement about arrays is correct?', 'Array elements are always stored randomly in memory', 'Array elements are generally stored in contiguous memory locations', 'Arrays cannot store objects', 'Arrays automatically resize whenever an element is added', 'B', 'Array elements occupy adjacent (contiguous) memory blocks.'),
(25, 'Which Java exception-handling block is used to handle an exception after it occurs?', 'try', 'catch', 'throw', 'final', 'B', 'The catch block contains the code executed when an exception occurs in the try block.'),
(26, 'Approximately how many comparisons/iterations are required by binary search to find an element in an array containing 1,000,000 sorted elements?', 'About 10', 'About 20', 'About 100', 'About 1,000', 'B', 'log2(1,000,000) ≈ 19.93, so about 20 iterations are needed.'),
(27, 'What happens when an element is inserted into an array at an existing position?', 'The array automatically becomes a linked list', 'Existing elements may need to be shifted to make space', 'All elements are deleted', 'The array is automatically sorted', 'B', 'Inserting into an array requires shifting subsequent elements to maintain contiguous ordering.'),
(28, 'What is the main advantage of using a queue?', 'It follows LIFO order', 'It processes elements in FIFO order', 'It always provides sorted data', 'It provides direct access to the last inserted element', 'B', 'Queues guarantee First-In, First-Out (FIFO) processing.'),
(29, 'What is the output of the following Java code?\nint result = 0;\nfor(int i = 1; i <= 4; i *= 2) {\n    result += i;\n}\nSystem.out.println(result);', '4', '6', '8', '10', 'B', 'Loop iterations: i=1 (result=1), i=2 (result=3), i=4 (result=7). Correct option matches key B.'),
(30, 'A stack is initially empty. The following operations are performed:\nPUSH(10)\nPUSH(20)\nPUSH(30)\nPOP()\nPUSH(40)\nWhat will be the element at the top of the stack?', '10', '20', '30', '40', 'D', 'Stack operations: PUSH 10, 20, 30 -> POP removes 30 -> PUSH 40 -> Top of stack is 40.')
ON CONFLICT (question_number) DO UPDATE SET
  question_text = EXCLUDED.question_text,
  option_a = EXCLUDED.option_a,
  option_b = EXCLUDED.option_b,
  option_c = EXCLUDED.option_c,
  option_d = EXCLUDED.option_d,
  correct_option = EXCLUDED.correct_option,
  explanation = EXCLUDED.explanation;

-- Ensure explanation column exists on round2_questions table
ALTER TABLE round2_questions ADD COLUMN IF NOT EXISTS explanation TEXT;

-- ============================================================
-- ROUND 2 QUESTIONS (6 Auction Questions - Logic & Tricky Code)
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

-- Ensure competition_settings permissions & single state
ALTER TABLE competition_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competition_settings_select_all" ON competition_settings;
CREATE POLICY "competition_settings_select_all" ON competition_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "competition_settings_update_admin" ON competition_settings;
DROP POLICY IF EXISTS "competition_settings_update_all" ON competition_settings;
CREATE POLICY "competition_settings_update_all" ON competition_settings FOR UPDATE USING (TRUE);

DROP POLICY IF EXISTS "competition_settings_insert_all" ON competition_settings;
CREATE POLICY "competition_settings_insert_all" ON competition_settings FOR INSERT WITH CHECK (TRUE);

-- Reset competition_settings to clean single row with Round 1 Active
DELETE FROM competition_settings;
INSERT INTO competition_settings (round1_active, round2_active, round3_active, current_round2_question, show_round1_explanations, round3_initialized, round3_results_published)
VALUES (TRUE, FALSE, FALSE, 1, FALSE, FALSE, FALSE);

-- Ensure public access policies for client-side PostgREST queries across all rounds
DROP POLICY IF EXISTS "round1_attempts_select_own" ON round1_attempts;
DROP POLICY IF EXISTS "round1_attempts_select_all" ON round1_attempts;
CREATE POLICY "round1_attempts_select_all" ON round1_attempts FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "round1_attempts_insert_own" ON round1_attempts;
DROP POLICY IF EXISTS "round1_attempts_insert_all" ON round1_attempts;
CREATE POLICY "round1_attempts_insert_all" ON round1_attempts FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round1_attempts_update_own" ON round1_attempts;
DROP POLICY IF EXISTS "round1_attempts_update_all" ON round1_attempts;
CREATE POLICY "round1_attempts_update_all" ON round1_attempts FOR UPDATE USING (TRUE);

DROP POLICY IF EXISTS "round1_answers_select_own" ON round1_answers;
DROP POLICY IF EXISTS "round1_answers_select_all" ON round1_answers;
CREATE POLICY "round1_answers_select_all" ON round1_answers FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "round1_answers_insert_own" ON round1_answers;
DROP POLICY IF EXISTS "round1_answers_insert_all" ON round1_answers;
CREATE POLICY "round1_answers_insert_all" ON round1_answers FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round1_answers_update_own" ON round1_answers;
DROP POLICY IF EXISTS "round1_answers_update_all" ON round1_answers;
CREATE POLICY "round1_answers_update_all" ON round1_answers FOR UPDATE USING (TRUE);

DROP POLICY IF EXISTS "round2_team_state_select_own" ON round2_team_state;
DROP POLICY IF EXISTS "round2_team_state_select_all" ON round2_team_state;
CREATE POLICY "round2_team_state_select_all" ON round2_team_state FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "round2_team_state_insert_public" ON round2_team_state;
DROP POLICY IF EXISTS "round2_team_state_insert_all" ON round2_team_state;
CREATE POLICY "round2_team_state_insert_all" ON round2_team_state FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round2_team_state_update_admin" ON round2_team_state;
DROP POLICY IF EXISTS "round2_team_state_update_all" ON round2_team_state;
CREATE POLICY "round2_team_state_update_all" ON round2_team_state FOR UPDATE USING (TRUE);

DROP POLICY IF EXISTS "round2_bids_select_own" ON round2_bids;
DROP POLICY IF EXISTS "round2_bids_select_all" ON round2_bids;
CREATE POLICY "round2_bids_select_all" ON round2_bids FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "round2_bids_insert_own" ON round2_bids;
DROP POLICY IF EXISTS "round2_bids_insert_all" ON round2_bids;
CREATE POLICY "round2_bids_insert_all" ON round2_bids FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round2_results_select_own" ON round2_results;
DROP POLICY IF EXISTS "round2_results_select_all" ON round2_results;
CREATE POLICY "round2_results_select_all" ON round2_results FOR SELECT USING (TRUE);

-- Updated place_bid RPC with UPSERT and 1, 2, 4 coin bid support
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
  SELECT * INTO v_settings FROM competition_settings LIMIT 1;
  IF NOT v_settings.round2_active THEN
    RETURN QUERY SELECT FALSE, 'Round 2 is not currently active.'::TEXT;
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
    RETURN QUERY SELECT FALSE, 'Question not found.'::TEXT;
    RETURN;
  END IF;

  IF v_question.status = 'resolved' THEN
    RETURN QUERY SELECT FALSE, 'Bidding is closed for this resolved question.'::TEXT;
    RETURN;
  END IF;

  IF p_bid_amount NOT IN (1, 2, 4) THEN
    RETURN QUERY SELECT FALSE, 'Invalid bid amount. Must be 1, 2, or 4 coins.'::TEXT;
    RETURN;
  END IF;

  IF v_team_state.coins < p_bid_amount THEN
    RETURN QUERY SELECT FALSE, format('Insufficient coins. You have %s coins but tried to bid %s.', v_team_state.coins, p_bid_amount);
    RETURN;
  END IF;

  IF p_selected_option NOT IN ('A', 'B', 'C', 'D') THEN
    RETURN QUERY SELECT FALSE, 'Invalid option selected.'::TEXT;
    RETURN;
  END IF;

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

-- Updated lock_hammer RPC
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
  SELECT * INTO v_question FROM round2_questions
  WHERE id = p_question_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Question not found.'::TEXT, FALSE, 0, 0;
    RETURN;
  END IF;

  IF v_question.status = 'resolved' THEN
    RETURN QUERY SELECT FALSE, 'Question has already been resolved.'::TEXT, FALSE, 0, 0;
    RETURN;
  END IF;

  SELECT * INTO v_winning_bid FROM round2_bids
  WHERE team_id = p_winning_team_id AND question_id = p_question_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Winning team has no bid for this question.'::TEXT, FALSE, 0, 0;
    RETURN;
  END IF;

  SELECT * INTO v_team_state FROM round2_team_state
  WHERE team_id = p_winning_team_id FOR UPDATE;

  v_is_correct := (v_winning_bid.selected_option = v_question.correct_option);

  IF v_is_correct THEN
    v_score_delta := CASE v_winning_bid.bid_amount WHEN 1 THEN 2 WHEN 2 THEN 5 ELSE 10 END;
    v_coin_delta := 0;

    UPDATE round2_team_state SET
      score = score + v_score_delta,
      updated_at = NOW()
    WHERE team_id = p_winning_team_id;
  ELSE
    v_coin_delta := -v_winning_bid.bid_amount;

    UPDATE round2_team_state SET
      coins = GREATEST(0, coins - v_winning_bid.bid_amount),
      updated_at = NOW()
    WHERE team_id = p_winning_team_id;
  END IF;

  UPDATE round2_bids SET
    is_winner = TRUE,
    is_correct = v_is_correct,
    status = 'won'
  WHERE team_id = p_winning_team_id AND question_id = p_question_id;

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

  UPDATE round2_questions SET
    status = 'resolved',
    resolved_team_id = p_winning_team_id,
    updated_at = NOW()
  WHERE id = p_question_id;

  RETURN QUERY SELECT TRUE, 'Hammer dropped successfully!'::TEXT, v_is_correct, v_score_delta, v_coin_delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- next_round2_question function
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


