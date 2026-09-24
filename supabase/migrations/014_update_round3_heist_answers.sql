-- 014_update_round3_heist_answers.sql

-- 1. Update round3_missions seed data with exact heist specs
INSERT INTO round3_missions (mission_number, title, difficulty, time_estimate, handout_content, staff_answer, clue_piece) VALUES
(1, 'THE HIDDEN MESSAGE', 'Easy', '4-5 min',
'{
  "briefing": "We have intercepted a suspicious message hidden inside four lines of text. Extract the hidden letters using the rule below.",
  "lines": [
    "1. Curious teams inspect clues.",
    "2. Observe game patterns carefully.",
    "3. Teams solve fun puzzles.",
    "4. Smart teams can find answers."
  ],
  "instruction": "Nth LINE → Nth WORD → Nth LETTER",
  "final_hint": "What do we use when there is no light?",
  "hints": [
    "Follow the extraction rule for each line.",
    "Line 1 → 1st word, 1st letter. Line 2 → 2nd word, 2nd letter. And so on.",
    "Think about what you light up when there is no power or light."
  ]
}',
'CANDLE', 'CANDLE'),

(2, 'THE RETURN TRAP', 'Moderate', '3-4 min',
'{
  "briefing": "A piece of code has been intercepted from the system. The code contains a trap involving return and finally. Determine exactly what the program returns.",
  "code": "static int test() {\n    int result = 0;\n\n    for (int i = 0; i < 3; i++) {\n        try {\n            result = i;\n            return result;\n        } finally {\n            result = 100;\n        }\n    }\n\n    return -1;\n}",
  "hints": [
    "Ask yourself: when does Java evaluate the value that is being returned?",
    "The finally block executes before the method actually exits. Check whether changing the variable changes an already-evaluated return value."
  ]
}',
'0', '0'),

(3, 'THE HACKERS SWITCHBOARD', 'Moderate', '4-6 min',
'{
  "briefing": "A scrambled signal has been intercepted. The system uses letters as numeric codes. Discover the hidden mapping and decode the final transmission.",
  "equations": [
    "A + A = 8",
    "B + B = 14",
    "C + C = 4",
    "D + D = 18"
  ],
  "target": "C A D B",
  "hints": [
    "Divide each letter sum by 2 to find its numeric value.",
    "A = 4, B = 7, C = 2, D = 9. Now write out C A D B."
  ]
}',
'2497', '2497'),

(4, 'THE SAFE CRACK', 'Moderate', '3-4 min',
'{
  "briefing": "The next key is protected by a 3-digit security lock. Five intercepted clues reveal the combination. Crack the code before the security system locks down.",
  "clues": [
    "682 → One digit is correct and correctly placed",
    "614 → One digit is correct but wrongly placed",
    "206 → Two digits are correct but wrongly placed",
    "738 → Nothing is correct",
    "780 → One digit is correct but wrongly placed"
  ],
  "hints": [
    "Start with the clue where no digit is correct.",
    "The last clue tells you something about 0, 7 and 8."
  ]
}',
'042', '042'),

(5, 'FIX THE PUZZLE', 'Moderate+', '5-6 min',
'{
  "briefing": "The final system has been corrupted. Five code fragments have been separated and shuffled. Your team must reconstruct the program in the correct order.",
  "strips": [
    "}",
    "total = total * 2;",
    "System.out.println(total);",
    "int total = 1;",
    "for (int i = 1; i <= 3; i++) {"
  ],
  "hints": [
    "What must exist before the loop can run?",
    "The print happens once — is it inside or outside the loop?"
  ]
}',
'8', '8')

ON CONFLICT (mission_number) DO UPDATE SET
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  time_estimate = EXCLUDED.time_estimate,
  handout_content = EXCLUDED.handout_content,
  staff_answer = EXCLUDED.staff_answer,
  clue_piece = EXCLUDED.clue_piece;

