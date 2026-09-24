import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujzsvnqjbdhynqpamutj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqenN2bnFqYmRoeW5xcGFtdXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzYzNDIsImV4cCI6MjEwNTcxMjM0Mn0.enCsXZSCl1VEmmUxlRLYdaWLPMqaJXEs9Uv1QAoZc10';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const questions = [
  {
    id: '00000002-0000-0000-0000-000000000001',
    question_number: 1,
    question_text: `Q1 — State Mutation Trap 💀\n\nx = 3\ny = 7\nz = 2\n\nfor i = 1 to 3:\n\n    if x < y:\n        x = x + z\n        z = z + 1\n    else:\n        y = y - z\n        z = z - 1\n\n    if y - x == z:\n        x = x + 2\n\nprint(x, y, z)`,
    option_a: '12, 7, 5',
    option_b: '10, 7, 5',
    option_c: '12, 6, 5',
    option_d: '10, 6, 4',
    correct_option: 'A',
    explanation: 'Tracing state mutations step-by-step results in x = 12, y = 7, z = 5.',
    status: 'waiting',
  },
  {
    id: '00000002-0000-0000-0000-000000000002',
    question_number: 2,
    question_text: `Q2 — Nested Branch Trace\n\nx = 2\ny = 3\nz = 1\n\nfor i = 1 to 4:\n\n    if x + y > 5:\n\n        x = x - z\n\n        if x < y:\n            y = y + z\n        else:\n            z = z + 1\n\n    else:\n\n        y = y - x\n        z = z + y\n\n    if x == y:\n        z = z * 2\n\nprint(x, y, z)`,
    option_a: '1, 5, 2',
    option_b: '3, 4, 2',
    option_c: '3, 5, 2',
    option_d: '2, 5, 4',
    correct_option: 'D',
    explanation: 'Tracing nested conditions over 4 iterations yields x = 2, y = 5, z = 4.',
    status: 'waiting',
  },
  {
    id: '00000002-0000-0000-0000-000000000003',
    question_number: 3,
    question_text: `Q3 — Binary Decoder 🔢\n\nDecode the symbols:\n\n- 👆 = 1\n- 👇 = 0\n\nSequence:\n\n👆 👇 👆 👇 👆 👇 👇 👆\n\nWhat is the decimal value?`,
    option_a: '166',
    option_b: '169',
    option_c: '170',
    option_d: '174',
    correct_option: 'B',
    explanation: '1010 1001 = 128 + 32 + 8 + 1 = 169.',
    status: 'waiting',
  },
  {
    id: '00000002-0000-0000-0000-000000000004',
    question_number: 4,
    question_text: `Q4 — Data Type + Numerical Calculation 📦\n\nLegend:\n\n- 🔵 = Integer\n- 🟡 = Decimal\n- 🟢 = Character\n- 🔴 = Boolean\n\nExpression:\n\n🔵 12\n÷\n🔵 5\n+\n🔵 3\n\nIf all 🔵 values are integers, what is the final result?`,
    option_a: '🟡 5.4',
    option_b: '🔵 5',
    option_c: '🔵 6',
    option_d: '🟡 6.4',
    correct_option: 'B',
    explanation: 'Integer division 12 / 5 = 2. Then 2 + 3 = 5 (Integer 🔵 5).',
    status: 'waiting',
  },
  {
    id: '00000002-0000-0000-0000-000000000005',
    question_number: 5,
    question_text: `Q5 — Short-Circuit + Side Effect 🔥\n\nAssume AND uses short-circuit evaluation.\n\nx = 2\ny = 5\n\nfor i = 1 to 4:\n\n    if x > 5 AND (y = y + 2) > 6:\n        x = x + 1\n    else:\n        x = x + y\n\nprint(x, y)`,
    option_a: '26, 13',
    option_b: '22, 5',
    option_c: '26, 5',
    option_d: '30, 13',
    correct_option: 'C',
    explanation: 'x > 5 evaluates to False initially, short-circuiting (y = y + 2) so y remains 5. x accumulates to 26.',
    status: 'waiting',
  },
  {
    id: '00000002-0000-0000-0000-000000000006',
    question_number: 6,
    question_text: `Q6 — Emoji Logic Puzzle 🧠\n\nDecode the emoji sequence and find out what the entire cycle represents.\n\n☕  + 🧠   → 💡\n💡  + 💻   → 🧑💻\n🧑💻 + 🐛   → 😵\n😵  + 🔍   → 🧠\n🧠  + ⌨️   → ✅\n\nWhat is this entire cycle most likely representing?`,
    option_a: "A student's coding workflow",
    option_b: 'A coffee shop ordering system',
    option_c: 'A computer boot process',
    option_d: 'A social-media posting cycle',
    correct_option: 'A',
    explanation: "Coffee + Brain -> Idea -> Coding -> Bug -> Debugging -> Fixed code (Student's Coding Workflow).",
    status: 'waiting',
  },
];

async function updateDb() {
  console.log('Upserting 6 Round 2 Hard Trick questions into Supabase...');
  const { data, error } = await supabase
    .from('round2_questions')
    .upsert(questions, { onConflict: 'question_number' });

  if (error) {
    console.error('Error upserting Round 2 questions:', error.message);
  } else {
    console.log('Successfully updated all 6 Round 2 questions in Supabase database!');
  }
}

updateDb();
