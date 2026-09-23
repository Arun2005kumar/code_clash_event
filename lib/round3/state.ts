// lib/round3/state.ts
import { createClient } from '@/lib/supabase/client';
import { Round3TeamState, Round3MissionAttempt } from '@/types';

export async function getOrCreateRound3TeamState(teamId: string): Promise<Round3TeamState | null> {
  const supabase = createClient();
  
  // Try fetching existing
  const { data: existing } = await supabase
    .from('round3_team_state')
    .select('*')
    .eq('team_id', teamId)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'not_started') {
      const now = new Date().toISOString();
      const { data: updated } = await supabase
        .from('round3_team_state')
        .update({ status: 'in_progress', started_at: now })
        .eq('team_id', teamId)
        .select('*')
        .single();
      return (updated as Round3TeamState) ?? existing;
    }
    return existing as Round3TeamState;
  }

  // Insert new if not present
  const now = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from('round3_team_state')
    .insert({
      team_id: teamId,
      status: 'in_progress',
      started_at: now,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error initializing team Round 3 state:', error);
    return null;
  }

  return inserted as Round3TeamState;
}

export async function getTeamRound3Attempts(teamId: string): Promise<Round3MissionAttempt[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('round3_mission_attempts')
    .select('*')
    .eq('team_id', teamId);

  if (error) {
    console.error('Error fetching team Round 3 attempts:', error);
    return [];
  }

  return (data as Round3MissionAttempt[]) ?? [];
}
