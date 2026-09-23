// lib/anti-cheat/violations.ts
// Violation logging helpers for anti-cheat system

import { createClient } from '@/lib/supabase/client';
import { ViolationType } from '@/types';

export async function logViolation(
  teamId: string,
  violationType: ViolationType,
  details?: string
): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.rpc('log_violation', {
      p_team_id: teamId,
      p_violation_type: violationType,
      p_details: details ?? null,
    });
  } catch (error) {
    // Silently fail — don't crash the exam over logging errors
    console.error('[AntiCheat] Failed to log violation:', error);
  }
}

export async function getViolationCount(teamId: string): Promise<number> {
  try {
    const supabase = createClient();
    const { count } = await supabase
      .from('anti_cheat_violations')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);
    return count ?? 0;
  } catch {
    return 0;
  }
}
