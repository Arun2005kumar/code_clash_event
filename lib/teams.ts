// lib/teams.ts — Official 21 Registered Teams List and Validation Helper

export const OFFICIAL_TEAMS = [
  'PHOENIX',
  'CODE CREW',
  'SOCIAL GUARDIANS',
  'OPTIMIZE PRIME',
  'THINK & SINK',
  'CODE BLOODED',
  'QUAD MINDS',
  "ALPHA READER'S",
  'CODE BREAKER',
  'LOGIC MAKERS',
  'QUAD SQUAD',
  'CODEPULSE',
  'WINDEN',
  'PROMPT PIRATES',
  'IMMORTAL',
  'KINETIC CODERS',
  'TECH NOVA',
  'ZYRA',
  'TEAM ELITE',
  'TEAM INNOVATORS',
  'NEXT GEN SOLUTIONS',
] as const;

export type OfficialTeamName = typeof OFFICIAL_TEAMS[number];

/**
 * Normalizes input string for robust case-insensitive, whitespace-insensitive matching.
 */
function normalizeTeamName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[\s'`’_\-]/g, '');
}

/**
 * Matches an input team name against the 21 official registered teams.
 * Returns the exact official canonical team name if matched, or null if denied.
 */
export function findOfficialTeam(inputName: string): string | null {
  if (!inputName || typeof inputName !== 'string') return null;
  const normalizedInput = normalizeTeamName(inputName);

  const matched = OFFICIAL_TEAMS.find(
    (official) => normalizeTeamName(official) === normalizedInput
  );

  return matched || null;
}
