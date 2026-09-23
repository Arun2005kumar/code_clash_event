'use client';

// app/round1/result/page.tsx — Round 1 Result with animated score count-up

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import CountUp from '@/components/animations/CountUp';
import { Round1Attempt } from '@/types';
import { formatTime } from '@/lib/utils';
import BloomTransition from '@/components/animations/BloomTransition';

export default function Round1ResultPage() {
  const router = useRouter();
  const [attempt, setAttempt] = useState<Round1Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [bloom, setBloom] = useState(false);

  useEffect(() => {
    const session = getTeamSession();
    if (!session) { router.replace('/'); return; }

    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('round1_attempts')
        .select('*')
        .eq('team_id', session.teamId)
        .in('status', ['submitted', 'auto_submitted'])
        .single();

      if (error || !data) {
        toast.error('No submitted result found.');
        router.replace('/round1');
        return;
      }

      setAttempt(data);
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

  if (!attempt) return null;

  const percentage = Math.round((attempt.correct_answers / attempt.total_questions) * 100);
  const grade = percentage >= 90 ? '🏆' : percentage >= 70 ? '⭐' : percentage >= 50 ? '👍' : '😅';

  return (
    <main className="min-h-screen bg-dot-grid flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            Round 1 Complete
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-3 mb-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {grade} Your Results
          </h1>
          <p className="text-slate-500 text-sm italic">Well played. Your keyboard survived. 💪</p>
        </motion.div>

        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-8 mb-4"
        >
          {/* Big score */}
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Score</p>
            <div className="text-7xl font-black text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <CountUp target={attempt.score} duration={1800} />
              <span className="text-3xl text-slate-300">/{attempt.total_questions}</span>
            </div>
          </div>

          {/* Percentage bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600">Accuracy</span>
              <span className="text-sm font-bold text-blue-600">
                <CountUp target={percentage} duration={1600} suffix="%" />
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: percentage >= 70 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444' }}
                initial={{ width: '0%' }}
                animate={{ width: `${percentage}%` }}
                transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Correct', value: attempt.correct_answers, color: 'text-emerald-600' },
              { label: 'Wrong', value: attempt.total_questions - attempt.correct_answers, color: 'text-red-500' },
              { label: 'Time Used', value: formatTime(attempt.time_used_seconds ?? 0), color: 'text-blue-600', raw: true },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-slate-50 rounded-xl p-4">
                <p className={`text-2xl font-black ${stat.color}`}>
                  {stat.raw ? stat.value : <CountUp target={stat.value as number} duration={1200} />}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Auto-submit badge */}
          {attempt.status === 'auto_submitted' && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 text-center">
              ⏰ Auto-submitted when time expired
            </div>
          )}
        </motion.div>

        {/* Proceed button */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setBloom(true)}
          className="w-full py-4 bg-slate-900 text-white font-bold text-base rounded-2xl hover:bg-slate-700 transition-colors"
        >
          Proceed to Round 2 →
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-xs text-slate-400 mt-4 italic"
        >
          Round 2 is where the real drama begins. 🎭
        </motion.p>
      </div>

      <BloomTransition isActive={bloom} onComplete={() => router.push('/round2')} />
    </main>
  );
}
