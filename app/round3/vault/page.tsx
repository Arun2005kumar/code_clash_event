'use client';

// app/round3/vault/page.tsx — Digital Vault Breach Route
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import AntiCheatGuard from '@/components/anti-cheat/AntiCheatGuard';
import Header from '@/components/layout/Header';
import Round3Timer from '@/components/round3/Round3Timer';
import VaultEntry from '@/components/round3/VaultEntry';
import VaultSuccess from '@/components/round3/VaultSuccess';
import { getTeamRound3Attempts, getOrCreateRound3TeamState } from '@/lib/round3/state';
import { Round3MissionAttempt, Round3TeamState, TeamSession } from '@/types';

export default function VaultPage() {
  const router = useRouter();
  const [session, setSession] = useState<TeamSession | null>(null);
  const [attempts, setAttempts] = useState<Round3MissionAttempt[]>([]);
  const [teamState, setTeamState] = useState<Round3TeamState | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

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

    const solvedCount = tAttempts.filter(a => a.is_correct).length;
    if (solvedCount < 5 && !tState?.vault_unlocked) {
      router.replace('/round3');
      return;
    }

    setTeamState(tState);
    setAttempts(tAttempts);
    setUnlocked(tState?.vault_unlocked ?? false);
    setLoading(false);
  }, [router]);

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
          <span>INITIALIZING VAULT TERMINAL...</span>
        </div>
      </div>
    );
  }

  return (
    <AntiCheatGuard teamId={session.teamId} teamName={session.teamName} roundName="Round 3">
      <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
        <Header activePath="/round3" />
        <main className="w-full pt-24 bg-surface min-h-[calc(100vh-80px)] max-w-[1440px] mx-auto px-margin-mobile lg:px-margin pb-space-xl">
          {/* Header Link */}
          <div className="flex items-center justify-between gap-space-md mb-space-md">
            <Link
              href="/round3"
              className="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-card border-2 border-ink-primary rounded-lg text-ink-primary font-headline-sm text-label-ticker shadow-[2px_2px_0px_#0F172A] hover:translate-x-[-2px] transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>BACK TO MISSION HUB</span>
            </Link>

            <div className="flex items-center gap-space-sm">
              <Round3Timer teamId={session.teamId} onExpire={() => setIsExpired(true)} />
              <span className="font-label-sticker text-label-sticker text-round-3-purple bg-surface-card px-space-md py-space-xs rounded-full border-2 border-ink-primary font-bold">
                ⚡ MAINFRAME VAULT CORE
              </span>
            </div>
          </div>

          {unlocked ? (
            <VaultSuccess
              teamName={session.teamName}
              finishTimeSeconds={teamState?.finish_time_seconds}
            />
          ) : (
            <VaultEntry
              teamId={session.teamId}
              attempts={attempts}
              isExpired={isExpired}
              onSuccess={() => {
                setUnlocked(true);
                loadData(session.teamId);
              }}
            />
          )}
        </main>
      </div>
    </AntiCheatGuard>
  );
}
