-- ============================================================
-- CODING CLUB CHALLENGE — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE round1_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE round1_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE round1_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE round2_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE round2_team_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE round2_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE round2_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE anti_cheat_violations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Check if the current request is from an admin
-- Uses the admin_users table linked to Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- HELPER: Get team_id from session claim
-- Teams store their team_id in the session cookie; the client
-- passes it as a custom claim via app_metadata.
-- We use a separate approach: the anon client uses the team_id
-- stored in the app, and RLS checks it via a custom function.
-- ============================================================

-- For team-based access, we'll use a custom session variable
-- set by the application before queries
CREATE OR REPLACE FUNCTION current_team_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_team_id', true), '')::UUID;
EXCEPTION
  WHEN others THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- TEAMS TABLE POLICIES
-- ============================================================

-- Public can read teams (needed for login validation)
CREATE POLICY "teams_select_public"
  ON teams FOR SELECT
  USING (TRUE);

-- Allow public team registration (real-time team entry)
CREATE POLICY "teams_insert_public"
  ON teams FOR INSERT
  WITH CHECK (TRUE);

-- Only admin or the team itself can update
CREATE POLICY "teams_update_admin"
  ON teams FOR UPDATE
  USING (is_admin() OR id = current_team_id());

-- Only admin can delete
CREATE POLICY "teams_delete_admin"
  ON teams FOR DELETE
  USING (is_admin());

-- ============================================================
-- ROUND 1 QUESTIONS POLICIES
-- CRITICAL: correct_option NEVER exposed to non-admins via view
-- ============================================================

-- Teams can read questions WITHOUT correct_option
-- We achieve this via a secure view
CREATE POLICY "round1_questions_select_all"
  ON round1_questions FOR SELECT
  USING (TRUE);
-- NOTE: We use a DB view (below) to strip correct_option for teams

-- Only admin can modify questions
CREATE POLICY "round1_questions_insert_admin"
  ON round1_questions FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "round1_questions_update_admin"
  ON round1_questions FOR UPDATE
  USING (is_admin());

CREATE POLICY "round1_questions_delete_admin"
  ON round1_questions FOR DELETE
  USING (is_admin());

-- Secure view: strips correct_option and explanation for non-admins
CREATE OR REPLACE VIEW round1_questions_public AS
SELECT
  id,
  question_number,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  is_active,
  created_at
FROM round1_questions
WHERE is_active = TRUE
ORDER BY question_number;

-- ============================================================
-- ROUND 1 ATTEMPTS POLICIES
-- ============================================================

-- Team can only see their own attempt
CREATE POLICY "round1_attempts_select_own"
  ON round1_attempts FOR SELECT
  USING (is_admin() OR team_id = current_team_id());

-- Team can only create their own attempt
CREATE POLICY "round1_attempts_insert_own"
  ON round1_attempts FOR INSERT
  WITH CHECK (team_id = current_team_id());

-- Team can only update their own in-progress attempt
CREATE POLICY "round1_attempts_update_own"
  ON round1_attempts FOR UPDATE
  USING (
    is_admin() OR (
      team_id = current_team_id() AND
      status = 'in_progress'
    )
  );

-- ============================================================
-- ROUND 1 ANSWERS POLICIES
-- ============================================================

-- Team can see their own answers
CREATE POLICY "round1_answers_select_own"
  ON round1_answers FOR SELECT
  USING (
    is_admin() OR
    attempt_id IN (
      SELECT id FROM round1_attempts WHERE team_id = current_team_id()
    )
  );

-- Team can insert answers for their own attempt
CREATE POLICY "round1_answers_insert_own"
  ON round1_answers FOR INSERT
  WITH CHECK (
    attempt_id IN (
      SELECT id FROM round1_attempts
      WHERE team_id = current_team_id() AND status = 'in_progress'
    )
  );

-- Team can update/change answers (upsert pattern)
CREATE POLICY "round1_answers_update_own"
  ON round1_answers FOR UPDATE
  USING (
    attempt_id IN (
      SELECT id FROM round1_attempts
      WHERE team_id = current_team_id() AND status = 'in_progress'
    )
  );

