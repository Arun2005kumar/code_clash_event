-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 004_round3.sql
-- Round 3: Code Clash — Operation Tech Heist
-- ============================================================

-- 1. TABLE: round3_missions
CREATE TABLE IF NOT EXISTS round3_missions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mission_number INTEGER NOT NULL UNIQUE CHECK (mission_number BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  time_estimate TEXT NOT NULL,
  handout_content JSONB NOT NULL,
  staff_answer TEXT NOT NULL,
  clue_piece TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE: round3_team_state
CREATE TABLE IF NOT EXISTS round3_team_state (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'vault_open', 'completed')),
  hints_used INTEGER DEFAULT 0,
  finish_time_seconds INTEGER,
  vault_attempts INTEGER DEFAULT 0,
  vault_unlocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE: round3_mission_attempts
CREATE TABLE IF NOT EXISTS round3_mission_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  mission_number INTEGER NOT NULL CHECK (mission_number BETWEEN 1 AND 5),
  submitted_answer TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  clue_piece_revealed TEXT,
  hint_count INTEGER DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(team_id, mission_number)
);

-- 4. TABLE: round3_vault_attempts
CREATE TABLE IF NOT EXISTS round3_vault_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  entered_password TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE: round3_bonus_attempts
CREATE TABLE IF NOT EXISTS round3_bonus_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  submitted_answer TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update competition_settings table
ALTER TABLE competition_settings
  ADD COLUMN IF NOT EXISTS round3_initialized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS round3_results_published BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_round3_missions_number ON round3_missions(mission_number);
CREATE INDEX IF NOT EXISTS idx_round3_team_state_team_id ON round3_team_state(team_id);
CREATE INDEX IF NOT EXISTS idx_round3_mission_attempts_team_mission ON round3_mission_attempts(team_id, mission_number);
CREATE INDEX IF NOT EXISTS idx_round3_vault_attempts_team ON round3_vault_attempts(team_id);

-- Enable RLS
ALTER TABLE round3_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE round3_team_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE round3_mission_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE round3_vault_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE round3_bonus_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "teams_read_missions_public" ON round3_missions;
CREATE POLICY "teams_read_missions_public" ON round3_missions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "team_own_r3_state_select" ON round3_team_state;
CREATE POLICY "team_own_r3_state_select" ON round3_team_state
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "team_own_r3_state_all" ON round3_team_state;
CREATE POLICY "team_own_r3_state_all" ON round3_team_state
  FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "team_own_r3_attempts_all" ON round3_mission_attempts;
CREATE POLICY "team_own_r3_attempts_all" ON round3_mission_attempts
  FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "team_own_vault_all" ON round3_vault_attempts;
CREATE POLICY "team_own_vault_all" ON round3_vault_attempts
  FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "team_own_bonus_all" ON round3_bonus_attempts;
CREATE POLICY "team_own_bonus_all" ON round3_bonus_attempts
  FOR ALL USING (TRUE);

-- Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'round3_team_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE round3_team_state;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'round3_mission_attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE round3_mission_attempts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'round3_missions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE round3_missions;
  END IF;
END $$;

-- RPC Functions

-- Function 1: validate_mission_answer
CREATE OR REPLACE FUNCTION validate_mission_answer(
  p_team_id UUID,
  p_mission_number INTEGER,
  p_submitted_answer TEXT
) RETURNS JSONB AS $$
DECLARE
  v_correct_answer TEXT;
  v_clue_piece TEXT;
  v_is_correct BOOLEAN;
  v_existing RECORD;
  v_completed_count INTEGER;
BEGIN
  SELECT * INTO v_existing FROM round3_mission_attempts
  WHERE team_id = p_team_id AND mission_number = p_mission_number AND is_correct = true;

  IF FOUND THEN
    RETURN jsonb_build_object('already_completed', true, 'is_correct', true, 'clue_piece', v_existing.clue_piece_revealed);
  END IF;

  SELECT staff_answer, clue_piece INTO v_correct_answer, v_clue_piece
  FROM round3_missions WHERE mission_number = p_mission_number AND is_active = true;

  v_is_correct := LOWER(TRIM(p_submitted_answer)) = LOWER(TRIM(v_correct_answer));

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

-- Function 2: validate_vault_password
CREATE OR REPLACE FUNCTION validate_vault_password(
  p_team_id UUID,
  p_password TEXT
) RETURNS JSONB AS $$
DECLARE
  v_is_correct BOOLEAN;
  v_completed_count INTEGER;
  v_state RECORD;
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

  v_is_correct := UPPER(TRIM(p_password)) = 'CA45';

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

