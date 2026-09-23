-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 005_fix_rls_public_access.sql
-- Fixes RLS SELECT policies on round1_attempts, round1_answers,
-- round2_team_state, round2_bids, and round2_results to resolve PostgREST
-- stateless connection pooling issues where current_team_id() returns NULL.
-- ============================================================

-- 1. TEAMS
DROP POLICY IF EXISTS "teams_select_public" ON teams;
CREATE POLICY "teams_select_public" ON teams FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "teams_insert_public" ON teams;
CREATE POLICY "teams_insert_public" ON teams FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "teams_update_admin" ON teams;
CREATE POLICY "teams_update_public" ON teams FOR UPDATE USING (TRUE);

-- 2. ROUND 1 ATTEMPTS
DROP POLICY IF EXISTS "round1_attempts_select_own" ON round1_attempts;
CREATE POLICY "round1_attempts_select_all" ON round1_attempts FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "round1_attempts_insert_own" ON round1_attempts;
CREATE POLICY "round1_attempts_insert_all" ON round1_attempts FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round1_attempts_update_own" ON round1_attempts;
CREATE POLICY "round1_attempts_update_all" ON round1_attempts FOR UPDATE USING (TRUE);

-- 3. ROUND 1 ANSWERS
DROP POLICY IF EXISTS "round1_answers_select_own" ON round1_answers;
CREATE POLICY "round1_answers_select_all" ON round1_answers FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "round1_answers_insert_own" ON round1_answers;
CREATE POLICY "round1_answers_insert_all" ON round1_answers FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round1_answers_update_own" ON round1_answers;
CREATE POLICY "round1_answers_update_all" ON round1_answers FOR UPDATE USING (TRUE);

-- 4. ROUND 2 TEAM STATE
DROP POLICY IF EXISTS "round2_team_state_select_own" ON round2_team_state;
CREATE POLICY "round2_team_state_select_all" ON round2_team_state FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "round2_team_state_insert_public" ON round2_team_state;
CREATE POLICY "round2_team_state_insert_all" ON round2_team_state FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round2_team_state_update_admin" ON round2_team_state;
CREATE POLICY "round2_team_state_update_all" ON round2_team_state FOR UPDATE USING (TRUE);

-- 5. ROUND 2 BIDS
DROP POLICY IF EXISTS "round2_bids_select_own" ON round2_bids;
CREATE POLICY "round2_bids_select_all" ON round2_bids FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "round2_bids_insert_own" ON round2_bids;
CREATE POLICY "round2_bids_insert_all" ON round2_bids FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "round2_bids_update_admin" ON round2_bids;
CREATE POLICY "round2_bids_update_all" ON round2_bids FOR UPDATE USING (TRUE);

-- 6. ROUND 2 RESULTS
DROP POLICY IF EXISTS "round2_results_select_own" ON round2_results;
CREATE POLICY "round2_results_select_all" ON round2_results FOR SELECT USING (TRUE);
