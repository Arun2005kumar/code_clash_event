'use client';

// components/round3/missions/Mission2HackerReceipt.tsx — Mission 02: THE RETURN TRAP
import { useState } from 'react';
import Link from 'next/link';
import { validateMissionAnswerServer } from '@/lib/round3/missions';
import HintSystem from '../HintSystem';
import { Round3Mission, Round3MissionAttempt } from '@/types';
import { toast } from 'sonner';

interface MissionProps {
  teamId: string;
  mission: Round3Mission;
  attempt?: Round3MissionAttempt;
  onSuccess: (clue: string) => void;
  isExpired?: boolean;
}

const JAVA_CODE_SNIPPET = `static int test() {
    int result = 0;

    for (int i = 0; i < 3; i++) {
        try {
            result = i;
            return result;
        } finally {
            result = 100;
        }
    }

    return -1;
}`;

export default function Mission2HackerReceipt({ teamId, mission, attempt, onSuccess, isExpired = false }: MissionProps) {
  const [answerInput, setAnswerInput] = useState(attempt?.submitted_answer ?? '');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirmAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || solved || isExpired || loading) return;
    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 2, answerInput.trim());
    setLoading(false);

    if (res.is_correct) {
      setSolved(true);
      const piece = res.clue_piece ?? '0';
      setCluePiece(piece);
      onSuccess(piece);
      toast.success('RETURN TRAP DECODED! Key #2 recovered.');
    } else {
      setErrorMsg("RETURN VALUE REJECTED: That's not the value returned by the method. Recheck the execution order and try again.");
      toast.error('Return value rejected. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          MODERATE • EST. SOLVE TIME: 3–4 MIN
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary font-bold">MISSION 02</span>
      </div>

      <div>
        <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
          THE RETURN TRAP
        </h1>
        <p className="font-body-md text-body-md text-ink-secondary font-medium mt-1">
          ⚠️ SYSTEM ALERT: A piece of code has been intercepted from the system. The code contains a trap involving return and finally. Your task is to determine exactly what the program returns.
        </p>
      </div>

      {isExpired && (
        <div className="p-space-sm bg-status-wrong text-white rounded-lg font-headline-sm text-headline-sm font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex items-center justify-center gap-space-xs uppercase">
          <span className="material-symbols-outlined text-[22px]">timer_off</span>
          <span>TIME EXPIRED — SUBMISSIONS DISABLED</span>
        </div>
      )}

      {/* Code Editor Container */}
      <div className="p-space-md bg-slate-900 text-slate-100 rounded-xl font-mono text-sm shadow-inner border-2 border-slate-900 overflow-x-auto leading-relaxed">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700 text-slate-400 font-bold text-xs uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="ml-2 font-mono">PROGRAM_ANALYSIS.JAVA</span>
          </span>
          <span>JAVA SE 17</span>
        </div>
        <pre className="text-emerald-400 font-mono text-base font-bold whitespace-pre p-3 bg-slate-950 rounded-lg border border-slate-800 selection:bg-purple-600 selection:text-white">
          <code>{JAVA_CODE_SNIPPET}</code>
        </pre>
      </div>

      {solved ? (
        <div className="p-space-lg bg-surface-card rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] flex flex-col gap-space-md animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <div className="px-space-md py-space-xs bg-status-correct text-on-tertiary rounded-full font-headline-sm text-headline-sm font-black inline-flex items-center gap-space-xs shadow-xs animate-bounce">
              <span className="material-symbols-outlined text-[20px]">verified</span>
              <span>✓ RETURN TRAP DECODED!</span>
            </div>
            <div className="px-space-sm py-space-xs bg-status-correct/15 text-status-correct rounded-md font-label-sticker text-label-sticker font-extrabold border border-status-correct/30">
              🔑 KEY #2 RECOVERED
            </div>
          </div>

          <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary flex flex-col gap-space-xs shadow-inner">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm font-black text-ink-primary uppercase">
                RETURN VALUE:
              </span>
              <span className="font-display-xl text-headline-lg text-status-correct font-black bg-surface-card px-space-md py-0.5 rounded border border-ink-primary shadow-xs">
                0
              </span>
            </div>
            <div className="flex items-center gap-space-xs text-status-correct font-headline-sm text-label-ticker font-bold mt-2 pt-2 border-t border-ink-primary/20">
              <span>Mission 2 complete. MISSION 03 UNLOCKED</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-space-sm pt-space-xs">
            <Link
              href="/round3"
              className="flex-1 py-space-sm px-space-md bg-canvas-cream hover:bg-surface-container-high text-ink-primary font-headline-sm text-label-ticker rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary flex items-center justify-center gap-space-xs text-center font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              <span>MISSION HUB</span>
            </Link>
            <Link
              href="/round3/mission/3"
              className="flex-1 py-space-sm px-space-md bg-round-3-pink hover:bg-round-3-pink/90 text-on-tertiary font-headline-sm text-label-ticker rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary flex items-center justify-center gap-space-xs text-center font-black"
            >
              <span>PROCEED TO MISSION 03 →</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConfirmAnswer} className="flex flex-col gap-space-sm mt-space-xs">
          <label className="font-headline-sm text-headline-sm text-ink-primary font-black uppercase">
            What value does test() return?
          </label>

          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              value={answerInput}
              onChange={e => setAnswerInput(e.target.value)}
              placeholder="ENTER NUMERIC ANSWER"
              disabled={isExpired || loading}
              className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary tracking-wider focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!answerInput.trim() || loading || isExpired}
              className="px-space-xl py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer font-black shrink-0"
            >
              {loading ? 'CHECKING...' : 'CONFIRM ANSWER →'}
            </button>
          </div>

          {errorMsg && (
            <div className="p-space-md bg-status-wrong/10 text-status-wrong rounded-xl font-headline-sm text-headline-sm font-black border border-status-wrong/30">
              🚨 {errorMsg}
            </div>
          )}
        </form>
      )}

      <HintSystem
        teamId={teamId}
        missionNumber={2}
        hints={mission.handout_content.hints ?? [
          'Ask yourself: when does Java evaluate the value that is being returned?',
          'The finally block executes before the method actually exits. Check whether changing the variable changes an already-evaluated return value.'
        ]}
        initialHintCount={attempt?.hint_count ?? 0}
        isExpired={isExpired}
      />
    </div>
  );
}
