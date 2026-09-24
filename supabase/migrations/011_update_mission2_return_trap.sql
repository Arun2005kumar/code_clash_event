-- Migration 011: Update Mission 02 to "The Return Trap" (Java try/finally puzzle)

UPDATE round3_missions
SET title = 'The Return Trap',
    difficulty = 'Moderate',
    time_estimate = '3-4 min',
    handout_content = '{
      "briefing": "The hacker left a program behind. Something happens between return and the actual exit. Predict exactly what the program prints.",
      "code": "static int test() {\n    int result = 0;\n\n    for (int i = 0; i < 3; i++) {\n        try {\n            result = i;\n            return result;\n        } finally {\n            result = 100;\n        }\n    }\n\n    return -1;\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(test());\n    }\n}",
      "question": "What will this program print?",
      "options": [
        {"label": "A", "text": "0"},
        {"label": "B", "text": "100"},
        {"label": "C", "text": "-1"},
        {"label": "D", "text": "2"}
      ],
      "hints": [
        "Ask yourself: when does Java evaluate the value that is being returned?",
        "The finally block executes before the method actually exits. Check whether changing the variable changes an already-evaluated return value."
      ]
    }'::jsonb,
    staff_answer = 'A',
    clue_piece = '0'
WHERE mission_number = 2;
