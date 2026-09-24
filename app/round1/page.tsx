'use client';

// app/round1/page.tsx — Stitch Design MCQ Sprint Arena

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import {
  saveAnswerLocally, getLocalAnswers, saveAttemptId, getAttemptId,
  saveStartTime, getStartTime, ROUND1_DURATION_SECONDS,
} from '@/lib/quiz/scoring';
import AntiCheatGuard from '@/components/anti-cheat/AntiCheatGuard';
import ConfettiBurst from '@/components/animations/ConfettiBurst';
import { Round1Question, Option } from '@/types';
import FormattedQuestion from '@/components/quiz/FormattedQuestion';

const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

export default function Round1Page() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getTeamSession>>(null);
  const [questions, setQuestions] = useState<Round1Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Option>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(ROUND1_DURATION_SECONDS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitDoneRef = useRef(false);

  // Load session
  useEffect(() => {
    const s = getTeamSession();
    if (!s) { router.replace('/'); return; }
    setSession(s);
  }, [router]);

  // Load questions + init attempt
  useEffect(() => {
    if (!session) return;
    const init = async () => {
      const supabase = createClient();

      const { data: settings } = await supabase
        .from('competition_settings')
        .select('round1_active')
        .limit(1)
        .maybeSingle();

      if (!settings?.round1_active) {
        toast.error('Round 1 is not currently active. Please wait for the admin to start it.');
        setLoading(false);
        return;
      }

      const { data: attemptData, error: attemptError } = await supabase.rpc('start_round1_attempt', {
        p_team_id: session.teamId,
      });

      if (attemptError || !attemptData?.[0]) {
        toast.error('Failed to start Round 1. Please refresh.');
        setLoading(false);
        return;
      }

      const attempt = attemptData[0];
      if (attempt.already_submitted) {
        setLoading(false);
        router.replace('/round1/result');
        return;
      }

      saveAttemptId(attempt.attempt_id);

      const stored = getStartTime();
      if (!stored) {
        const { data: dbAttempt } = await supabase
          .from('round1_attempts')
          .select('started_at')
          .eq('id', attempt.attempt_id)
          .single();
        if (dbAttempt?.started_at) {
          saveStartTime(new Date(dbAttempt.started_at).getTime());
        } else {
          saveStartTime(Date.now());
        }
      }

      const { data: qs, error: qError } = await supabase
        .from('round1_questions_public')
        .select('*')
        .order('question_number');

      if (qError || !qs?.length) {
        toast.error('Failed to load questions.');
        setLoading(false);
        return;
      }

      setQuestions(qs);
      const saved = getLocalAnswers();
      setAnswers(saved);
      setLoading(false);
    };

    init();

    const supabase = createClient();
    const channel = supabase
      .channel('public:competition_settings:r1_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => {
        init();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, router]);

  // Timer Countdown
  useEffect(() => {
    if (loading || submitted || questions.length === 0) return;

    const tick = () => {
      const start = getStartTime() ?? Date.now();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(0, ROUND1_DURATION_SECONDS - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0 && !autoSubmitDoneRef.current) {
        autoSubmitDoneRef.current = true;
        handleSubmit(true);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, submitted, questions.length]);

  const handleSelectOption = async (opt: Option) => {
    if (submitted || submitting || questions.length === 0) return;
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const newAnswers = { ...answers, [currentQ.id]: opt };
    setAnswers(newAnswers);
    saveAnswerLocally(currentQ.id, opt);

    const supabase = createClient();
    const currentAttemptId = getAttemptId();

    if (currentAttemptId) {
      const { error } = await supabase.rpc('save_round1_answer', {
        p_attempt_id: currentAttemptId,
        p_question_id: currentQ.id,
        p_selected_option: opt,
      });
      if (!error) return;
    }

    await supabase.rpc('save_round1_answer', {
      p_team_id: session!.teamId,
      p_question_id: currentQ.id,
      p_selected_option: opt,
    });
  };

  const handleSubmit = async (isAuto = false) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setShowSubmitModal(false);

    try {
      const supabase = createClient();
      const currentAttemptId = getAttemptId();

      let res: any = null;

      if (currentAttemptId) {
        res = await supabase.rpc('submit_round1', {
          p_attempt_id: currentAttemptId,
          p_submit_type: isAuto ? 'auto_submitted' : 'submitted',
        });
      }

      if (!res || res.error) {
        res = await supabase.rpc('submit_round1', {
          p_team_id: session!.teamId,
          p_submit_type: isAuto ? 'auto_submitted' : 'submitted',
        });
      }

      if (res.error) {
        toast.error('Submission failed: ' + res.error.message);
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setConfetti(true);
      if (timerRef.current) clearInterval(timerRef.current);

      if (isAuto) {
        toast.info("Time's up! Your answers have been submitted.");
      } else {
        toast.success('Answers submitted! Well played. 🎉');
      }

      setTimeout(() => router.push('/round1/result'), 2000);
    } catch (err: any) {
      toast.error('Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!session || loading) {
    return (
      <div className="bg-canvas-cream min-h-screen flex items-center justify-center p-6 text-center">
        <Header />
        <div className="mt-20">
          <div className="w-12 h-12 border-4 border-round-1-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-headline-sm text-headline-sm text-ink-primary">Initializing MCQ Sprint Terminal...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-canvas-cream min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Header />
        <div className="mt-20 max-w-md bg-surface-card p-space-lg rounded-2xl border-2 border-ink-primary shadow-xl">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="font-headline-lg text-headline-lg text-ink-primary mb-2">Round 1 Not Active</h2>
          <p className="font-body-md text-body-md text-ink-secondary">Please wait for the host to activate Round 1 in the Admin Room.</p>
        </div>
      </div>
    );
  }

  const answeredSet = new Set(Object.keys(answers));
  const currentQuestion = questions[currentIndex];
  const selectedOption = answers[currentQuestion?.id] ?? null;
  const coveragePercent = Math.round((answeredSet.size / questions.length) * 100);

  return (
    <AntiCheatGuard teamId={session.teamId} teamName={session.teamName} roundName="Round 1">
      <ConfettiBurst trigger={confetti} />
      <div className="bg-canvas-cream font-body-md text-body-md text-ink-primary min-h-screen flex flex-col selection:bg-round-2-orange selection:text-ink-primary">
        <Header />

        <main className="w-full pt-20 bg-canvas-cream flex-grow">
          <div className="flex flex-col w-full">
            <div className="max-w-[1440px] mx-auto w-full px-margin-mobile lg:px-margin py-space-md lg:py-space-lg flex flex-col gap-space-lg">
              
              {/* TOP GAME HUD */}
              <div className="w-full bg-surface-card rounded-xl p-space-md lg:p-space-lg shadow-xl relative overflow-hidden border-2 border-ink-primary">
                {/* Decorative Backdrop Element */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md relative z-10">
                  
                  {/* Left: Stage Badge & Streak Banner */}
                  <div className="flex flex-wrap items-center gap-space-sm">
                    <div className="flex items-center gap-space-xs bg-round-1-blue text-on-primary px-space-md py-1.5 rounded-full shadow-sm border border-ink-primary">
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      <span className="font-label-ticker text-label-ticker tracking-wider uppercase">ROUND 01 — THE WARM-UP</span>
                    </div>
                    <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-1 rounded-full border border-ink-primary">
                      <span className="material-symbols-outlined text-currency-gold text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                      <span className="font-body-sm text-body-sm font-bold text-ink-primary">Your neurons are cooking</span>
                      <span className="inline-block bg-round-3-pink text-on-tertiary font-label-sticker text-label-sticker px-1.5 py-0.5 rounded-full rotate-2">BIG BRAIN ZONE</span>
                    </div>
                  </div>

                  {/* Center: Question Count & Segmented Progress */}
                  <div className="w-full lg:w-1/3 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between font-label-ticker text-label-ticker text-ink-secondary">
                      <span className="text-ink-primary font-bold">
                        QUESTION <span className="text-round-1-blue">{String(currentIndex + 1).padStart(2, '0')}</span> / {questions.length}
                      </span>
                      <span>{coveragePercent}% COMPLETED</span>
                    </div>
                    <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden p-0.5 border border-ink-primary">
                      <div
                        className="h-full bg-round-1-blue rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(3, (answeredSet.size / questions.length) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Right: Animated Timer Cockpit */}
                  <div className="flex items-center gap-space-sm self-end lg:self-auto bg-surface-container-high px-space-md py-2 rounded-xl border-2 border-ink-primary shadow-sm">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-round-1-blue text-on-primary border border-ink-primary">
                      <span className="material-symbols-outlined text-[22px]">timer</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-display-xl-mobile text-display-xl-mobile leading-none font-black text-ink-primary tracking-tight">
                        {formatTimer(timeRemaining)}
                      </span>
                      <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase">Tick. Tock. Think.</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* MAIN COCKPIT: Split 8:4 Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                
                {/* QUESTION & OPTIONS CONTAINER (8 Columns) */}
                <section className="lg:col-span-8 flex flex-col gap-space-md">
                  
                  {/* Large Interactive Question Card */}
                  <div className="bg-surface-card rounded-xl p-space-lg lg:p-space-xl shadow-xl flex flex-col gap-space-lg relative border-2 border-ink-primary">
                    
                    {/* Category Pill & Points Multiplier */}
                    <div className="flex items-center justify-between flex-wrap gap-space-sm">
                      <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-1 rounded-lg border border-ink-primary">
                        <span className="material-symbols-outlined text-round-1-blue text-[18px]">dns</span>
                        <span className="font-label-code text-label-code text-round-1-blue uppercase tracking-wide">
                          JAVA + DATA STRUCTURES &amp; ALGORITHMS
                        </span>
                      </div>
                      <div className="flex items-center gap-space-xs bg-currency-gold/20 text-on-secondary-container px-space-sm py-1 rounded-full border border-ink-primary">
                        <span className="material-symbols-outlined text-currency-gold text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                        <span className="font-label-sticker text-label-sticker">+100 PTS</span>
                      </div>
                    </div>

                    {/* Prompt */}
                    <div className="flex flex-col gap-space-xs">
                      <FormattedQuestion text={currentQuestion.question_text} />
                      <p className="font-body-md text-body-md text-ink-secondary mt-1">
                        Select the singular correct answer for this challenge.
                      </p>
                    </div>

                    {/* 4 Interactive Option Cards */}
                    <div className="grid grid-cols-1 gap-space-sm pt-space-xs" id="mcq-options">
                      {OPTIONS.map((opt) => {
                        const isSelected = selectedOption === opt;
                        const optionText = (currentQuestion as any)[`option_${opt.toLowerCase()}`];
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className={`group w-full text-left p-space-md rounded-xl transition-all duration-150 flex items-center justify-between gap-space-md border-2 border-ink-primary cursor-pointer ${
                              isSelected
                                ? 'bg-round-1-blue text-on-primary shadow-lg transform translate-x-1'
                                : 'bg-surface-container-low hover:bg-surface-container text-ink-primary shadow-sm hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center gap-space-md">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-label-code text-label-code font-extrabold border border-ink-primary ${
                                isSelected ? 'bg-on-primary text-round-1-blue shadow-sm' : 'bg-surface-container text-ink-secondary group-hover:bg-surface-card'
                              }`}>
                                {opt}
                              </div>
                              <div className="flex flex-col">
                                <span className={`font-headline-sm text-headline-sm font-bold ${isSelected ? 'text-on-primary' : 'text-ink-primary'}`}>
                                  {optionText}
                                </span>
                              </div>
                            </div>

                            <div>
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 bg-surface-container-lowest text-round-1-blue font-label-sticker text-label-sticker px-2.5 py-1 rounded-full font-black border border-ink-primary">
                                  <span className="material-symbols-outlined text-[16px] font-bold">check_circle</span>
                                  LOCKED IN
                                </span>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center opacity-40 group-hover:opacity-100 border border-ink-primary">
                                  <span className="w-2 h-2 rounded-full bg-ink-secondary"></span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Bottom Action Deck */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-md mt-space-sm border-t border-surface-container">
                      <button
                        type="button"
                        onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                        disabled={currentIndex === 0}
                        className="w-full sm:w-auto px-space-lg py-space-sm rounded-xl font-label-ticker text-label-ticker text-ink-secondary bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center gap-space-xs border border-ink-primary disabled:opacity-40 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        PREVIOUS
                      </button>
                      <div className="flex items-center gap-space-sm w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setShowSubmitModal(true)}
                          className="flex-1 sm:flex-initial px-space-md py-space-sm rounded-xl font-label-ticker text-label-ticker text-round-2-orange bg-surface-container-low hover:bg-surface-container font-extrabold transition-colors border border-ink-primary cursor-pointer"
                        >
                          SUBMIT QUIZ
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                          disabled={currentIndex === questions.length - 1}
                          className="flex-1 sm:flex-initial px-space-xl py-space-md rounded-xl font-headline-sm text-headline-sm font-black bg-round-1-blue text-on-primary shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-space-xs border-2 border-ink-primary disabled:opacity-40 cursor-pointer"
                        >
                          NEXT QUESTION
                          <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Humorous Footer Tip Card */}
                  <div className="p-space-md bg-surface-container rounded-xl flex items-center gap-space-sm border-2 border-ink-primary">
                    <div className="w-8 h-8 rounded-full bg-round-2-orange/20 text-round-2-orange flex items-center justify-center flex-shrink-0 border border-ink-primary">
                      <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-ink-secondary italic">
                      “Trust your first instinct. Your second instinct is usually imposter syndrome.”
                    </p>
                  </div>
                </section>

                {/* SIDEBAR: SPRINT RADAR & MINI NAVIGATOR (4 Columns) */}
                <aside className="lg:col-span-4 flex flex-col gap-space-md">
                  
                  {/* Live Team Pulse Card */}
                  <div className="bg-surface-card rounded-xl p-space-md shadow-xl flex flex-col gap-space-md border-2 border-ink-primary">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-round-1-blue text-[20px]">leaderboard</span>
                        <span className="font-label-ticker text-label-ticker text-ink-primary uppercase">Sprint Overview</span>
                      </div>
                      <span className="font-label-sticker text-label-sticker bg-status-correct/15 text-status-correct px-2 py-0.5 rounded-full font-bold border border-ink-primary">ONLINE SYNC</span>
                    </div>
                    <div className="grid grid-cols-3 gap-space-xs text-center">
                      <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col border border-ink-primary">
                        <span className="font-headline-md text-headline-md font-extrabold text-status-correct">{String(answeredSet.size).padStart(2, '0')}</span>
                        <span className="font-label-sticker text-label-sticker text-ink-secondary">ANSWERED</span>
                      </div>
                      <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col border border-ink-primary">
                        <span className="font-headline-md text-headline-md font-extrabold text-round-1-blue">01</span>
                        <span className="font-label-sticker text-label-sticker text-ink-secondary">CURRENT</span>
                      </div>
                      <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col border border-ink-primary">
                        <span className="font-headline-md text-headline-md font-extrabold text-ink-secondary">{String(questions.length - answeredSet.size).padStart(2, '0')}</span>
                        <span className="font-label-sticker text-label-sticker text-ink-secondary">REMAINING</span>
                      </div>
                    </div>
                  </div>

                  {/* 30-Question Grid Navigator */}
                  <div className="bg-surface-card rounded-xl p-space-md shadow-xl flex flex-col gap-space-md border-2 border-ink-primary">
                    <div className="flex items-center justify-between">
                      <span className="font-label-ticker text-label-ticker text-ink-primary uppercase tracking-wide">Question Navigator</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-status-correct"></div>
                        <span className="font-label-sticker text-label-sticker text-ink-secondary">Saved</span>
                      </div>
                    </div>

                    {/* 30 Pills Mosaic Grid */}
                    <div className="grid grid-cols-6 gap-2">
                      {questions.map((q, idx) => {
                        const isAnswered = answeredSet.has(q.id);
                        const isCurrent = idx === currentIndex;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-9 rounded-lg font-label-code text-label-code font-bold flex items-center justify-center shadow-sm border border-ink-primary cursor-pointer transition-all ${
                              isCurrent
                                ? 'bg-round-1-blue text-on-primary ring-4 ring-round-1-blue/30 font-black animate-pulse'
                                : isAnswered
                                ? 'bg-status-correct text-on-primary'
                                : 'bg-surface-container text-ink-secondary hover:bg-surface-container-high'
                            }`}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigator Legend */}
                    <div className="flex items-center justify-between text-ink-secondary font-label-sticker text-label-sticker pt-space-xs border-t border-surface-container">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-status-correct inline-block"></span> Solved
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-round-1-blue inline-block"></span> Active
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-surface-container inline-block"></span> Pending
                      </span>
                    </div>
                  </div>

                  {/* Streak Incentive Decal Box */}
                  <div className="bg-round-3-purple text-on-tertiary rounded-xl p-space-md shadow-xl flex items-center gap-space-sm relative overflow-hidden border-2 border-ink-primary">
                    <div className="absolute -right-4 -bottom-4 opacity-20">
                      <span className="material-symbols-outlined text-[90px]">bolt</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-on-tertiary/20 flex items-center justify-center flex-shrink-0 border border-ink-primary">
                      <span className="material-symbols-outlined text-[28px] text-on-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>speed</span>
                    </div>
                    <div className="flex flex-col relative z-10">
                      <span className="font-headline-sm text-headline-sm font-black tracking-tight leading-snug">Speed Multiplier Active!</span>
                      <span className="font-body-sm text-body-sm opacity-90">Answer fast to trigger bonus sprint ranking.</span>
                    </div>
                  </div>

                </aside>
              </div>

            </div>
          </div>
        </main>

        <footer className="w-full bg-surface-muted border-t-2 border-ink-primary py-space-lg">
          <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex flex-col sm:flex-row items-center gap-space-sm text-center sm:text-left">
              <p className="font-headline-sm text-headline-sm text-ink-primary">Think Fast. Code Smart. Bid Smarter.</p>
              <span className="hidden sm:inline text-ink-secondary">•</span>
              <span className="font-body-sm text-body-sm text-ink-secondary">College Coding Club Platform</span>
            </div>
            <div className="inline-block px-space-sm py-1 bg-surface-card border-2 border-ink-primary rounded-full shadow-[2px_2px_0px_#0F172A] -rotate-2">
              <span className="font-label-sticker text-label-sticker text-ink-primary uppercase">Built with ⚡ &amp; caffeine</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Submit Modal Confirmation Overlay */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-ink-primary/60 backdrop-blur-sm">
          <div className="bg-surface-card text-ink-primary rounded-2xl max-w-lg w-full p-space-lg border-2 border-ink-primary shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <div className="w-10 h-10 rounded-lg bg-round-2-orange text-canvas-cream flex items-center justify-center border border-ink-primary">
                  <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md font-extrabold text-ink-primary">Ready to Submit Assessment?</h3>
                  <span className="font-body-sm text-body-sm text-ink-secondary">Once submitted, your answers are locked for evaluation.</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-muted rounded-xl p-space-md flex flex-col gap-space-sm border border-ink-primary">
              <div className="flex justify-between items-center">
                <span className="font-body-sm text-body-sm text-ink-secondary">Completed Questions:</span>
                <span className="font-headline-sm text-headline-sm font-black text-round-1-blue">{answeredSet.size} / {questions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-sm text-body-sm text-ink-secondary">Coverage:</span>
                <span className="font-label-code text-label-code font-black text-round-2-orange">{coveragePercent}%</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-xs">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-space-md py-space-sm rounded-lg bg-surface-muted hover:bg-surface-card text-ink-primary font-label-ticker text-label-ticker border-2 border-ink-primary transition-colors cursor-pointer"
              >
                GO BACK &amp; CHECK
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="px-space-lg py-space-sm rounded-lg bg-round-1-blue hover:bg-primary text-on-primary font-label-ticker text-label-ticker font-extrabold border-2 border-ink-primary shadow-md transition-all flex items-center gap-space-xs cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">rocket</span>
                <span>CONFIRM SUBMIT</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AntiCheatGuard>
  );
}
