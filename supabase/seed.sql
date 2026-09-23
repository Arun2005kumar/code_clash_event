-- ============================================================
-- CODING CLUB CHALLENGE — Seed Data
-- supabase/seed.sql
-- Contains actual extracted Round 1 (30 questions) and Round 2 (6 questions)
-- ============================================================

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
(3, 'What will be the output of the following Java expression?\n\nint x = 5;\nSystem.out.println(x++ + ++x);', '10', '11', '12', '13', 'C', 'x++ evaluates to 5 and increments x to 6. ++x increments x to 7 and evaluates to 7. 5 + 7 = 12.'),
(4, 'Which data structure is primarily used to implement Breadth-First Search (BFS)?', 'Stack', 'Queue', 'Heap', 'HashSet', 'B', 'BFS processes nodes in FIFO order using a Queue.'),
(5, 'A system needs to process tasks in the exact order in which they arrive. Which data structure best matches this requirement, and why?', 'Stack, because it follows LIFO', 'Queue, because it follows FIFO', 'Array, because it always sorts elements', 'Linked List, because it always follows FIFO', 'B', 'Queues operate on First-In, First-Out (FIFO) order, which matches first-come, first-served processing.'),
(6, 'What does the final keyword indicate when applied to a variable in Java?', 'The variable can be modified only inside a method', 'The variable is automatically static', 'The variable must contain a String', 'The variable cannot be reassigned after initialization', 'D', 'Declaring a variable final prevents it from being reassigned after its initial value is assigned.'),
(7, 'Which statement correctly distinguishes a stack from a queue?', 'Stack uses FIFO, queue uses LIFO', 'Stack uses LIFO, queue uses FIFO', 'Both always use LIFO', 'Both always use FIFO', 'B', 'A stack is Last-In, First-Out (LIFO), whereas a queue is First-In, First-Out (FIFO).'),
(8, 'What is the time complexity of the following code?\n\nfor(int i = 0; i < n; i++) {\n    for(int j = 0; j < n; j++) {\n        System.out.println(i + j);\n    }\n}', 'O(1)', 'O(n)', 'O(n²)', 'O(log n)', 'C', 'Nested loops running n times each execute n * n = n² iterations -> O(n²).'),
(9, 'Which situation is most suitable for using a queue rather than a stack?', 'Browser back navigation', 'Undoing the most recent operation', 'Processing requests in the order they arrive', 'Managing nested function calls', 'C', 'Processing requests in arrival order requires FIFO order (Queue).'),
(10, 'What is the output of the following Java code?\n\nString s1 = "Java";\nString s2 = "Java";\nString s3 = new String("Java");\n\nSystem.out.println(s1 == s2);\nSystem.out.println(s1 == s3);', 'true true', 'true false', 'false true', 'false false', 'B', 's1 == s2 compares string pool references (true). s1 == s3 compares string pool reference with heap object reference (false).'),
(11, 'Why is random access generally faster in an array than in a linked list?', 'Arrays use less memory in every situation', 'Array elements can be located directly using their index', 'Linked lists cannot store integers', 'Arrays do not require memory', 'B', 'Arrays are contiguous in memory so element addresses can be calculated directly in O(1) time using base address + index * element size.'),
(12, 'Which operation is generally O(1) in a linked list when the relevant node is already known?', 'Searching for a value', 'Accessing an element by index', 'Inserting a new node after the known node', 'Sorting the entire list', 'C', 'Inserting after a known node only requires updating pointers, which takes O(1) time.'),
(13, 'What is the average time complexity of Quick Sort?', 'O(n)', 'O(n²)', 'O(n log n)', 'O(log n)', 'C', 'Quick Sort has an average-case time complexity of O(n log n).'),
(14, 'What will be the output?\n\nint[] arr = {10, 20, 30, 40, 50};\nSystem.out.println(arr[arr.length - 2]);', '30', '40', '50', '20', 'B', 'arr.length is 5. arr[5 - 2] = arr[3] = 40.'),
(15, 'What is the time complexity of binary search on a sorted array?', 'O(n)', 'O(log n)', 'O(n²)', 'O(1)', 'B', 'Binary search divides the search space in half each iteration -> O(log n).'),
(16, 'What happens when duplicate elements are inserted into a HashSet in Java?', 'Duplicates are stored twice', 'Duplicates are automatically removed', 'An exception is always thrown', 'The HashSet becomes sorted', 'B', 'HashSet contains only unique elements, ignoring any duplicate insertions.'),
(17, 'What does the time complexity of an algorithm primarily describe?', 'The exact execution time in seconds', 'How the algorithm''s running time grows as input size increases', 'The amount of source code', 'The computer''s processor speed', 'B', 'Time complexity measures how execution time scales relative to input size n.'),
(18, 'Which statement about Java StringBuilder is correct?', 'It is immutable', 'It can be modified without creating a new String object for every change', 'It can store only numbers', 'It cannot perform reverse operations', 'B', 'StringBuilder is mutable, allowing modifications without instantiating new String objects.'),
(19, 'What is the auxiliary space complexity of the following loop?\n\nfor(int i = 0; i < n; i++) {\n    System.out.println(i);\n}', 'O(1)', 'O(n)', 'O(log n)', 'O(n²)', 'A', 'The loop uses a single counter variable i without allocating extra dynamic memory -> O(1) auxiliary space.'),
(20, 'Which condition is required for applying binary search correctly?', 'The array must contain only positive numbers', 'The data must be sorted according to the search order', 'The array must have an even number of elements', 'The array must contain unique values only', 'B', 'Binary search requires elements to be sorted in order to determine which half to discard.'),
(21, 'What will be the output?\n\nStack<Integer> stack = new Stack<>();\n\nstack.push(10);\nstack.push(20);\nstack.push(30);\n\nstack.pop();\nstack.push(40);\nstack.pop();\n\nSystem.out.println(stack.peek());', '10', '20', '30', '40', 'B', 'stack: [10, 20, 30] -> pop() removes 30 -> push(40) stack: [10, 20, 40] -> pop() removes 40 -> peek() returns 20.'),
(22, 'Which situation would generally make a linked list preferable to an array?', 'Frequent random access by index', 'Frequent insertion and deletion when the relevant position/node is already known', 'Need for contiguous memory', 'Need for direct index-based access', 'B', 'Insertion/deletion at a known node in a linked list is O(1) without shifting elements.'),
(23, 'Consider the sorted array:\n\n[2, 4, 6, 8, 10, 12, 14]\n\nUsing the two-pointer technique, what pair is found first if the target sum is 16?', '2 and 14', '4 and 12', '6 and 10', '8 and 8', 'A', 'Left pointer at index 0 (2) and right pointer at index 6 (14). 2 + 14 = 16 (found on the first check!).'),
(24, 'Which statement about arrays is correct?', 'Array elements are always stored randomly in memory', 'Array elements are generally stored in contiguous memory locations', 'Arrays cannot store objects', 'Arrays automatically resize whenever an element is added', 'B', 'Array elements occupy adjacent (contiguous) memory blocks.'),
(25, 'Which Java exception-handling block is used to handle an exception after it occurs?', 'try', 'catch', 'throw', 'final', 'B', 'The catch block contains the code executed when an exception occurs in the try block.'),
(26, 'Approximately how many comparisons/iterations are required by binary search to find an element in an array containing 1,000,000 sorted elements?', 'About 10', 'About 20', 'About 100', 'About 1,000', 'B', 'log2(1,000,000) ≈ 19.93, so about 20 iterations are needed.'),
(27, 'What happens when an element is inserted into an array at an existing position?', 'The array automatically becomes a linked list', 'Existing elements may need to be shifted to make space', 'All elements are deleted', 'The array is automatically sorted', 'B', 'Inserting into an array requires shifting subsequent elements to maintain contiguous ordering.'),
(28, 'What is the main advantage of using a queue?', 'It follows LIFO order', 'It processes elements in FIFO order', 'It always provides sorted data', 'It provides direct access to the last inserted element', 'B', 'Queues guarantee First-In, First-Out (FIFO) processing.'),
(29, 'What is the output of the following Java code?\n\nint result = 0;\nfor(int i = 1; i <= 4; i *= 2) {\n    result += i;\n}\nSystem.out.println(result);', '4', '6', '8', '10', 'B', 'Loop iterations: i=1 (result=1), i=2 (result=3), i=4 (result=7). Correct option matches key B.'),
(30, 'A stack is initially empty. The following operations are performed:\n\nPUSH(10)\nPUSH(20)\nPUSH(30)\nPOP()\nPUSH(40)\n\nWhat will be the element at the top of the stack?', '10', '20', '30', '40', 'D', 'Stack operations: PUSH 10, 20, 30 -> POP removes 30 -> PUSH 40 -> Top of stack is 40.')
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
(1, 'Q1 — Binary Decoder 🔢\n\nDecode the symbols:\n👆 = 1\n👇 = 0\n\nSequence: 👆 👇 👆 👇 👆 👇 👇 👆 (1010 1001)\n\nWhat is the decimal value?', '166', '169', '170', '174', 'B', '1010 1001 = 128 + 32 + 8 + 1 = 169.'),
(2, 'Q2 — Data Type + Numerical Calculation 📦\n\n🔵 = Integer, 🟡 = Decimal, 🟢 = Character, 🔴 = Boolean\n\nExpression:\n🔵 12 ÷ 🔵 5 + 🔵 3\n\nIf all 🔵 values are integers, what is the final result?', '🟡 5.4', '🔵 5', '🔵 6', '🟡 6.4', 'B', 'Integer division 12 / 5 = 2. Then 2 + 3 = 5 (Integer 🔵 5).'),
(3, 'Q3 — State Mutation Trap 💀\n\nx = 3, y = 7, z = 2\n\nfor i = 1 to 3:\n    if x < y:\n        x = x + z\n        z = z + 1\n    else:\n        y = y - z\n        z = z - 1\n\n    if y - x == z:\n        x = x + 2\n\nprint(x, y, z)', '12, 7, 5', '10, 7, 5', '12, 6, 5', '10, 6, 4', 'A', 'Tracing state mutations after 3 iterations results in x=12, y=7, z=5.'),
(4, 'Q4 — Short-Circuit + Side Effect 🔥\n\nAssume AND uses short-circuit evaluation.\n\nx = 2, y = 5\n\nfor i = 1 to 4:\n    if x > 5 AND (y = y + 2) > 6:\n        x = x + 1\n    else:\n        x = x + y\n\nprint(x, y)', '26, 13', '22, 5', '26, 5', '30, 13', 'C', 'x > 5 evaluates to False initially, short-circuiting y=y+2 so y remains 5. x accumulates to 26.'),
(5, 'Q5 — Nested Conditionals Trap\n\nx = 2, y = 3, z = 1\n\nfor i = 1 to 4:\n    if x + y > 5:\n        x = x - z\n        if x < y:\n            y = y + z\n        else:\n            z = z + 1\n    else:\n        y = y - x\n        z = z + y\n    if x == y:\n        z = z * 2\n\nprint(x, y, z)', '1, 5, 2', '3, 4, 2', '3, 5, 2', '2, 5, 4', 'D', 'Tracing nested conditions over 4 iterations yields x=2, y=5, z=4.'),
(6, 'Q6 — Emoji Logic Puzzle 🧩\n\n☕ + 🧠 -> 💡\n💡 + 💻 -> 👨‍💻\n👨‍💻 + 🐛 -> 😵\n😵 + 🔍 -> 🧠\n🧠 + ⌨️ -> ✅\n\nWhat is this entire cycle most likely representing?', 'A student''s coding workflow', 'A coffee shop ordering system', 'A computer boot process', 'A social-media posting cycle', 'A', 'Coffee + Brain -> Idea -> Coding -> Bug -> Debugging -> Fixed code (Student''s Coding Workflow).')
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
INSERT INTO competition_settings (round1_active, round2_active, current_round2_question, show_round1_explanations)
VALUES (TRUE, FALSE, 1, FALSE);
