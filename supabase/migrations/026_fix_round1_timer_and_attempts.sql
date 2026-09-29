-- CODING CLUB CHALLENGE — Migration: 026_fix_round1_timer_and_attempts.sql
-- Fixes Round 1 timer auto-submit bug where teams with 0 answers or stale started_at timestamps
-- were immediately redirected to /round1/result upon opening Round 1.

CREATE OR REPLACE FUNCTION start_round1_attempt(p_team_id UUID)
RETURNS TABLE(attempt_id UUID, already_submitted BOOLEAN, started_at TIMESTAMPTZ) AS $$
DECLARE
  v_attempt round1_attempts%ROWTYPE;
  v_settings competition_settings%ROWTYPE;
  v_answer_count INTEGER := 0;
BEGIN
  -- Check if round 1 is active
  SELECT * INTO v_settings FROM competition_settings LIMIT 1;
  IF NOT v_settings.round1_active THEN
    RAISE EXCEPTION 'Round 1 is not currently active.';
  END IF;

  -- Check for existing attempt
  SELECT * INTO v_attempt FROM round1_attempts WHERE team_id = p_team_id ORDER BY started_at DESC LIMIT 1;

  IF FOUND THEN
    -- Count how many answers this team actually saved in round1_answers
    SELECT COUNT(*) INTO v_answer_count FROM round1_answers WHERE attempt_id = v_attempt.id;

    -- If attempt was marked submitted or auto_submitted:
    IF v_attempt.status IN ('submitted', 'auto_submitted') THEN
      -- If team manually submitted OR auto_submitted with actual answers (>0), keep as submitted
      IF v_attempt.status = 'submitted' OR v_answer_count > 0 THEN
        RETURN QUERY SELECT v_attempt.id, TRUE, v_attempt.started_at;
        RETURN;
      ELSE
        -- Auto-submitted with 0 answers (caused by stale timer auto-submit bug).
        -- Reset attempt to clean in_progress state with started_at = NOW()
        UPDATE round1_attempts 
        SET started_at = NOW(),
            status = 'in_progress',
            score = 0,
            correct_answers = 0,
            submitted_at = NULL,
            time_used_seconds = 0
        WHERE id = v_attempt.id
        RETURNING * INTO v_attempt;

        RETURN QUERY SELECT v_attempt.id, FALSE, v_attempt.started_at;
        RETURN;
      END IF;
    END IF;

    -- If attempt is in_progress:
    IF v_attempt.status = 'in_progress' THEN
      -- Check if started_at is expired (>25 minutes = 1500 seconds ago)
      IF (EXTRACT(EPOCH FROM (NOW() - v_attempt.started_at)) > 1500) THEN
        IF v_answer_count = 0 THEN
          -- Stale in-progress attempt with 0 answers: reset started_at to NOW() so team gets fresh 25:00
          UPDATE round1_attempts 
          SET started_at = NOW() 
          WHERE id = v_attempt.id
          RETURNING * INTO v_attempt;

          RETURN QUERY SELECT v_attempt.id, FALSE, v_attempt.started_at;
          RETURN;
        ELSE
          -- Expired attempt with answers: submit now
          PERFORM submit_round1(v_attempt.id, 'auto_submitted');
          
          SELECT * INTO v_attempt FROM round1_attempts WHERE id = v_attempt.id;
          RETURN QUERY SELECT v_attempt.id, TRUE, v_attempt.started_at;
          RETURN;
        END IF;
      END IF;

      -- Valid in-progress attempt within 25 minutes
      RETURN QUERY SELECT v_attempt.id, FALSE, v_attempt.started_at;
      RETURN;
    END IF;
  END IF;

  -- Create new attempt
  INSERT INTO round1_attempts (team_id, started_at, status)
  VALUES (p_team_id, NOW(), 'in_progress')
  RETURNING * INTO v_attempt;

  RETURN QUERY SELECT v_attempt.id, FALSE, v_attempt.started_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION start_round1_attempt(UUID) TO postgres, anon, authenticated, service_role;
