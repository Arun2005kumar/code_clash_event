'use client';

// components/admin/round3/Round3Results.tsx
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Round3LeaderboardEntry } from '@/types';
import { toast } from 'sonner';

export default function Round3Results() {
  const [leaderboard, setLeaderboard] = useState<Round3LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsPublished, setResultsPublished] = useState(false);

  const loadData = async () => {
    const supabase = createClient();

    // Fetch settings
    const { data: settings } = await supabase
      .from('competition_settings')
      .select('round3_results_published')
      .limit(1)
      .maybeSingle();

    setResultsPublished(settings?.round3_results_published ?? false);

    // Fetch teams, round1 attempts, round2 team state, round3 state
    const { data: teams } = await supabase.from('teams').select('*');
    const { data: r1Attempts } = await supabase.from('round1_attempts').select('team_id, score');
    const { data: r2State } = await supabase.from('round2_team_state').select('team_id, score');
    const { data: r3State } = await supabase.from('round3_team_state').select('*');

    const r1Map = new Map<string, number>();
    r1Attempts?.forEach(a => r1Map.set(a.team_id, a.score));

    const r2Map = new Map<string, number>();
    r2State?.forEach(s => r2Map.set(s.team_id, s.score));

    const r3Map = new Map<string, any>();
    r3State?.forEach(s => r3Map.set(s.team_id, s));

    const entries: Round3LeaderboardEntry[] = (teams ?? []).map(t => {
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
        r3_status: r3?.status ?? 'not_started',
        r3_vault_unlocked: isUnlocked,
        finish_time_seconds: r3?.finish_time_seconds,
        hints_used: r3?.hints_used ?? 0,
        total_score: totalScore,
      };
    });

    // Sort entries:
    // 1. Vault unlocked first
    // 2. Total score desc
    // 3. Finish time asc
    // 4. Hints used asc
    entries.sort((a, b) => {
      if (a.r3_vault_unlocked !== b.r3_vault_unlocked) {
        return a.r3_vault_unlocked ? -1 : 1;
      }
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }
      const timeA = a.finish_time_seconds ?? 999999;
      const timeB = b.finish_time_seconds ?? 999999;
      if (timeA !== timeB) return timeA - timeB;
      return a.hints_used - b.hints_used;
    });

    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    setLeaderboard(entries);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const togglePublishResults = async () => {
    const supabase = createClient();
    const nextState = !resultsPublished;
    const { error } = await supabase
      .from('competition_settings')
      .update({ round3_results_published: nextState })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) toast.error(error.message);
    else {
      setResultsPublished(nextState);
      toast.success(`Results ${nextState ? 'PUBLISHED TO TEAMS 📢' : 'UNPUBLISHED'}`);
    }
  };

  const exportCSV = () => {
    const headers = ['Rank', 'Team Name', 'R1 Score', 'R2 Score', 'R3 Vault Unlocked', 'R3 Finish Time (s)', 'Hints Used', 'Total Score'];
    const rows = leaderboard.map(e => [
      e.rank,
      `"${e.team_name}"`,
      e.r1_score,
      e.r2_score,
      e.r3_vault_unlocked ? 'YES' : 'NO',
      e.finish_time_seconds ?? '-',
      e.hints_used,
      e.total_score,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CodeClash_Round3_Leaderboard.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Leaderboard CSV exported successfully!');
  };

  const formatSec = (sec?: number) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col w-full gap-space-lg pb-space-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md bg-surface-card p-space-md rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A]">
        <div>
          <span className="font-label-sticker text-label-sticker text-currency-gold uppercase font-black block">
            TOURNAMENT OVERALL LEADERBOARD
          </span>
          <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
            ROUND 3 RESULTS &amp; STANDINGS
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            onClick={togglePublishResults}
            className={`px-space-md py-space-xs font-headline-sm text-label-ticker font-black rounded-xl shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary transition-all cursor-pointer ${
              resultsPublished ? 'bg-status-correct text-on-primary' : 'bg-surface-muted text-ink-primary'
            }`}
          >
            {resultsPublished ? 'RESULTS PUBLISHED 📢' : 'PUBLISH RESULTS TO TEAMS'}
          </button>
          <button
            onClick={exportCSV}
            className="px-space-md py-space-xs bg-round-3-purple text-on-tertiary font-headline-sm text-label-ticker font-black rounded-xl shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary hover:bg-tertiary-container transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary overflow-x-auto">
        <table className="w-full text-left font-body-sm text-body-sm border-collapse">
          <thead>
            <tr className="bg-surface-muted text-ink-secondary font-label-sticker text-label-sticker uppercase border-b-2 border-ink-primary">
              <th className="py-space-sm px-space-md">RANK</th>
              <th className="py-space-sm px-space-md">TEAM</th>
              <th className="py-space-sm px-space-md">R1 SCORE</th>
              <th className="py-space-sm px-space-md">R2 SCORE</th>
              <th className="py-space-sm px-space-md">R3 VAULT STATUS</th>
              <th className="py-space-sm px-space-md">FINISH TIME</th>
              <th className="py-space-sm px-space-md">HINTS</th>
              <th className="py-space-sm px-space-md text-right">TOTAL SCORE</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-surface-muted font-bold">
            {leaderboard.map(e => (
              <tr key={e.team_id} className="hover:bg-surface-container-low transition-colors">
                <td className="py-space-md px-space-md">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-body-sm shadow-sm border border-ink-primary ${
                      e.rank === 1
                        ? 'bg-currency-gold text-surface-card'
                        : e.rank === 2
                        ? 'bg-round-1-blue text-on-primary'
                        : e.rank === 3
                        ? 'bg-round-3-purple text-on-tertiary'
                        : 'bg-surface-muted text-ink-primary'
                    }`}
                  >
                    {e.rank}
                  </span>
                </td>
                <td className="py-space-md px-space-md font-headline-sm text-body-md text-ink-primary">
                  {e.team_name}
                </td>
                <td className="py-space-md px-space-md font-label-code text-ink-secondary">
                  {e.r1_score} pts
                </td>
                <td className="py-space-md px-space-md font-label-code text-ink-secondary">
                  {e.r2_score} pts
                </td>
                <td className="py-space-md px-space-md">
                  {e.r3_vault_unlocked ? (
                    <span className="px-space-sm py-0.5 bg-status-correct text-surface-card rounded font-label-sticker text-label-sticker border border-ink-primary">
                      ✓ CRACKED (+10)
                    </span>
                  ) : (
                    <span className="px-space-sm py-0.5 bg-surface-muted text-ink-secondary rounded font-label-sticker text-label-sticker border border-ink-primary">
                      UNSOLVED
                    </span>
                  )}
                </td>
                <td className="py-space-md px-space-md font-label-code text-round-3-purple">
                  {formatSec(e.finish_time_seconds)}
                </td>
                <td className="py-space-md px-space-md font-label-code text-round-2-orange">
                  {e.hints_used}
                </td>
                <td className="py-space-md px-space-md text-right font-headline-sm text-headline-sm text-ink-primary">
                  {e.total_score} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
