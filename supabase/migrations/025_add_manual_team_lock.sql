-- Migration: 025_add_manual_team_lock.sql
-- Add manual lock flag to teams table for admin lockout control

ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Update validate_team_login RPC to respect manual team lock
CREATE OR REPLACE FUNCTION validate_team_login(
  p_team_name TEXT,
  p_leader_name TEXT,
  p_leader_reg_no TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  team_id UUID
) AS $$
DECLARE
  v_team_id UUID;
  v_is_locked BOOLEAN;
  v_violation_count INT;
BEGIN
  -- Search existing team case-insensitively
  SELECT id, is_locked INTO v_team_id, v_is_locked
  FROM teams
  WHERE LOWER(team_name) = LOWER(p_team_name)
     OR (LOWER(p_team_name) = 'mavericks' AND LOWER(team_name) = 'winden')
  LIMIT 1;

  IF v_team_id IS NOT NULL THEN
    IF v_is_locked THEN
      RETURN QUERY SELECT FALSE, '🚫 ACCESS DENIED: Your team has been locked by the administrator.'::TEXT, v_team_id;
      RETURN;
    END IF;

    SELECT COUNT(*) INTO v_violation_count
    FROM anti_cheat_violations
    WHERE team_id = v_team_id;

    IF v_violation_count > 3 THEN
      RETURN QUERY SELECT FALSE, '🚫 ACCESS DENIED: Your team is locked out due to anti-cheat violations (>3).'::TEXT, v_team_id;
      RETURN;
    END IF;

    UPDATE teams
    SET login_status = TRUE,
        leader_name = p_leader_name,
        leader_reg_no = p_leader_reg_no,
        updated_at = NOW()
    WHERE id = v_team_id;

    RETURN QUERY SELECT TRUE, 'Welcome back!'::TEXT, v_team_id;
    RETURN;
  END IF;

  -- Insert new team if authorized
  INSERT INTO teams (team_name, leader_name, leader_reg_no, login_status)
  VALUES (p_team_name, p_leader_name, p_leader_reg_no, TRUE)
  RETURNING id INTO v_team_id;

  INSERT INTO round2_team_state (team_id, score, coins, status)
  VALUES (v_team_id, 0, 100, 'waiting')
  ON CONFLICT (team_id) DO NOTHING;

  RETURN QUERY SELECT TRUE, 'Welcome!'::TEXT, v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
