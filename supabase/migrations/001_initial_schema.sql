-- ============================================================
-- CODING CLUB CHALLENGE — Initial Schema
-- Migration: 001_initial_schema.sql
-- Run this first in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: teams
-- Registered competing teams
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_name TEXT NOT NULL UNIQUE,
  leader_name TEXT NOT NULL,
  leader_reg_no TEXT NOT NULL,
  login_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_name, leader_name, leader_reg_no)
);

CREATE INDEX idx_teams_team_name ON teams(team_name);
CREATE INDEX idx_teams_leader_reg_no ON teams(leader_reg_no);

-- ============================================================
-- TABLE: round1_questions
-- MCQ questions for Round 1 (30 questions)
-- ============================================================
CREATE TABLE IF NOT EXISTS round1_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_number INTEGER NOT NULL UNIQUE CHECK (question_number >= 1 AND question_number <= 30),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_round1_questions_number ON round1_questions(question_number);

-- ============================================================
-- TABLE: round1_attempts
-- Each team's Round 1 attempt record
-- ============================================================
CREATE TABLE IF NOT EXISTS round1_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 30,
  correct_answers INTEGER DEFAULT 0,
  time_used_seconds INTEGER,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_submitted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id) -- one attempt per team
);

CREATE INDEX idx_round1_attempts_team_id ON round1_attempts(team_id);
CREATE INDEX idx_round1_attempts_status ON round1_attempts(status);

-- ============================================================
-- TABLE: round1_answers
-- Individual answers per question per attempt
-- ============================================================
CREATE TABLE IF NOT EXISTS round1_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES round1_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES round1_questions(id) ON DELETE CASCADE,
  selected_option CHAR(1) CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id) -- one answer per question per attempt
);

CREATE INDEX idx_round1_answers_attempt_id ON round1_answers(attempt_id);
CREATE INDEX idx_round1_answers_question_id ON round1_answers(question_id);

-- ============================================================
-- TABLE: round2_questions
-- Auction bidding questions (6 questions)
-- ============================================================
CREATE TABLE IF NOT EXISTS round2_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_number INTEGER NOT NULL UNIQUE CHECK (question_number >= 1 AND question_number <= 6),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'bidding_open', 'bidding_closed', 'resolved')),
  resolved_team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_round2_questions_number ON round2_questions(question_number);
CREATE INDEX idx_round2_questions_status ON round2_questions(status);

-- ============================================================
-- TABLE: round2_team_state
-- Tracks each team's current state in Round 2
-- ============================================================
CREATE TABLE IF NOT EXISTS round2_team_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 100 CHECK (coins >= 0),
  current_question INTEGER DEFAULT 1,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_round2_team_state_team_id ON round2_team_state(team_id);

-- ============================================================
-- TABLE: round2_bids
-- Bids placed by teams per question
-- ============================================================
CREATE TABLE IF NOT EXISTS round2_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES round2_questions(id) ON DELETE CASCADE,
  selected_option CHAR(1) NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  bid_amount INTEGER NOT NULL CHECK (bid_amount IN (1, 2, 5)),
  bid_timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'placed' CHECK (status IN ('placed', 'won', 'lost')),
  is_winner BOOLEAN DEFAULT FALSE,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, question_id) -- one bid per team per question
);

CREATE INDEX idx_round2_bids_question_id ON round2_bids(question_id);
CREATE INDEX idx_round2_bids_team_id ON round2_bids(team_id);
CREATE INDEX idx_round2_bids_bid_amount ON round2_bids(bid_amount DESC);
CREATE INDEX idx_round2_bids_timestamp ON round2_bids(bid_timestamp ASC);

-- ============================================================
-- TABLE: round2_results
-- Final resolved results per question per team
-- ============================================================
CREATE TABLE IF NOT EXISTS round2_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES round2_questions(id) ON DELETE CASCADE,
  bid_amount INTEGER NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('won_correct', 'won_incorrect', 'lost', 'not_winner')),
  score_change INTEGER DEFAULT 0,
  coin_change INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, question_id)
);

CREATE INDEX idx_round2_results_team_id ON round2_results(team_id);
CREATE INDEX idx_round2_results_question_id ON round2_results(question_id);

-- ============================================================
-- TABLE: competition_settings
-- Global settings for the competition (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS competition_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_round INTEGER DEFAULT 1,
  round1_active BOOLEAN DEFAULT FALSE,
  round2_active BOOLEAN DEFAULT FALSE,
  round3_active BOOLEAN DEFAULT FALSE,
  current_round2_question INTEGER DEFAULT 1,
  show_round1_explanations BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO competition_settings (current_round, round1_active, round2_active, round3_active)
VALUES (1, FALSE, FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLE: admin_users
-- Admin user registry (linked to Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: anti_cheat_violations
-- Log of all anti-cheat violations per team
-- ============================================================
CREATE TABLE IF NOT EXISTS anti_cheat_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL CHECK (violation_type IN (
    'fullscreen_exit',
    'tab_switch',
    'window_blur',
    'devtools_detected',
    'copy_attempt',
    'paste_attempt',
    'print_attempt',
    'keyboard_shortcut'
  )),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_violations_team_id ON anti_cheat_violations(team_id);
CREATE INDEX idx_violations_type ON anti_cheat_violations(violation_type);
CREATE INDEX idx_violations_created_at ON anti_cheat_violations(created_at DESC);

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_round1_questions_updated_at BEFORE UPDATE ON round1_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_round2_questions_updated_at BEFORE UPDATE ON round2_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_round2_team_state_updated_at BEFORE UPDATE ON round2_team_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_settings_updated_at BEFORE UPDATE ON competition_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
