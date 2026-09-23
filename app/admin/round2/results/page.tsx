'use client';

// app/admin/round2/results/page.tsx — Round 2 results + violation feed

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { LeaderboardEntry, ViolationCount } from '@/types';
import CountUp from '@/components/animations/CountUp';

export default function AdminRound2ResultsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [violations, setViolations] = useState<ViolationCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'violations'>('leaderboard');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: lb }, { data: v }] = await Promise.all([
        supabase.rpc('get_leaderboard'),
        supabase.rpc('get_violation_counts'),
      ]);
      setLeaderboard(lb ?? []);
      setViolations(v ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const clearViolations = async (teamId: string) => {
    const supabase = createClient();
    await supabase.from('anti_cheat_violations').delete().eq('team_id', teamId);
    const { data: v } = await supabase.rpc('get_violation_counts');
    setViolations(v ?? []);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Round 2 Results
        </h1>
        <div className="flex gap-2 mt-3">
          {(['leaderboard', 'violations'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {tab === 'leaderboard' ? '🏆 Leaderboard' : '⚠️ Violations'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'leaderboard' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Rank', 'Team', 'R1 Score', 'R2 Score', 'Coins Left', 'Total', 'Violations'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array(5).fill(0).map((_, i) => (
                <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>)}</tr>
              )) : leaderboard.map((row, i) => (
                <motion.tr key={row.team_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className={`hover:bg-slate-50 ${i < 3 ? 'font-semibold' : ''}`}>
                  <td className="px-4 py-3 text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${row.rank}`}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{row.team_name}</td>
                  <td className="px-4 py-3 text-purple-600 font-semibold">{row.r1_score}</td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">{row.r2_score}</td>
                  <td className="px-4 py-3 text-amber-500">{row.r2_coins} 🪙</td>
                  <td className="px-4 py-3 font-black text-slate-900 text-lg">{row.r1_score + row.r2_score}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-xs ${row.total_violations >= 3 ? 'text-red-600' : 'text-slate-400'}`}>
                      {row.total_violations}{row.total_violations >= 3 ? ' ⚠️' : ''}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="space-y-3">
          {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />) :
            violations.filter(v => v.total_violations > 0).map((v, i) => (
              <motion.div key={v.team_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`card p-4 flex items-center justify-between ${v.is_flagged ? 'border-red-200 bg-red-50' : ''}`}>
                <div className="flex items-center gap-3">
                  {v.is_flagged && <span className="text-2xl">⚠️</span>}
                  <div>
                    <p className="font-bold text-slate-900">{v.team_name}</p>
                    <p className="text-xs text-slate-500">
                      Total: {v.total_violations} | Fullscreen: {v.fullscreen_exits} | Tab: {v.tab_switches} | DevTools: {v.devtools_detections}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-black ${v.is_flagged ? 'text-red-600' : 'text-slate-600'}`}>{v.total_violations}</span>
                  <button onClick={() => clearViolations(v.team_id)}
                    className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    Clear Flags
                  </button>
                </div>
              </motion.div>
            ))
          }
          {!loading && violations.filter(v => v.total_violations > 0).length === 0 && (
            <div className="card p-12 text-center text-slate-400">
              <div className="text-4xl mb-3">✅</div>
              <p>No violations recorded. Everyone behaved. Remarkable.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
