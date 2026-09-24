-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 015_update_round2_hard_questions.sql
-- Ensure Round 2 questions (Q1 - Q6 Hard Trick Questions) have valid fixed UUIDs,
-- full RLS public access, and properly exposed public views.
-- ============================================================

-- 1. Ensure RLS policy on round2_questions allows select
ALTER TABLE round2_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "round2_questions_select_all" ON round2_questions;
CREATE POLICY "round2_questions_select_all" ON round2_questions FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "round2_questions_insert_all" ON round2_questions;
CREATE POLICY "round2_questions_insert_all" ON round2_questions FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round2_questions_update_all" ON round2_questions;
CREATE POLICY "round2_questions_update_all" ON round2_questions FOR UPDATE USING (TRUE);

-- 2. Upsert 6 Hard Trick Questions with fixed UUIDs
INSERT INTO round2_questions (id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, status) VALUES
(
  '00000002-0000-0000-0000-000000000001',
  1,
  'Q1 — State Mutation Trap 💀

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

print(x, y, z)',
  '12, 7, 5',
  '10, 7, 5',
  '12, 6, 5',
  '10, 6, 4',
  'A',
  'Tracing state mutations step-by-step results in x = 12, y = 7, z = 5.',
  'waiting'
),
(
  '00000002-0000-0000-0000-000000000002',
  2,
  'Q2 — Nested Branch Trace

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

print(x, y, z)',
  '1, 5, 2',
  '3, 4, 2',
  '3, 5, 2',
  '2, 5, 4',
  'D',
  'Tracing nested conditions over 4 iterations yields x = 2, y = 5, z = 4.',
  'waiting'
),
(
  '00000002-0000-0000-0000-000000000003',
  3,
  'Q3 — Binary Decoder 🔢

Decode the symbols:

- 👆 = 1
- 👇 = 0

Sequence:

👆 👇 👆 👇 👆 👇 👇 👆

What is the decimal value?',
  '166',
  '169',
  '170',
  '174',
  'B',
  '1010 1001 = 128 + 32 + 8 + 1 = 169.',
  'waiting'
),
(
  '00000002-0000-0000-0000-000000000004',
  4,
  'Q4 — Data Type + Numerical Calculation 📦

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

If all 🔵 values are integers, what is the final result?',
  '🟡 5.4',
  '🔵 5',
  '🔵 6',
  '🟡 6.4',
  'B',
  'Integer division 12 / 5 = 2. Then 2 + 3 = 5 (Integer 🔵 5).',
  'waiting'
),
(
  '00000002-0000-0000-0000-000000000005',
  5,
  'Q5 — Short-Circuit + Side Effect 🔥

Assume AND uses short-circuit evaluation.

x = 2
y = 5

for i = 1 to 4:

    if x > 5 AND (y = y + 2) > 6:
        x = x + 1
    else:
        x = x + y

print(x, y)',
  '26, 13',
  '22, 5',
  '26, 5',
  '30, 13',
  'C',
  'x > 5 evaluates to False initially, short-circuiting (y = y + 2) so y remains 5. x accumulates to 26.',
  'waiting'
),
(
  '00000002-0000-0000-0000-000000000006',
  6,
  'Q6 — Emoji Logic Puzzle 🧠

Decode the emoji sequence and find out what the entire cycle represents.

☕  + 🧠   → 💡
💡  + 💻   → 🧑💻
🧑💻 + 🐛   → 😵
😵  + 🔍   → 🧠
🧠  + ⌨️   → ✅

What is this entire cycle most likely representing?',
  'A student''s coding workflow',
  'A coffee shop ordering system',
  'A computer boot process',
  'A social-media posting cycle',
  'A',
  'Coffee + Brain -> Idea -> Coding -> Bug -> Debugging -> Fixed code (Student''s Coding Workflow).',
  'waiting'
)
ON CONFLICT (question_number) DO UPDATE SET
  id              = EXCLUDED.id,
  question_text   = EXCLUDED.question_text,
  option_a        = EXCLUDED.option_a,
  option_b        = EXCLUDED.option_b,
  option_c        = EXCLUDED.option_c,
  option_d        = EXCLUDED.option_d,
  correct_option  = EXCLUDED.correct_option,
  explanation     = EXCLUDED.explanation;

-- 3. Re-create public view
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

-- Ensure competition_settings has default round2 current question
INSERT INTO competition_settings (id, round2_active, current_round2_question)
VALUES ('00000000-0000-0000-0000-000000000001', false, 1)
ON CONFLICT (id) DO NOTHING;
