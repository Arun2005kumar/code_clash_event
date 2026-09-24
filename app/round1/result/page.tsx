'use client';

// app/round1/result/page.tsx — Round 1 Result with animated score & live answer key

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import CountUp from '@/components/animations/CountUp';
import { Round1Attempt, Round1Question } from '@/types';
import { formatTime } from '@/lib/utils';
import BloomTransition from '@/components/animations/BloomTransition';
import Header from '@/components/layout/Header';
import FormattedQuestion from '@/components/quiz/FormattedQuestion';

interface AnswerDetail {
  selected_option: string | null;
  is_correct: boolean;
}

export default function Round1ResultPage() {
  const router = useRouter();
  const [attempt, setAttempt] = useState<Round1Attempt | null>(null);
  const [showExplanations, setShowExplanations] = useState(false);
  const [questions, setQuestions] = useState<Round1Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, AnswerDetail>>({});
  const [loading, setLoading] = useState(true);
  const [bloom, setBloom] = useState(false);

  const load = useCallback(async () => {
    const session = getTeamSession();
    if (!session) { router.replace('/'); return; }

    const supabase = createClient();

    // 1. Fetch competition settings for show_round1_explanations
    const { data: settings } = await supabase
      .from('competition_settings')
      .select('show_round1_explanations')
      .limit(1)
      .maybeSingle();

    const isExplanationsOn = !!settings?.show_round1_explanations;
    setShowExplanations(isExplanationsOn);

    // 2. Fetch attempt
    const { data: attemptData, error } = await supabase
      .from('round1_attempts')
      .select('*')
      .eq('team_id', session.teamId)
      .in('status', ['submitted', 'auto_submitted'])
      .maybeSingle();

    if (error || !attemptData) {
      setAttempt(null);
      setLoading(false);
      return;
    }

    setAttempt(attemptData);

    // 3. Fetch questions & answers if explanations toggle is ON
    if (isExplanationsOn && attemptData) {
      const [{ data: qs }, { data: ans }] = await Promise.all([
        supabase
          .from('round1_questions')
          .select('id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation')
          .order('question_number'),
        supabase
          .from('round1_answers')
          .select('question_id, selected_option, is_correct')
          .eq('attempt_id', attemptData.id),
      ]);

      setQuestions((qs as any) || []);

      const map: Record<string, AnswerDetail> = {};
      ans?.forEach((a) => {
        map[a.question_id] = { selected_option: a.selected_option, is_correct: a.is_correct };
      });
      setUserAnswers(map);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('public:competition_settings:round1_results')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <main className="min-h-screen bg-dot-grid flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-card border-2 border-ink-primary rounded-2xl p-8 shadow-[6px_6px_0px_#0F172A] text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 border-2 border-ink-primary rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 font-black shadow-[2px_2px_0px_#0F172A]">
            ⚠️
          </div>
          <h1 className="text-2xl font-black text-ink-primary mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            No Submitted Result
          </h1>
          <p className="text-ink-secondary text-sm mb-6">
            We couldn't find a completed submission for Round 1 for your team. You can jump into Round 1 if it's currently live or return to the main arena.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/round1')}
              className="w-full py-3.5 bg-primary text-on-primary font-bold text-sm rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] transition-transform"
            >
              Go to Round 1 Terminal →
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3.5 bg-surface-muted text-ink-primary font-bold text-sm rounded-xl border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] hover:bg-slate-200 transition-colors"
            >
              Return to Arena Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  const percentage = Math.round((attempt.correct_answers / attempt.total_questions) * 100);
  const grade = percentage >= 90 ? '🏆' : percentage >= 70 ? '⭐' : percentage >= 50 ? '👍' : '😅';

  return (
    <div className="min-h-screen bg-dot-grid font-body-md text-ink-primary flex flex-col">
      <Header />

      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        {/* Header Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border border-blue-200">
            Round 1 Complete
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {grade} Your Results
          </h1>
          <p className="text-slate-500 text-sm italic">Well played. Your keyboard survived. 💪</p>
        </motion.div>

        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-card border-2 border-ink-primary rounded-2xl p-6 sm:p-8 mb-8 shadow-[6px_6px_0px_#0F172A]"
        >
          {/* Big score */}
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">FINAL SCORE</p>
            <div className="text-6xl sm:text-7xl font-black text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
            <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
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
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Correct', value: attempt.correct_answers, color: 'text-emerald-600' },
              { label: 'Wrong', value: attempt.total_questions - attempt.correct_answers, color: 'text-red-500' },
              { label: 'Time Used', value: formatTime(attempt.time_used_seconds ?? 0), color: 'text-blue-600', raw: true },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-surface-muted rounded-xl p-3 sm:p-4 border border-ink-primary shadow-sm">
                <p className={`text-xl sm:text-2xl font-black ${stat.color}`}>
                  {stat.raw ? stat.value : <CountUp target={stat.value as number} duration={1200} />}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Auto-submit badge */}
          {attempt.status === 'auto_submitted' && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 text-center font-medium">
              ⏰ Auto-submitted when time expired
            </div>
          )}
        </motion.div>

        {/* Action Button: Proceed to Round 2 */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setBloom(true)}
          className="w-full py-4 bg-slate-900 text-white font-bold text-base rounded-2xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] hover:bg-slate-800 transition-all cursor-pointer mb-8"
        >
          Proceed to Round 2 →
        </motion.button>

        {/* Detailed Answer Key Section (when show_round1_explanations is true) */}
        {showExplanations ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-card border-2 border-ink-primary rounded-2xl p-6 sm:p-8 shadow-[6px_6px_0px_#0F172A] space-y-6"
          >
            <div className="border-b-2 border-surface-muted pb-4 flex items-center justify-between">
              <div>
                <span className="font-label-sticker text-label-sticker text-blue-600 uppercase font-black block">OFFICIAL ANSWER KEY</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  💡 Question &amp; Explanation Breakdown
                </h2>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300">
                UNLOCKED BY ADMIN
              </span>
            </div>

            <div className="space-y-4">
              {questions.map((q) => {
                const userAns = userAnswers[q.id];
                const selected = userAns?.selected_option;
                const isCorrect = userAns?.is_correct;
                const correctOpt = (q as any).correct_option;

                return (
                  <div
                    key={q.id}
                    className={`p-5 rounded-xl border-2 ${
                      isCorrect ? 'bg-emerald-50/60 border-emerald-300' : selected ? 'bg-red-50/60 border-red-300' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <FormattedQuestion
                        text={q.question_text}
                        prefix={`Q${q.question_number}.`}
                        titleClassName="font-bold text-slate-900 text-base leading-snug"
                        compact
                      />
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border uppercase whitespace-nowrap ${
                        isCorrect ? 'bg-emerald-200 text-emerald-900 border-emerald-400' : selected ? 'bg-red-200 text-red-900 border-red-400' : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}>
                        {isCorrect ? '✅ Correct' : selected ? '❌ Wrong' : '⚪ Unanswered'}
                      </span>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const optionText = q[`option_${opt.toLowerCase()}` as keyof Round1Question] as string;
                        const isThisSelected = selected === opt;
                        const isThisCorrect = correctOpt === opt;

                        let style = 'bg-white text-slate-700 border-slate-200';
                        if (isThisCorrect) {
                          style = 'bg-emerald-100 text-emerald-900 font-bold border-emerald-400';
                        } else if (isThisSelected) {
                          style = 'bg-red-100 text-red-900 font-bold border-red-300';
                        }

                        return (
                          <div key={opt} className={`p-2.5 rounded-lg border flex items-center justify-between text-xs sm:text-sm ${style}`}>
                            <span><strong>{opt}:</strong> {optionText}</span>
                            {isThisCorrect && <span className="text-xs font-bold text-emerald-700">✓ Correct</span>}
                            {!isThisCorrect && isThisSelected && <span className="text-xs font-bold text-red-600">Your choice</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs sm:text-sm text-amber-900">
                        <strong className="block mb-1 text-amber-950 font-bold">💡 Explanation:</strong>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="p-6 bg-surface-card border-2 border-ink-primary rounded-2xl text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              🔒 Official answer key and explanations are currently hidden by the host. Check back once the admin reveals them!
            </p>
          </div>
        )}
      </main>

      <BloomTransition isActive={bloom} onComplete={() => router.push('/round2')} />
    </div>
  );
}
