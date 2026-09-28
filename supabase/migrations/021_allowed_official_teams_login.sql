-- 021_allowed_official_teams_login.sql
-- Update validate_team_login RPC function to allow login/update for official team names even if leader name/reg number is updated

DROP FUNCTION IF EXISTS validate_team_login(TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION validate_team_login(
  p_team_name TEXT,
  p_leader_name TEXT,
  p_leader_reg_no TEXT
)
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  leader_name TEXT,
  leader_reg_no TEXT,
  login_status BOOLEAN,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_team teams%ROWTYPE;
BEGIN
  -- 1. Search for existing team by name (case insensitive)
  SELECT * INTO v_team
  FROM teams
  WHERE LOWER(TRIM(teams.team_name)) = LOWER(TRIM(p_team_name));

  IF FOUND THEN
    -- Update leader details & login_status
    UPDATE teams SET
      leader_name = TRIM(p_leader_name),
      leader_reg_no = UPPER(TRIM(p_leader_reg_no)),
      login_status = TRUE,
      updated_at = NOW()
    WHERE id = v_team.id;

    -- Ensure Round 2 state exists (100 coins default)
    INSERT INTO round2_team_state (team_id, score, coins, current_question, status)
    VALUES (v_team.id, 0, 100, 1, 'waiting')
    ON CONFLICT (team_id) DO NOTHING;

    RETURN QUERY SELECT
      v_team.id,
      v_team.team_name,
      TRIM(p_leader_name),
      UPPER(TRIM(p_leader_reg_no)),
      TRUE,
      TRUE,
      'Welcome back! Login successful.'::TEXT;
    RETURN;
  END IF;

  -- 2. Insert new team dynamically for authorized team name
  INSERT INTO teams (team_name, leader_name, leader_reg_no, login_status)
  VALUES (TRIM(p_team_name), TRIM(p_leader_name), UPPER(TRIM(p_leader_reg_no)), TRUE)
  RETURNING * INTO v_team;

  -- Create initial Round 2 team state (100 starting coins, 0 score)
  INSERT INTO round2_team_state (team_id, score, coins, current_question, status)
  VALUES (v_team.id, 0, 100, 1, 'waiting')
  ON CONFLICT (team_id) DO NOTHING;

  RETURN QUERY SELECT
    v_team.id,
    v_team.team_name,
    v_team.leader_name,
    v_team.leader_reg_no,
    TRUE,
    TRUE,
    'Welcome! Team registered successfully.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_team_login(TEXT, TEXT, TEXT) TO postgres, anon, authenticated, service_role;
