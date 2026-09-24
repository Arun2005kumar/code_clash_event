'use client';

// app/admin/round1/results/page.tsx — Round 1 results sorted by score

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime, formatTime } from '@/lib/utils';

interface ResultRow {
  id: string;
  team_name: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  status: string;
  started_at?: string;
  submitted_at?: string;
  time_used_seconds: number;
}

export default function AdminRound1ResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('round1_attempts')
        .select('*, teams(team_name)')
        .in('status', ['submitted', 'auto_submitted'])
        .order('score', { ascending: false });

      setResults((data ?? []).map((d: any) => ({
        ...d,
        team_name: d.teams?.team_name ?? 'Unknown',
      })));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Round 1 Results</h1>
        <p className="text-slate-500 text-sm mt-1">{results.length} submissions — sorted by score</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Rank', 'Team', 'Score', 'Correct', '%', 'Started At', 'Submitted At', 'Time Used', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>{Array(9).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>)}</tr>
              ))
            ) : results.map((r, i) => {
              const pct = Math.round((r.correct_answers / (r.total_questions || 30)) * 100);
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
              return (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-bold">{medal}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.team_name}</td>
                  <td className="px-4 py-3 font-black text-blue-600 text-lg">{r.score}</td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">{r.correct_answers}/30</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-slate-600 text-xs">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                    {r.started_at ? formatDateTime(r.started_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-900 font-mono font-bold">
                    {r.submitted_at ? formatDateTime(r.submitted_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{formatTime(r.time_used_seconds)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'auto_submitted' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {r.status === 'auto_submitted' ? '⏰ Auto' : '✅ Manual'}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {!loading && results.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <div className="text-4xl mb-3">📭</div>
            <p>No submissions yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
