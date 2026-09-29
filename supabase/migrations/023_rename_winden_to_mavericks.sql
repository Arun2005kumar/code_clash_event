-- Migration 023: Rename WINDEN to MAVERICKS in teams table
UPDATE teams
SET team_name = 'MAVERICKS'
WHERE LOWER(TRIM(team_name)) = 'winden';
