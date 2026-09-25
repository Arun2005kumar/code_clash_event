'use client';

// app/scoreboard/page.tsx — Public Final Scoreboard (visible when admin publishes)

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';

interface LeaderboardRow {
  rank: number;
  team_name: string;
  r1_score: number;
  r2_score: number;
  r3_vault_unlocked: boolean;
  finish_time_seconds?: number;
  hints_used: number;
  total_score: number;
  team_id: string;
}

export default function ScoreboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const { data: settings } = await supabase
      .from('competition_settings')
      .select('round3_results_published')
      .limit(1)
      .maybeSingle();

    const published = (settings as any)?.round3_results_published ?? false;
    setIsPublished(published);

    if (!published) {
      setLoading(false);
      return;
    }

    const { data: teams } = await supabase.from('teams').select('id, team_name');
    const { data: r1Attempts } = await supabase.from('round1_attempts').select('team_id, score').in('status', ['submitted', 'auto_submitted']);
    const { data: r2State } = await supabase.from('round2_team_state').select('team_id, score');
    const { data: r3State } = await supabase.from('round3_team_state').select('*');

    const r1Map = new Map<string, number>();
    r1Attempts?.forEach((a: any) => {
      const existing = r1Map.get(a.team_id) ?? 0;
      if (a.score > existing) r1Map.set(a.team_id, a.score);
    });

    const r2Map = new Map<string, number>();
    r2State?.forEach((s: any) => r2Map.set(s.team_id, s.score));

    const r3Map = new Map<string, any>();
    r3State?.forEach((s: any) => r3Map.set(s.team_id, s));

    const entries: LeaderboardRow[] = (teams ?? []).map((t: any) => {
      const r1Score = r1Map.get(t.id) ?? 0;
      const r2Score = r2Map.get(t.id) ?? 0;
      const r3 = r3Map.get(t.id);
      const isUnlocked = r3?.vault_unlocked ?? false;
      const totalScore = r1Score + r2Score + (isUnlocked ? 10 : 0);

      return {
        rank: 0,
        team_id: t.id,
        team_name: t.team_name,
        r1_score: r1Score,
        r2_score: r2Score,
        r3_vault_unlocked: isUnlocked,
        finish_time_seconds: r3?.finish_time_seconds,
        hints_used: r3?.hints_used ?? 0,
        total_score: totalScore,
      };
    });

    entries.sort((a, b) => {
      if (a.r3_vault_unlocked !== b.r3_vault_unlocked) return a.r3_vault_unlocked ? -1 : 1;
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      const timeA = a.finish_time_seconds ?? 999999;
      const timeB = b.finish_time_seconds ?? 999999;
      if (timeA !== timeB) return timeA - timeB;
      return a.hints_used - b.hints_used;
    });

    entries.forEach((entry, idx) => { entry.rank = idx + 1; });
    setLeaderboard(entries);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel('scoreboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round1_attempts' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round2_team_state' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round3_team_state' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const formatTime = (sec?: number) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const rankEmoji = (r: number) => {
    if (r === 1) return '🥇';
    if (r === 2) return '🥈';
    if (r === 3) return '🥉';
    return `#${r}`;
  };

  return (
    <div className="min-h-screen bg-canvas-cream font-body-md text-ink-primary">
      <Header />
      <main className="pt-24 max-w-5xl mx-auto px-margin-mobile lg:px-margin pb-space-xl">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-space-xl">
          <div className="inline-flex items-center gap-space-xs px-space-md py-1.5 bg-currency-gold/20 border-2 border-ink-primary rounded-full shadow-sm mb-space-md">
            <span className="text-currency-gold text-[20px]">🏆</span>
            <span className="font-label-ticker text-label-ticker uppercase tracking-wider text-ink-primary font-extrabold">FINAL RANKINGS</span>
          </div>
          <h1 className="font-display-xl text-display-xl text-ink-primary tracking-tight font-black mb-space-sm">
            CODE CLASH<br />
            <span className="text-round-3-purple">LEADERBOARD</span>
          </h1>
          <p className="font-body-md text-body-md text-ink-secondary max-w-xl">
            Official final standings for the Code Clash competition. Scores are combined across all three rounds.
          </p>
          <div className="mt-space-sm flex items-center gap-2 text-ink-secondary font-label-sticker text-label-sticker">
            <span className="w-2 h-2 rounded-full bg-status-correct animate-pulse inline-block" />
            <span>LIVE — Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Not Published State */}
        {!loading && !isPublished && (
          <div className="flex flex-col items-center justify-center py-space-xl text-center">
            <span className="text-[64px] mb-space-md">⏳</span>
            <div className="bg-surface-card border-2 border-ink-primary rounded-xl p-space-xl shadow-[4px_4px_0px_#0F172A] max-w-md">
              <h2 className="font-headline-lg text-headline-lg font-black text-ink-primary mb-space-sm">
                RESULTS NOT YET PUBLISHED
              </h2>
              <p className="font-body-md text-body-md text-ink-secondary mb-space-md">
                The organizers haven&apos;t published the final results yet. Stay tuned — they&apos;ll appear here automatically!
              </p>
              <div className="px-space-md py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-full font-label-sticker text-label-sticker font-bold border border-round-3-purple/30 inline-block">
                STATUS: AWAITING ADMIN APPROVAL
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-space-xl">
            <div className="w-12 h-12 border-4 border-round-3-purple border-t-transparent rounded-full animate-spin mb-space-md" />
            <p className="font-label-code text-round-3-purple font-bold">FETCHING FINAL STANDINGS...</p>
          </div>
        )}

        {/* Leaderboard Table */}
        {!loading && isPublished && (
          <div className="flex flex-col gap-space-md">
            {/* Score Legend */}
            <div className="flex flex-wrap items-center gap-space-sm p-space-md bg-surface-card border-2 border-ink-primary rounded-xl shadow-sm">
              <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase font-bold">SCORE BREAKDOWN:</span>
              <span className="font-body-sm text-body-sm text-round-1-blue font-bold">R1 MCQ</span>
              <span className="text-ink-secondary">+</span>
              <span className="font-body-sm text-body-sm text-round-2-orange font-bold">R2 Auction</span>
              <span className="text-ink-secondary">+</span>
              <span className="font-body-sm text-body-sm text-round-3-purple font-bold">R3 Vault (+10)</span>
              <span className="text-ink-secondary">=</span>
              <span className="font-body-sm text-body-sm text-ink-primary font-black">TOTAL SCORE</span>
            </div>

            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-space-sm mb-space-md">
                {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
                  if (!entry) return null;
                  const podiumOrder = [2, 1, 3];
                  const heights = ['h-24', 'h-32', 'h-20'];
                  const colors = ['bg-round-1-blue/20 border-round-1-blue/40', 'bg-currency-gold/20 border-currency-gold/40', 'bg-round-3-purple/20 border-round-3-purple/40'];
                  return (
                    <div key={entry.team_id} className={`flex flex-col items-center justify-end p-space-sm ${heights[idx]} rounded-xl border-2 ${colors[idx]} text-center`}>
                      <span className="text-2xl">{rankEmoji(podiumOrder[idx])}</span>
                      <p className="font-headline-sm text-[13px] font-black text-ink-primary leading-tight">{entry.team_name}</p>
                      <p className="font-label-code text-label-code font-bold text-ink-secondary">{entry.total_score} pts</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full Leaderboard */}
            <div className="bg-surface-card rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-muted text-ink-secondary font-label-sticker text-label-sticker uppercase border-b-2 border-ink-primary">
                    <th className="py-space-sm px-space-md">RANK</th>
                    <th className="py-space-sm px-space-md">TEAM</th>
                    <th className="py-space-sm px-space-md text-round-1-blue">R1</th>
                    <th className="py-space-sm px-space-md text-round-2-orange">R2</th>
                    <th className="py-space-sm px-space-md text-round-3-purple">VAULT</th>
                    <th className="py-space-sm px-space-md">TIME</th>
                    <th className="py-space-sm px-space-md text-right font-black text-ink-primary">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-muted">
                  {leaderboard.map(entry => (
                    <tr
                      key={entry.team_id}
                      className={`transition-colors ${
                        entry.rank <= 3 ? 'bg-currency-gold/5 hover:bg-currency-gold/10' : 'hover:bg-surface-muted/50'
                      }`}
                    >
                      <td className="py-space-md px-space-md">
                        <span className={`font-headline-sm text-lg ${entry.rank === 1 ? 'text-currency-gold' : entry.rank === 2 ? 'text-round-1-blue' : entry.rank === 3 ? 'text-round-3-purple' : 'text-ink-secondary'}`}>
                          {rankEmoji(entry.rank)}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md font-headline-sm text-body-md text-ink-primary font-black">
                        {entry.team_name}
                        {entry.rank === 1 && <span className="ml-2 text-[10px] bg-currency-gold/20 text-currency-gold px-1.5 py-0.5 rounded font-label-sticker border border-currency-gold/30">CHAMPION</span>}
                      </td>
                      <td className="py-space-md px-space-md font-label-code text-round-1-blue font-bold">{entry.r1_score}</td>
                      <td className="py-space-md px-space-md font-label-code text-round-2-orange font-bold">{entry.r2_score}</td>
                      <td className="py-space-md px-space-md">
                        {entry.r3_vault_unlocked ? (
                          <span className="px-space-sm py-0.5 bg-status-correct/20 text-status-correct rounded font-label-sticker text-label-sticker border border-status-correct/30 font-bold">CRACKED +10</span>
                        ) : (
                          <span className="px-space-sm py-0.5 bg-surface-muted text-ink-secondary rounded font-label-sticker text-label-sticker border border-ink-primary/20">LOCKED</span>
                        )}
                      </td>
                      <td className="py-space-md px-space-md font-label-code text-round-3-purple">{formatTime(entry.finish_time_seconds)}</td>
                      <td className="py-space-md px-space-md text-right font-headline-sm text-headline-sm text-ink-primary font-black">
                        {entry.total_score}
                        <span className="font-body-sm text-body-sm text-ink-secondary ml-1">pts</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-center font-body-sm text-body-sm text-ink-secondary">
              This leaderboard updates in real-time. Tiebreakers: higher vault unlock, then lower finish time, then fewer hints used.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
