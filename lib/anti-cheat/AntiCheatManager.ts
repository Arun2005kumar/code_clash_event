// lib/anti-cheat/AntiCheatManager.ts — Centralized Anti-Cheat State Machine & Deduplication Service

import { createClient } from '@/lib/supabase/client';
import { clearTeamSession } from '@/lib/auth/session';

export type AntiCheatState =
  | 'IDLE'
  | 'START_REQUESTED'
  | 'FULLSCREEN_REQUESTED'
  | 'FULLSCREEN_CONFIRMED'
  | 'ACTIVE'
  | 'VIOLATION_DETECTED'
  | 'WARNING'
  | 'TERMINATED'
  | 'COMPLETED';

export type ViolationType =
  | 'fullscreen_exit'
  | 'tab_switch'
  | 'window_blur'
  | 'devtools_open'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'cut_attempt'
  | 'right_click'
  | 'keyboard_shortcut'
  | 'print_attempt'
  | 'select_attempt'
  | 'drag_attempt'
  | 'context_menu';

export interface ViolationEvent {
  id: string;
  teamId: string;
  roundName: string;
  violationType: ViolationType;
  timestamp: number;
}

const DEDUPE_WINDOW_MS = 1000; // Deduplicate signals within 1 second into 1 violation incident

class AntiCheatManager {
  private state: AntiCheatState = 'IDLE';
  private lastIncidentTimestamp: number = 0;
  private lastViolationType: ViolationType | null = null;
  private violationCount: number = 0;
  private teamId: string = '';
  private teamName: string = '';
  private roundName: string = '';

  public getState(): AntiCheatState {
    return this.state;
  }

  public setState(newState: AntiCheatState): void {
    this.state = newState;
  }

  public initSession(teamId: string, teamName: string, roundName: string) {
    this.teamId = teamId;
    this.teamName = teamName;
    this.roundName = roundName;
    this.state = 'IDLE';
  }

  // Deduplicate rapid repeat events (e.g. visibilitychange + blur + fullscreenchange firing simultaneously)
  public shouldLogViolation(type: ViolationType): boolean {
    const now = Date.now();
    const isRapidRepeat =
      now - this.lastIncidentTimestamp < DEDUPE_WINDOW_MS &&
      (this.lastViolationType === type ||
        (type === 'window_blur' && this.lastViolationType === 'tab_switch') ||
        (type === 'tab_switch' && this.lastViolationType === 'window_blur'));

    if (isRapidRepeat) {
      return false;
    }

    this.lastIncidentTimestamp = now;
    this.lastViolationType = type;
    return true;
  }

  public async recordViolation(type: ViolationType, onTerminated?: () => void): Promise<number> {
    if (!this.teamId) return this.violationCount;
    if (!this.shouldLogViolation(type)) return this.violationCount;

    try {
      const supabase = createClient();
      await supabase.from('anti_cheat_violations').insert({
        team_id: this.teamId,
        violation_type: type,
        round_name: this.roundName,
        created_at: new Date().toISOString(),
      });

      // Get exact count from DB
      const { count } = await supabase
        .from('anti_cheat_violations')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', this.teamId);

      this.violationCount = count ?? (this.violationCount + 1);

      // If violations exceed 3 (> 3 violations, i.e. 4 or more), enforce immediate team termination
      if (this.violationCount > 3) {
        this.state = 'TERMINATED';
        clearTeamSession();
        if (onTerminated) onTerminated();
      } else {
        this.state = 'VIOLATION_DETECTED';
      }
    } catch (err) {
      console.error('AntiCheatManager recordViolation error:', err);
    }

    return this.violationCount;
  }
}

export const antiCheatManager = new AntiCheatManager();
