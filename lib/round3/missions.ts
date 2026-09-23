// lib/round3/missions.ts
import { createClient } from '@/lib/supabase/client';
import { Round3Mission } from '@/types';

export async function getActiveRound3Missions(): Promise<Round3Mission[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('round3_missions')
    .select('id, mission_number, title, difficulty, time_estimate, handout_content, is_active, created_at')
    .eq('is_active', true)
    .order('mission_number', { ascending: true });

  if (error) {
    console.error('Error fetching round3 missions:', error);
    return [];
  }
  return (data as Round3Mission[]) ?? [];
}

export async function getRound3MissionByNumber(missionNumber: number): Promise<Round3Mission | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('round3_missions')
    .select('id, mission_number, title, difficulty, time_estimate, handout_content, is_active, created_at')
    .eq('mission_number', missionNumber)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching round3 mission ${missionNumber}:`, error);
    return null;
  }
  return data as Round3Mission | null;
}

export async function validateMissionAnswerServer(
  teamId: string,
  missionNumber: number,
  submittedAnswer: string
): Promise<{ is_correct: boolean; clue_piece?: string; already_completed?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('validate_mission_answer', {
    p_team_id: teamId,
    p_mission_number: missionNumber,
    p_submitted_answer: submittedAnswer,
  });

  if (error) {
    console.error('Error calling validate_mission_answer RPC:', error);
    return { is_correct: false };
  }

  return data ?? { is_correct: false };
}
