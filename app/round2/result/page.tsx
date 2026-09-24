'use client';

// app/round2/result/page.tsx — Round 2 final results

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import { Round2Result, Round2TeamState } from '@/types';
import CountUp from '@/components/animations/CountUp';
import FormattedQuestion from '@/components/quiz/FormattedQuestion';

interface AllQuestionKey {
  id: string;
  question_number: number;
  question_text: string;
  correct_option: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  explanation?: string;
}

export default function Round2ResultPage() {
  const router = useRouter();
  const [results, setResults] = useState<Round2Result[]>([]);
  const [allQuestions, setAllQuestions] = useState<AllQuestionKey[]>([]);
  const [teamState, setTeamState] = useState<Round2TeamState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getTeamSession();
    if (!session) { router.replace('/'); return; }

    const load = async () => {
      const supabase = createClient();
      const [{ data: res }, { data: state }, { data: qData }] = await Promise.all([
        supabase.from('round2_results').select('*, round2_questions(question_number)').eq('team_id', session.teamId).order('resolved_at'),
        supabase.from('round2_team_state').select('*').eq('team_id', session.teamId).single(),
        supabase.from('round2_questions').select('*').order('question_number'),
      ]);
      setResults(res ?? []);
      setTeamState(state);
      setAllQuestions(qData ?? []);
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

  const getOptText = (q: AllQuestionKey, opt: string) => {
    const map: Record<string, string> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
    return map[opt] || opt;
  };

  return (
    <main className="min-h-screen bg-dot-grid p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">ROUND 2 COMPLETE</span>
          <h1 className="text-3xl font-black text-slate-900 mt-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Auction Results & Answer Key
          </h1>
        </motion.div>

        {/* Final score + coins */}
        {teamState && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
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

        {/* Per-question team results */}
        <div className="space-y-3">
          <h2 className="text-lg font-black text-slate-900">Your Lot Performance</h2>
          {results.map((result, i) => {
            const isWon = result.result === 'won_correct';
            const isWonWrong = result.result === 'won_incorrect';

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
                    {isWon ? 'Won & Correct' :
                     isWonWrong ? `Won & Wrong` :
                     'Not the winner this lot'}
                  </p>
                </div>
                <div className="text-right">
                  {result.score_change !== 0 && (
                    <p className={`font-bold ${result.score_change > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {result.score_change > 0 ? '+' : ''}{result.score_change} pts
                    </p>
                  )}
                  {result.bid_amount > 0 && (
                    <p className="text-sm text-amber-600">{result.bid_amount} 🪙 bid</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ALL OFFICIAL ANSWERS SECTION */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔑</span>
            <h2 className="text-xl font-black text-slate-900">Round 2 Official Answer Key</h2>
          </div>
          <p className="text-xs text-slate-500">All questions and official solutions are revealed below now that Round 2 has concluded.</p>

          <div className="space-y-4">
            {allQuestions.map((q) => (
              <div key={q.id} className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-extrabold text-xs rounded-lg">
                    LOT #{String(q.question_number).padStart(2, '0')}
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded-full">
                    CORRECT: OPTION {q.correct_option}
                  </span>
                </div>
                <FormattedQuestion
                  text={q.question_text}
                  titleClassName="font-bold text-slate-900 text-base"
                  compact
                />
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-medium">
                  <strong>Official Answer:</strong> Option {q.correct_option} — {getOptText(q, q.correct_option)}
                </div>
                {q.explanation && (
                  <p className="text-xs text-slate-600 italic">
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/round3')}
          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl cursor-pointer"
        >
          Continue to Round 3 →
        </motion.button>
      </div>
    </main>
  );
}
