// lib/round3/missions.ts
import { createClient } from '@/lib/supabase/client';
import { Round3Mission } from '@/types';

const FALLBACK_MISSIONS: Record<number, Round3Mission> = {
  1: {
    id: '00000003-0000-0000-0000-000000000001',
    mission_number: 1,
    title: 'The Hidden Object',
    difficulty: 'Easy',
    time_estimate: '4-5 min',
    handout_content: {
      briefing: 'The marker hid 4 letters in plain sight. Study the lines carefully - the answer is in how they are numbered.',
      lines: [
        '1. Carefully observe every detail.',
        '2. The marker is hidden here.',
        '3. Look around sun once.',
        '4. Smart teams can find it.',
      ],
      hints: [
        'Focus on index numbers of each line.',
        'Take Nth letter from line N: 1st from line 1, 2nd from line 2...',
      ],
    },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  2: {
    id: '00000003-0000-0000-0000-000000000002',
    mission_number: 2,
    title: 'THE RETURN TRAP',
    difficulty: 'Moderate',
    time_estimate: '3-4 min',
    handout_content: {
      briefing: 'A piece of code has been intercepted from the system. The code contains a trap involving return and finally. Your task is to determine exactly what the program returns.',
      hints: [
        'Ask yourself: when does Java evaluate the value that is being returned?',
        'The finally block executes before the method actually exits. Check whether changing the variable changes an already-evaluated return value.',
      ],
    },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  3: {
    id: '00000003-0000-0000-0000-000000000003',
    mission_number: 3,
    title: 'Logic Grid Matrix',
    difficulty: 'Hard',
    time_estimate: '5-6 min',
    handout_content: {
      briefing: 'Four servers (A, B, C, D) have different ports (80, 443, 8080, 9000). Deduce which server uses port 443.',
      hints: [
        'Server A is not HTTP (80).',
        'Server C port is double 4040.',
      ],
    },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  4: {
    id: '00000003-0000-0000-0000-000000000004',
    mission_number: 4,
    title: 'Caesar Vault Shift',
    difficulty: 'Hard',
    time_estimate: '5-6 min',
    handout_content: {
      briefing: 'Intercepted cipher: KHVWH. Shift key is 3.',
      hints: ['Shift each character backward by 3 positions.'],
    },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  5: {
    id: '00000003-0000-0000-0000-000000000005',
    mission_number: 5,
    title: 'Final Master Key',
    difficulty: 'Expert',
    time_estimate: '6-8 min',
    handout_content: {
      briefing: 'Combine clue pieces 1 to 4 to form the master key.',
      hints: ['Concatenate the clue letters in mission order.'],
    },
    is_active: true,
    created_at: new Date().toISOString(),
  },
};

export async function getActiveRound3Missions(): Promise<Round3Mission[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('round3_missions')
    .select('id, mission_number, title, difficulty, time_estimate, handout_content, is_active, created_at')
    .eq('is_active', true)
    .order('mission_number', { ascending: true });

  if (error || !data || data.length === 0) {
    return Object.values(FALLBACK_MISSIONS);
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

  if (error || !data) {
    return FALLBACK_MISSIONS[missionNumber] ?? null;
  }
  return data as Round3Mission;
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
