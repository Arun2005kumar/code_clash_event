// lib/quiz/scoring.ts
// Client-side quiz state helpers (no scoring — that's server-side only)

import { Option } from '@/types';

const QUIZ_STATE_KEY = 'codeclash_quiz_answers';
const ATTEMPT_KEY = 'codeclash_attempt_id';
const START_TIME_KEY = 'codeclash_start_time';

export function saveAnswerLocally(questionId: string, option: Option): void {
  if (typeof window === 'undefined') return;
  const stored = getLocalAnswers();
  stored[questionId] = option;
  sessionStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(stored));
}

export function getLocalAnswers(): Record<string, Option> {
  if (typeof window === 'undefined') return {};
  const stored = sessionStorage.getItem(QUIZ_STATE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function clearLocalAnswers(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(QUIZ_STATE_KEY);
}

export function saveAttemptId(attemptId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ATTEMPT_KEY, attemptId);
}

export function getAttemptId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ATTEMPT_KEY);
}

export function saveStartTime(timestamp: number): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(START_TIME_KEY, timestamp.toString());
}

export function getStartTime(): number | null {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(START_TIME_KEY);
  return stored ? parseInt(stored) : null;
}

export function getElapsedSeconds(): number {
  const start = getStartTime();
  if (!start) return 0;
  return Math.floor((Date.now() - start) / 1000);
}

export function getRemainingSeconds(durationSeconds: number): number {
  const elapsed = getElapsedSeconds();
  return Math.max(0, durationSeconds - elapsed);
}

export const ROUND1_DURATION_SECONDS = 25 * 60; // 25 minutes
