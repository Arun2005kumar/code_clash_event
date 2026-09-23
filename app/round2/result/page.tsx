'use client';

// app/round2/result/page.tsx — Round 2 final results

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import { Round2Result, Round2TeamState } from '@/types';
import CountUp from '@/components/animations/CountUp';

export default function Round2ResultPage() {
  const router = useRouter();
  const [results, setResults] = useState<Round2Result[]>([]);
  const [teamState, setTeamState] = useState<Round2TeamState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getTeamSession();
    if (!session) { router.replace('/'); return; }

    const load = async () => {
      const supabase = createClient();
      const [{ data: res }, { data: state }] = await Promise.all([
        supabase.from('round2_results').select('*, round2_questions(question_number)').eq('team_id', session.teamId).order('resolved_at'),
        supabase.from('round2_team_state').select('*').eq('team_id', session.teamId).single(),
      ]);
      setResults(res ?? []);
      setTeamState(state);
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-dot-grid p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">ROUND 2 COMPLETE</span>
          <h1 className="text-3xl font-black text-slate-900 mt-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Auction Results
          </h1>
        </motion.div>

        {/* Final score + coins */}
        {teamState && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-500 mb-1">Final Score</p>
                <p className="text-5xl font-black text-blue-600"><CountUp target={teamState.score} duration={1500} /></p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Coins Remaining</p>
                <p className="text-5xl font-black text-amber-500">{teamState.coins} 🪙</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Per-question results */}
        <div className="space-y-3 mb-6">
          {results.map((result, i) => {
            const isWon = result.result === 'won_correct';
            const isWonWrong = result.result === 'won_incorrect';
            const isNotWinner = result.result === 'not_winner';

            return (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`card p-4 flex items-center gap-4 ${isWon ? 'border-emerald-300' : isWonWrong ? 'border-red-300' : ''}`}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}
                  className="text-3xl"
                >
                  {isWon ? '✅' : isWonWrong ? '❌' : '⬜'}
                </motion.div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">
                    Q{(result as any).round2_questions?.question_number ?? i + 1}
                  </p>
                  <p className="text-sm text-slate-500">
                    {isWon ? 'Won & Correct — +10 pts' :
                     isWonWrong ? `Won & Wrong — -${result.bid_amount} coins` :
                     'Not the winner this round'}
                  </p>
                </div>
                <div className="text-right">
                  {result.score_change !== 0 && (
                    <p className={`font-bold ${result.score_change > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {result.score_change > 0 ? '+' : ''}{result.score_change} pts
                    </p>
                  )}
                  {result.coin_change !== 0 && (
                    <p className="text-sm text-amber-600">{result.coin_change} 🪙</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/round3')}
          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl"
        >
          Continue to Round 3 →
        </motion.button>
      </div>
    </main>
  );
}
