'use client';

// app/round3/result/page.tsx — Round 3 Final Team Results Summary
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import AntiCheatGuard from '@/components/anti-cheat/AntiCheatGuard';
import Header from '@/components/layout/Header';
import { getTeamRound3Attempts, getOrCreateRound3TeamState } from '@/lib/round3/state';
import { Round3MissionAttempt, Round3TeamState, TeamSession } from '@/types';

export default function Round3ResultPage() {
  const router = useRouter();
  const [session, setSession] = useState<TeamSession | null>(null);
  const [attempts, setAttempts] = useState<Round3MissionAttempt[]>([]);
  const [teamState, setTeamState] = useState<Round3TeamState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getTeamSession();
    if (!s) {
      router.replace('/');
      return;
    }
    setSession(s);
  }, [router]);

  const loadData = useCallback(async (teamId: string) => {
    const tState = await getOrCreateRound3TeamState(teamId);
    const tAttempts = await getTeamRound3Attempts(teamId);
    setTeamState(tState);
    setAttempts(tAttempts);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) return;
    loadData(session.teamId);
  }, [session, loadData]);

  if (!session) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-headline-sm text-headline-sm text-ink-primary font-bold">
        <div className="flex items-center gap-space-sm bg-surface-card p-space-lg rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A]">
          <span className="material-symbols-outlined text-[24px] text-round-3-purple animate-spin">refresh</span>
          <span>LOADING ROUND 3 RESULTS...</span>
        </div>
      </div>
    );
  }

  const solvedAttempts = attempts.filter(a => a.is_correct);
  const finishTimeSec = teamState?.finish_time_seconds ?? 0;
  const mins = String(Math.floor(finishTimeSec / 60)).padStart(2, '0');
  const secs = String(finishTimeSec % 60).padStart(2, '0');

  return (
    <AntiCheatGuard teamId={session.teamId}>
      <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
        <Header activePath="/round3" />
        <main className="w-full pt-24 bg-surface min-h-[calc(100vh-80px)] max-w-[1440px] mx-auto px-margin-mobile lg:px-margin pb-space-xl">
          <div className="max-w-3xl mx-auto flex flex-col gap-space-lg">
            {/* Victory Header */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-[4px_4px_0px_#0F172A] border-2 border-ink-primary flex flex-col items-center text-center gap-space-sm relative overflow-hidden">
              <span className="px-space-md py-space-xs bg-round-3-purple text-on-tertiary rounded-full font-label-sticker text-label-sticker font-bold uppercase border border-ink-primary">
                ROUND 03 COMPLETE
              </span>
              <h1 className="font-headline-lg text-display-xl font-black text-ink-primary tracking-tight uppercase">
                {session.teamName}
              </h1>
              <p className="font-body-lg text-body-lg text-ink-secondary font-medium">
                Official Operation Tech Heist Performance Record
              </p>

              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-space-sm mt-space-md">
                <div className="p-space-sm bg-canvas-cream rounded-xl border-2 border-ink-primary text-center">
                  <span className="font-label-sticker text-[10px] text-ink-secondary uppercase block font-bold">
                    MISSIONS CLEAR
                  </span>
                  <span className="font-headline-lg text-headline-lg text-ink-primary font-black">
                    {solvedAttempts.length} / 5
                  </span>
                </div>
                <div className="p-space-sm bg-canvas-cream rounded-xl border-2 border-ink-primary text-center">
                  <span className="font-label-sticker text-[10px] text-ink-secondary uppercase block font-bold">
                    FINISH RUNTIME
                  </span>
                  <span className="font-headline-lg text-headline-lg text-round-3-purple font-black">
                    ⏱ {mins}:{secs}
                  </span>
                </div>
                <div className="p-space-sm bg-canvas-cream rounded-xl border-2 border-ink-primary text-center">
                  <span className="font-label-sticker text-[10px] text-ink-secondary uppercase block font-bold">
                    VAULT STATUS
                  </span>
                  <span className={`font-headline-sm text-headline-sm font-black ${teamState?.vault_unlocked ? 'text-status-correct' : 'text-status-wrong'}`}>
                    {teamState?.vault_unlocked ? 'CRACKED ✓' : 'LOCKED 🔒'}
                  </span>
                </div>
              </div>
            </div>

            {/* Clues Discovered Breakdown */}
            <div className="bg-surface-card rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-sm">
              <span className="font-headline-sm text-headline-sm font-black text-ink-primary uppercase">
                DISCOVERED CLUE ARTIFACTS
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-xs">
                {[1, 2, 3, 4, 5].map(mNum => {
                  const att = attempts.find(a => a.mission_number === mNum && a.is_correct);
                  return (
                    <div key={mNum} className="p-space-xs bg-surface-muted rounded-lg border border-ink-primary text-center">
                      <span className="font-label-sticker text-[9px] text-ink-secondary block font-bold">M0{mNum}</span>
                      <span className="font-label-code text-body-md text-round-3-purple font-bold">
                        {att?.clue_piece_revealed ?? '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-space-md">
              <Link
                href="/round3/bonus"
                className="flex-1 py-space-sm px-space-md bg-currency-gold text-ink-primary rounded-xl font-headline-sm text-headline-sm font-black text-center shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary hover:bg-currency-gold/90 transition-all"
              >
                ATTEMPT BONUS RIDDLE ⚡
              </Link>
              <Link
                href="/"
                className="flex-1 py-space-sm px-space-md bg-canvas-cream text-ink-primary rounded-xl font-headline-sm text-headline-sm font-black text-center shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary hover:bg-surface-container transition-all"
              >
                RETURN TO MAIN ARENA
              </Link>
            </div>
          </div>
        </main>
      </div>
    </AntiCheatGuard>
  );
}
