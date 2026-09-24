-- 013_anti_cheat_hardening.sql
-- Add round_name column to existing anti_cheat_violations table if not present
ALTER TABLE anti_cheat_violations
  ADD COLUMN IF NOT EXISTS round_name TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS violation_type TEXT;

-- Index for fast admin queries
CREATE INDEX IF NOT EXISTS idx_violations_team ON anti_cheat_violations(team_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON anti_cheat_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_created ON anti_cheat_violations(created_at DESC);

-- Update get_violation_counts function to support devtools_open type
CREATE OR REPLACE FUNCTION get_violation_counts()
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  total_violations BIGINT,
  fullscreen_exits BIGINT,
  tab_switches BIGINT,
  devtools_detections BIGINT,
  is_flagged BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.team_name,
    COUNT(v.id) as total_violations,
    COUNT(v.id) FILTER (WHERE v.violation_type = 'fullscreen_exit') as fullscreen_exits,
    COUNT(v.id) FILTER (WHERE v.violation_type = 'tab_switch') as tab_switches,
    COUNT(v.id) FILTER (WHERE v.violation_type IN ('devtools_open', 'devtools_detected')) as devtools_detections,
    COUNT(v.id) >= 3 as is_flagged
  FROM teams t
  LEFT JOIN anti_cheat_violations v ON t.id = v.team_id
  GROUP BY t.id, t.team_name
  ORDER BY total_violations DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