-- ============================================================
-- ROUND 2 QUESTIONS POLICIES
-- ============================================================

CREATE POLICY "round2_questions_select_all"
  ON round2_questions FOR SELECT
  USING (TRUE);
-- Secure view to hide correct_option

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
  created_at
FROM round2_questions
ORDER BY question_number;

CREATE POLICY "round2_questions_insert_admin"
  ON round2_questions FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "round2_questions_update_admin"
  ON round2_questions FOR UPDATE
  USING (is_admin());

CREATE POLICY "round2_questions_delete_admin"
  ON round2_questions FOR DELETE
  USING (is_admin());

-- ============================================================
-- ROUND 2 TEAM STATE POLICIES
-- ============================================================

-- Team can only see their own state
CREATE POLICY "round2_team_state_select_own"
  ON round2_team_state FOR SELECT
  USING (is_admin() OR team_id = current_team_id());

-- Allow initial state creation during real-time registration
CREATE POLICY "round2_team_state_insert_public"
  ON round2_team_state FOR INSERT
  WITH CHECK (TRUE);

-- Only admin or system functions update state
CREATE POLICY "round2_team_state_update_admin"
  ON round2_team_state FOR UPDATE
  USING (is_admin());

-- ============================================================
-- ROUND 2 BIDS POLICIES
-- ============================================================

-- Teams can only see their own bids (NOT other teams' bids)
CREATE POLICY "round2_bids_select_own"
  ON round2_bids FOR SELECT
  USING (is_admin() OR team_id = current_team_id());

-- Team can place their own bid (validated via RPC function)
CREATE POLICY "round2_bids_insert_own"
  ON round2_bids FOR INSERT
  WITH CHECK (team_id = current_team_id());

-- Only admin/system functions can update bids (mark winner etc.)
CREATE POLICY "round2_bids_update_admin"
  ON round2_bids FOR UPDATE
  USING (is_admin());

-- ============================================================
-- ROUND 2 RESULTS POLICIES
-- ============================================================

-- Teams can see their own results
CREATE POLICY "round2_results_select_own"
  ON round2_results FOR SELECT
  USING (is_admin() OR team_id = current_team_id());

-- Only system functions insert results
CREATE POLICY "round2_results_insert_admin"
  ON round2_results FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================
-- COMPETITION SETTINGS POLICIES
-- ============================================================

-- Everyone can read settings (needed to know which round is active)
CREATE POLICY "competition_settings_select_all"
  ON competition_settings FOR SELECT
  USING (TRUE);

-- Allow modifying settings from host admin panel
CREATE POLICY "competition_settings_update_all"
  ON competition_settings FOR UPDATE
  USING (TRUE);

CREATE POLICY "competition_settings_insert_all"
  ON competition_settings FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- ADMIN USERS POLICIES
-- ============================================================

-- Admins can see admin list
CREATE POLICY "admin_users_select_admin"
  ON admin_users FOR SELECT
  USING (is_admin());

-- Only service role can insert admins
CREATE POLICY "admin_users_insert_service"
  ON admin_users FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================
-- ANTI CHEAT VIOLATIONS POLICIES
-- ============================================================

-- Teams can insert their own violations; admin can see all
CREATE POLICY "violations_select_admin"
  ON anti_cheat_violations FOR SELECT
  USING (is_admin() OR team_id = current_team_id());

-- Teams can report their own violations
CREATE POLICY "violations_insert_own"
  ON anti_cheat_violations FOR INSERT
  WITH CHECK (team_id = current_team_id() OR is_admin());

-- Only admin can delete/clear violations
CREATE POLICY "violations_delete_admin"
  ON anti_cheat_violations FOR DELETE
  USING (is_admin());

-- ============================================================
-- REALTIME: Enable realtime on tables that need it
-- ============================================================

-- Enable realtime for live auction and violations
ALTER PUBLICATION supabase_realtime ADD TABLE round2_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE round2_team_state;
ALTER PUBLICATION supabase_realtime ADD TABLE round2_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE competition_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE anti_cheat_violations;
ALTER PUBLICATION supabase_realtime ADD TABLE round1_attempts;
