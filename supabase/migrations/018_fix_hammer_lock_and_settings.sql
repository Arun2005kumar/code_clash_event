-- 018_fix_hammer_lock_and_settings.sql
-- Fix lock_hammer_for_question RPC to ensure question status is updated to 'locked' properly even for fallback questions

DROP FUNCTION IF EXISTS lock_hammer_for_question(UUID) CASCADE;

CREATE OR REPLACE FUNCTION lock_hammer_for_question(p_question_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE round2_questions
  SET status = 'locked', updated_at = NOW()
  WHERE id = p_question_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    -- If no row updated (e.g. fallback question UUID), upsert row with status = 'locked'
    INSERT INTO round2_questions (id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, status)
    VALUES (
      p_question_id,
      1,
      'Round 2 Question',
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'A',
      'locked'
    )
    ON CONFLICT (id) DO UPDATE SET status = 'locked', updated_at = NOW();
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION lock_hammer_for_question(UUID) TO postgres, anon, authenticated, service_role;
