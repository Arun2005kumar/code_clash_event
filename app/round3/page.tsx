'use client';

// app/round3/page.tsx — Round 3 Mission Hub
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import AntiCheatGuard from '@/components/anti-cheat/AntiCheatGuard';
import Header from '@/components/layout/Header';
import MissionHub from '@/components/round3/MissionHub';
import { getActiveRound3Missions } from '@/lib/round3/missions';
import { getOrCreateRound3TeamState, getTeamRound3Attempts } from '@/lib/round3/state';
import { Round3Mission, Round3MissionAttempt, Round3TeamState, TeamSession } from '@/types';

export default function Round3HubPage() {
  const router = useRouter();
  const [session, setSession] = useState<TeamSession | null>(null);
  const [round3Active, setRound3Active] = useState(false);
  const [missions, setMissions] = useState<Round3Mission[]>([]);
  const [attempts, setAttempts] = useState<Round3MissionAttempt[]>([]);
  const [teamState, setTeamState] = useState<Round3TeamState | null>(null);
  const [loading, setLoading] = useState(true);

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }, []);

  useEffect(() => {
    const s = getTeamSession();
    if (!s) {
      router.replace('/');
      return;
    }
    setSession(s);
  }, [router]);

  const loadData = useCallback(async (teamId: string) => {
    const supabase = getSupabase();

    // Check competition settings
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

    // Get active missions
    const activeMissions = await getActiveRound3Missions();
    setMissions(activeMissions);

    // Get/create team state
    const tState = await getOrCreateRound3TeamState(teamId);
    setTeamState(tState);

    // Get team attempts
    const tAttempts = await getTeamRound3Attempts(teamId);
    setAttempts(tAttempts);

    setLoading(false);
  }, [getSupabase]);

  useEffect(() => {
    if (!session) return;
    loadData(session.teamId);

    // Supabase Realtime subscriptions
    const supabase = getSupabase();

    const attemptsChannel = supabase
      .channel(`round3-team-attempts-${session.teamId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'round3_mission_attempts',
        filter: `team_id=eq.${session.teamId}`,
      }, () => {
        loadData(session.teamId);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'round3_team_state',
        filter: `team_id=eq.${session.teamId}`,
      }, () => {
        loadData(session.teamId);
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('competition-settings-r3')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'competition_settings',
      }, (payload) => {
        if (payload.new && typeof payload.new.round3_active === 'boolean') {
          setRound3Active(payload.new.round3_active);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attemptsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [session, loadData, getSupabase]);

  if (!session) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-headline-sm text-headline-sm text-ink-primary font-bold">
        <div className="flex items-center gap-space-sm bg-surface-card p-space-lg rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A]">
          <span className="material-symbols-outlined text-[24px] text-round-3-purple animate-spin">refresh</span>
          <span>CONNECTING TO OPERATION TECH HEIST...</span>
        </div>
      </div>
    );
  }

  if (!round3Active) {
    return (
      <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
        <Header activePath="/round3" />
        <main className="w-full pt-28 bg-surface min-h-[calc(100vh-80px)] max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <div className="max-w-xl mx-auto p-space-lg bg-surface-card rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] text-center flex flex-col items-center gap-space-md my-space-xl">
            <span className="text-[48px]">🔒</span>
            <h1 className="font-headline-lg text-headline-lg font-black text-ink-primary uppercase">
              ROUND 3 IS LOCKED
            </h1>
            <p className="font-body-md text-body-md text-ink-secondary">
              The auction master hasn&apos;t opened Round 3 yet. Stand by for signal from the admin control room.
            </p>
            <div className="px-space-md py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-full font-label-sticker text-label-sticker font-bold border border-round-3-purple/30">
              STATUS: STANDBY MODE
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <AntiCheatGuard teamId={session.teamId} teamName={session.teamName} roundName="Round 3">
      <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
        <Header activePath="/round3" />
        <main className="w-full pt-24 bg-surface min-h-[calc(100vh-80px)] max-w-[1440px] mx-auto px-margin-mobile lg:px-margin">
          <MissionHub
            teamName={session.teamName}
            missions={missions}
            attempts={attempts}
            teamState={teamState}
          />
        </main>
      </div>
    </AntiCheatGuard>
  );
}
