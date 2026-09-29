-- CODING CLUB CHALLENGE — Migration: 027_add_event_ended_toggle.sql
-- Adds event_ended boolean flag to competition_settings table for global "Thanks for Attending" state.

ALTER TABLE competition_settings 
  ADD COLUMN IF NOT EXISTS event_ended BOOLEAN DEFAULT FALSE;

-- Ensure RLS allows public select on competition_settings
DROP POLICY IF EXISTS "public_read_competition_settings" ON competition_settings;
CREATE POLICY "public_read_competition_settings" ON competition_settings
  FOR SELECT USING (TRUE);
