'use client';

// app/round3/bonus/page.tsx — Round 3 Bonus Riddle Route
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTeamSession } from '@/lib/auth/session';
import AntiCheatGuard from '@/components/anti-cheat/AntiCheatGuard';
import Header from '@/components/layout/Header';
import BonusRiddle from '@/components/round3/BonusRiddle';
import { TeamSession } from '@/types';

export default function BonusRiddlePage() {
  const router = useRouter();
  const [session, setSession] = useState<TeamSession | null>(null);

  useEffect(() => {
    const s = getTeamSession();
    if (!s) {
      router.replace('/');
      return;
    }
    setSession(s);
  }, [router]);

  if (!session) return null;

  return (
    <AntiCheatGuard teamId={session.teamId} teamName={session.teamName} roundName="Round 3">
      <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
        <Header activePath="/round3" />
        <main className="w-full pt-24 bg-surface min-h-[calc(100vh-80px)] max-w-[1440px] mx-auto px-margin-mobile lg:px-margin pb-space-xl">
          <div className="flex items-center justify-between gap-space-md mb-space-md">
            <Link
              href="/round3/result"
              className="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-card border-2 border-ink-primary rounded-lg text-ink-primary font-headline-sm text-label-ticker shadow-[2px_2px_0px_#0F172A] hover:translate-x-[-2px] transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>BACK TO SUMMARY</span>
            </Link>

            <span className="font-label-sticker text-label-sticker text-currency-gold bg-surface-card px-space-md py-space-xs rounded-full border-2 border-ink-primary font-bold">
              ⚡ BONUS FAST-FINISHER STAGE
            </span>
          </div>

          <BonusRiddle teamId={session.teamId} />
        </main>
      </div>
    </AntiCheatGuard>
  );
}
