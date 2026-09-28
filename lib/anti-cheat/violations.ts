import { createClient } from '@/lib/supabase/client';

interface LogViolationParams {
  teamId: string;
  violationType: string;
  roundName: string;
}

const supabase = createClient();

// Debounce map to prevent duplicate logging within window
const lastViolationTime: Record<string, number> = {};
const DEBOUNCE_MS = 1000;

export async function logViolation({
  teamId,
  violationType,
  roundName,
}: LogViolationParams): Promise<number> {
  if (!teamId) return 0;

  const key = `${teamId}-${violationType}`;
  const now = Date.now();

  // Deduplicate rapid repeat violations
  if (lastViolationTime[key] && now - lastViolationTime[key] < DEBOUNCE_MS) {
    return getTeamViolationCount(teamId);
  }
  lastViolationTime[key] = now;

  try {
    const { error } = await supabase.from('anti_cheat_violations').insert({
      team_id: teamId,
      violation_type: violationType,
      round_name: roundName,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Violation log error:', error.message);
    }
  } catch (err) {
    console.error('Violation log failed silently:', err);
  }

  return getTeamViolationCount(teamId);
}

export async function getTeamViolationCount(teamId: string): Promise<number> {
  if (!teamId) return 0;
  const { count } = await supabase
    .from('anti_cheat_violations')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);

  return count ?? 0;
}

export async function getViolationCount(teamId: string): Promise<number> {
  return getTeamViolationCount(teamId);
}

export async function checkIsTeamDisqualified(teamId: string): Promise<boolean> {
  const count = await getTeamViolationCount(teamId);
  return count > 3;
}

export async function resetTeamViolations(teamId: string): Promise<boolean> {
  if (!teamId) return false;
  try {
    await supabase.from('anti_cheat_violations').delete().eq('team_id', teamId);
    await supabase.from('teams').update({ login_status: true }).eq('id', teamId);
    return true;
  } catch (e) {
    console.error('Error resetting violations for team:', e);
    return false;
  }
}