-- Function 3: increment_hint_count
CREATE OR REPLACE FUNCTION increment_hint_count(
  p_team_id UUID,
  p_mission_number INTEGER
) RETURNS JSONB AS $$
BEGIN
  INSERT INTO round3_mission_attempts (team_id, mission_number, hint_count)
  VALUES (p_team_id, p_mission_number, 1)
  ON CONFLICT (team_id, mission_number) DO UPDATE
    SET hint_count = round3_mission_attempts.hint_count + 1;

  UPDATE round3_team_state
  SET hints_used = hints_used + 1
  WHERE team_id = p_team_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: init_round3_team_states
CREATE OR REPLACE FUNCTION init_round3_team_states() RETURNS JSONB AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  INSERT INTO round3_team_state (team_id, status)
  SELECT id, 'not_started' FROM teams
  ON CONFLICT (team_id) DO NOTHING;
  
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE competition_settings SET round3_initialized = TRUE;

  RETURN jsonb_build_object('success', true, 'count', v_inserted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed Data for 5 Missions
INSERT INTO round3_missions (mission_number, title, difficulty, time_estimate, handout_content, staff_answer, clue_piece) VALUES
(1, 'The Hidden Object', 'Easy', '4-5 min',
'{
  "briefing": "The marker hid 4 letters in plain sight. Study the lines carefully - the answer is in how they are numbered.",
  "lines": [
    "1. Carefully observe every detail.",
    "2. The marker is hidden here.",
    "3. Look around sun once.",
    "4. Smart teams can find it."
  ],
  "instruction": "You have found 4 letters: _ _ _ _",
  "final_hint": "You use me when the lights go out. What is the 6-letter word?",
  "hints": [
    "The four letters are already hidden in the sentences.",
    "The line number matters — line 1, line 2, line 3, line 4.",
    "Line 1 → 1st word, 1st letter. Line 2 → 2nd word, 2nd letter. And so on."
  ]
}',
'candle', 'CANDLE'),

(2, 'The Hacker''s Receipt', 'Easy-Moderate', '5-6 min',
'{
  "briefing": "Something is wrong with this receipt. The hacker changed EXACTLY ONE price. Find which item was tampered with.",
  "receipt": {
    "shop": "COLLEGE CANTEEN",
    "items": [
      {"name": "Tea", "price": 10},
      {"name": "Samosa", "price": 15},
      {"name": "Coffee", "price": 20},
      {"name": "Sandwich", "price": 25}
    ],
    "total": 70
  },
  "evidence": [
    "Tea is cheaper than Coffee.",
    "Samosa costs Rs.5 more than Tea.",
    "Sandwich costs Rs.5 less than Coffee.",
    "The correct total should be Rs.80."
  ],
  "question": "Which item did the hacker change? Enter the correct price of that item as your answer.",
  "options": ["A) Tea", "B) Samosa", "C) Coffee", "D) Sandwich"],
  "hints": [
    "Start with the two prices the clues confirm right away — Tea and Samosa.",
    "If the total must be Rs.80, what must Coffee + Sandwich add up to?",
    "Sandwich is Rs.5 less than Coffee — now solve for both."
  ]
}',
'30', '30'),

(3, 'Logical Thinking', 'Moderate', '4-6 min',
'{
  "briefing": "Four boxes. The prize is in exactly ONE of them. Exactly ONE label is TRUE — the other three are lies.",
  "boxes": [
    {"label": "A", "text": "The prize is here."},
    {"label": "B", "text": "The prize is not in A."},
    {"label": "C", "text": "The prize is not here."},
    {"label": "D", "text": "The prize is not in C."}
  ],
  "question": "Which box holds the prize? Enter the box letter.",
  "hints": [
    "Assume the prize is in one box, then count how many labels come out true.",
    "You need the box where exactly ONE label survives as true."
  ]
}',
'c', '3'),

(4, 'Caesar Cipher', 'Moderate', '3-4 min',
'{
  "briefing": "The hacker scrambled a word using Caesar cipher. Shift each letter BACK by 3.",
  "encoded": ["K", "D", "F", "N"],
  "hint_text": "A=1, B=2, C=3 ... letters wrap around, A after Z.",
  "question": "Decode the word. Your clue is HOW MANY LETTERS it has. Enter the number.",
  "hints": [
    "Each letter moves 3 steps earlier in the alphabet.",
    "The clue is not the decoded word — it is the number of letters in the decoded word."
  ]
}',
'4', '4'),

(5, 'Fix the Puzzle', 'Moderate+', '5-6 min',
'{
  "briefing": "These 5 code strips are out of order. Arrange them into a WORKING program — the output is your final clue.",
  "strips": [
    "}",
    "total = total * 2;",
    "System.out.println(total);",
    "int total = 1;",
    "for (int i = 1; i <= 3; i++) {"
  ],
  "question": "What does the correctly ordered program print? Enter the number.",
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
