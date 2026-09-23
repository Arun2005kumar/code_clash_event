// lib/round3/hints.ts
import { createClient } from '@/lib/supabase/client';

export async function incrementHintCountServer(
  teamId: string,
  missionNumber: number
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('increment_hint_count', {
    p_team_id: teamId,
    p_mission_number: missionNumber,
  });

  if (error) {
    console.error('Error calling increment_hint_count RPC:', error);
    return false;
  }

  return data?.success ?? false;
}
