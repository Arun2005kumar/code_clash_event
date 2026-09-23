'use client';

// app/round3/mission/[number]/page.tsx — Individual Mission Page
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import AntiCheatGuard from '@/components/anti-cheat/AntiCheatGuard';
import Header from '@/components/layout/Header';
import Mission1HiddenObject from '@/components/round3/missions/Mission1HiddenObject';
import Mission2HackerReceipt from '@/components/round3/missions/Mission2HackerReceipt';
import Mission3LogicBoxes from '@/components/round3/missions/Mission3LogicBoxes';
import Mission4CaesarCipher from '@/components/round3/missions/Mission4CaesarCipher';
import Mission5CodePuzzle from '@/components/round3/missions/Mission5CodePuzzle';
import { getRound3MissionByNumber } from '@/lib/round3/missions';
import { getTeamRound3Attempts } from '@/lib/round3/state';
import { Round3Mission, Round3MissionAttempt, TeamSession } from '@/types';
import { toast } from 'sonner';

export default function DynamicMissionPage() {
  const params = useParams();
  const router = useRouter();
  const missionNumber = Number(params?.number);

  const [session, setSession] = useState<TeamSession | null>(null);
  const [round3Active, setRound3Active] = useState(false);
  const [mission, setMission] = useState<Round3Mission | null>(null);
  const [attempt, setAttempt] = useState<Round3MissionAttempt | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getTeamSession();
    if (!s) {
      router.replace('/');
      return;
    }
    setSession(s);
  }, [router]);

  const loadData = useCallback(async (teamId: string, mNum: number) => {
    const supabase = createClient();

    // Check settings
    const { data: settings } = await supabase
      .from('competition_settings')
      .select('round3_active')
      .limit(1)
      .maybeSingle();

    if (!settings?.round3_active) {
      setRound3Active(false);
      setLoading(false);
      return;
    }
    setRound3Active(true);

    // Fetch mission
    const mData = await getRound3MissionByNumber(mNum);
    setMission(mData);

    // Fetch attempt
    const attempts = await getTeamRound3Attempts(teamId);
    const myAttempt = attempts.find(a => a.mission_number === mNum);
    setAttempt(myAttempt);

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session || isNaN(missionNumber)) return;
    loadData(session.teamId, missionNumber);
  }, [session, missionNumber, loadData]);

  const handleSuccess = (clue: string) => {
    if (session && !isNaN(missionNumber)) {
      loadData(session.teamId, missionNumber);
    }
  };

  if (!session || isNaN(missionNumber)) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-headline-sm text-headline-sm text-ink-primary font-bold">
        <div className="flex items-center gap-space-sm bg-surface-card p-space-lg rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A]">
          <span className="material-symbols-outlined text-[24px] text-round-3-purple animate-spin">refresh</span>
          <span>LOADING MISSION 0{missionNumber}...</span>
        </div>
      </div>
    );
  }

  if (!round3Active || !mission) {
    return (
      <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
        <Header activePath="/round3" />
        <main className="w-full pt-28 bg-surface min-h-[calc(100vh-80px)] max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <div className="max-w-xl mx-auto p-space-lg bg-surface-card rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] text-center flex flex-col items-center gap-space-md my-space-xl">
            <span className="text-[48px]">🔒</span>
            <h1 className="font-headline-lg text-headline-lg font-black text-ink-primary uppercase">
              MISSION UNAVAILABLE
            </h1>
            <p className="font-body-md text-body-md text-ink-secondary">
              This mission is currently locked or Round 3 is inactive.
            </p>
            <Link
              href="/round3"
              className="px-space-md py-space-xs bg-round-3-purple text-on-tertiary rounded-lg font-headline-sm text-label-ticker border border-ink-primary shadow-[2px_2px_0px_#0F172A]"
            >
              RETURN TO MISSION HUB →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <AntiCheatGuard teamId={session.teamId}>
      <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
        <Header activePath="/round3" />
        <main className="w-full pt-24 bg-surface min-h-[calc(100vh-80px)] max-w-[1440px] mx-auto px-margin-mobile lg:px-margin pb-space-xl">
          {/* Top Mission Header Strip */}
          <div className="flex items-center justify-between gap-space-md mb-space-md">
            <Link
              href="/round3"
              className="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-card border-2 border-ink-primary rounded-lg text-ink-primary font-headline-sm text-label-ticker shadow-[2px_2px_0px_#0F172A] hover:translate-x-[-2px] transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>BACK TO MISSION HUB</span>
            </Link>

            <span className="font-label-sticker text-label-sticker text-ink-secondary bg-surface-card px-space-md py-space-xs rounded-full border-2 border-ink-primary font-bold">
              STAGE 0{missionNumber} / 05
            </span>
          </div>

          {/* Render target mission component */}
          {missionNumber === 1 && (
            <Mission1HiddenObject
              teamId={session.teamId}
              mission={mission}
              attempt={attempt}
              onSuccess={handleSuccess}
            />
          )}

          {missionNumber === 2 && (
            <Mission2HackerReceipt
              teamId={session.teamId}
              mission={mission}
              attempt={attempt}
              onSuccess={handleSuccess}
            />
          )}

          {missionNumber === 3 && (
            <Mission3LogicBoxes
              teamId={session.teamId}
              mission={mission}
              attempt={attempt}
              onSuccess={handleSuccess}
            />
          )}

          {missionNumber === 4 && (
            <Mission4CaesarCipher
              teamId={session.teamId}
              mission={mission}
              attempt={attempt}
              onSuccess={handleSuccess}
            />
          )}

          {missionNumber === 5 && (
            <Mission5CodePuzzle
              teamId={session.teamId}
              mission={mission}
              attempt={attempt}
              onSuccess={handleSuccess}
            />
          )}
        </main>
      </div>
    </AntiCheatGuard>
  );
}