-- 2. Update validate_mission_answer to handle answer checking cleanly
CREATE OR REPLACE FUNCTION validate_mission_answer(
  p_team_id UUID,
  p_mission_number INTEGER,
  p_submitted_answer TEXT
) RETURNS JSONB AS $$
DECLARE
  v_correct_answer TEXT;
  v_clue_piece TEXT;
  v_is_correct BOOLEAN := FALSE;
  v_existing RECORD;
  v_completed_count INTEGER;
  v_clean_submit TEXT;
  v_clean_correct TEXT;
BEGIN
  SELECT * INTO v_existing FROM round3_mission_attempts
  WHERE team_id = p_team_id AND mission_number = p_mission_number AND is_correct = true;

  IF FOUND THEN
    RETURN jsonb_build_object('already_completed', true, 'is_correct', true, 'clue_piece', v_existing.clue_piece_revealed);
  END IF;

  SELECT staff_answer, clue_piece INTO v_correct_answer, v_clue_piece
  FROM round3_missions WHERE mission_number = p_mission_number AND is_active = true;

  v_clean_submit := LOWER(TRIM(p_submitted_answer));
  v_clean_correct := LOWER(TRIM(v_correct_answer));

  v_is_correct := (v_clean_submit = v_clean_correct);

  -- Special tolerance for 042 vs 42 in Mission 4
  IF NOT v_is_correct AND p_mission_number = 4 AND (v_clean_submit = '42' OR v_clean_submit = '042') THEN
    v_is_correct := TRUE;
  END IF;

  INSERT INTO round3_mission_attempts (team_id, mission_number, submitted_answer, is_correct, clue_piece_revealed, completed_at)
  VALUES (p_team_id, p_mission_number, p_submitted_answer, v_is_correct,
          CASE WHEN v_is_correct THEN v_clue_piece ELSE NULL END,
          CASE WHEN v_is_correct THEN NOW() ELSE NULL END)
  ON CONFLICT (team_id, mission_number) DO UPDATE
    SET submitted_answer = EXCLUDED.submitted_answer,
        is_correct = EXCLUDED.is_correct,
        clue_piece_revealed = EXCLUDED.clue_piece_revealed,
        completed_at = EXCLUDED.completed_at;

  IF v_is_correct THEN
    SELECT COUNT(*) INTO v_completed_count FROM round3_mission_attempts
    WHERE team_id = p_team_id AND is_correct = true;

    IF v_completed_count >= 5 THEN
      UPDATE round3_team_state
      SET status = 'vault_open'
      WHERE team_id = p_team_id AND status != 'completed';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'clue_piece', CASE WHEN v_is_correct THEN v_clue_piece ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update validate_vault_password to validate password CA2547
CREATE OR REPLACE FUNCTION validate_vault_password(
  p_team_id UUID,
  p_password TEXT
) RETURNS JSONB AS $$
DECLARE
  v_is_correct BOOLEAN;
  v_completed_count INTEGER;
  v_state RECORD;
  v_clean_pw TEXT;
BEGIN
  SELECT COUNT(*) INTO v_completed_count FROM round3_mission_attempts
  WHERE team_id = p_team_id AND is_correct = true;

  IF v_completed_count < 5 THEN
    RETURN jsonb_build_object('error', 'Complete all 5 missions first');
  END IF;

  SELECT * INTO v_state FROM round3_team_state WHERE team_id = p_team_id;

  IF v_state.vault_unlocked THEN
    RETURN jsonb_build_object('already_unlocked', true, 'is_correct', true);
  END IF;

  v_clean_pw := UPPER(TRIM(p_password));

  v_is_correct := (v_clean_pw = 'CA2547');

  INSERT INTO round3_vault_attempts (team_id, entered_password, is_correct)
  VALUES (p_team_id, p_password, v_is_correct);

  UPDATE round3_team_state
  SET vault_attempts = COALESCE(vault_attempts, 0) + 1,
      vault_unlocked = v_is_correct,
      completed_at = CASE WHEN v_is_correct THEN NOW() ELSE completed_at END,
      status = CASE WHEN v_is_correct THEN 'completed' ELSE status END,
      finish_time_seconds = CASE WHEN v_is_correct
        THEN GREATEST(1, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER)
        ELSE finish_time_seconds END
  WHERE team_id = p_team_id;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'vault_attempts', COALESCE(v_state.vault_attempts, 0) + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
