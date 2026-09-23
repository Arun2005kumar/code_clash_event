// lib/auth/session.ts
// Team session management using localStorage + sessionStorage
// Teams are not Supabase Auth users — they use custom login via RPC

import { TeamSession } from '@/types';

const SESSION_KEY = 'codeclash_team_session';

export function setTeamSession(session: TeamSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('team-session-change'));
}

export function getTeamSession(): TeamSession | null {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as TeamSession;
  } catch {
    return null;
  }
}

export function clearTeamSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('team-session-change'));
}

export function isTeamLoggedIn(): boolean {
  return getTeamSession() !== null;
}
