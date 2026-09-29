-- ============================================================
-- CODING CLUB CHALLENGE — Migration: 024_team_presence_heartbeat.sql
-- Add last_seen_at timestamp to teams table for real-time presence/online status tracking
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE teams ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- RPC Function: heartbeat ping for active participant session
CREATE OR REPLACE FUNCTION heartbeat_team_ping(p_team_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE teams 
  SET 
    last_seen_at = NOW(),
    login_status = TRUE
  WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION heartbeat_team_ping(UUID) TO postgres, anon, authenticated, service_role;

-- RPC Function: explicit disconnect / logout ping
CREATE OR REPLACE FUNCTION team_logout_ping(p_team_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE teams 
  SET 
    login_status = FALSE,
    last_seen_at = NOW() - INTERVAL '1 minute'
  WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION team_logout_ping(UUID) TO postgres, anon, authenticated, service_role;
