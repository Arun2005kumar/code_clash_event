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
}

public class Main {
    public static void main(String[] args) {
        System.out.println(test());
    }
}`;

const OPTIONS = [
  { label: 'A', text: '0' },
  { label: 'B', text: '100' },
  { label: 'C', text: '-1' },
  { label: 'D', text: '2' },
];

const HINTS = [
  'Ask yourself: when does Java evaluate the value that is being returned?',
  'The finally block executes before the method actually exits. Check whether changing the variable changes an already-evaluated return value.',
];

export default function Mission2HackerReceipt({ teamId, mission, attempt, onSuccess, isExpired = false }: MissionProps) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const content = mission.handout_content;

  const handleSelectOption = (label: string) => {
    if (solved || isExpired || loading) return;
    setSelectedOption(label);
    setErrorMsg('');
  };

  const handleConfirmAnswer = async () => {
    if (!selectedOption || solved || isExpired || loading) return;
    setLoading(true);
    setErrorMsg('');

    // Call server validation
    const res = await validateMissionAnswerServer(teamId, 2, selectedOption);
    setLoading(false);

    const isCorrect = res.is_correct || selectedOption.toUpperCase() === 'A';

    if (isCorrect) {
      setSolved(true);
      const piece = res.clue_piece ?? '0';
      setCluePiece(piece);
      onSuccess(piece);
      toast.success('Mission 2 Clear! Trap Disarmed.');
    } else {
      setErrorMsg('✕ INCORRECT\nRe-check what happens between return and finally.');
      toast.error('Incorrect answer. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          MODERATE • EST. SOLVE TIME • 3–4 MIN
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary font-bold">MISSION 02</span>
      </div>

      <div>
        <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
          THE RETURN TRAP
        </h1>
        <p className="font-body-md text-body-md text-ink-secondary font-medium mt-1">
          &quot;The hacker left a program behind. Something happens between return and the actual exit. Predict exactly what the program prints.&quot;
        </p>
      </div>

      {isExpired && (
        <div className="p-space-sm bg-status-wrong text-white rounded-lg font-headline-sm text-headline-sm font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex items-center justify-center gap-space-xs uppercase">
          <span className="material-symbols-outlined text-[22px]">timer_off</span>
          <span>TIME EXPIRED — SUBMISSIONS DISABLED</span>
        </div>
      )}

      {/* Code Editor Container */}
      <div className="p-space-md bg-ink-primary text-surface rounded-xl font-label-code text-body-sm shadow-inner border-2 border-ink-primary overflow-x-auto leading-relaxed">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface/20 text-ink-secondary font-bold text-xs uppercase tracking-wider">
          <span>PROGRAM_ANALYSIS.JAVA</span>
          <span>JAVA SE 17</span>
        </div>
        <pre className="text-surface font-mono selection:bg-round-3-purple">
          <code>{JAVA_CODE_SNIPPET}</code>
        </pre>
      </div>

      {/* If Solved: Show Success State */}
      {solved ? (
        <div className="p-space-lg bg-surface-card rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] flex flex-col gap-space-md animate-fadeIn">
          {/* Banner */}
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <div className="px-space-md py-space-xs bg-status-correct text-on-tertiary rounded-full font-headline-sm text-headline-sm font-black inline-flex items-center gap-space-xs shadow-xs animate-bounce">
              <span className="material-symbols-outlined text-[20px]">verified</span>
              <span>✓ TRAP DISARMED!</span>
            </div>
            <div className="px-space-sm py-space-xs bg-status-correct/15 text-status-correct rounded-md font-label-sticker text-label-sticker font-extrabold border border-status-correct/30">
              2/5 KEYS RECOVERED
            </div>
          </div>

          {/* Decrypted Output & Explanation */}
          <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary flex flex-col gap-space-xs shadow-inner">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm font-black text-ink-primary uppercase">
                OUTPUT:
              </span>
              <span className="font-display-xl text-headline-lg text-status-correct font-black bg-surface-card px-space-md py-0.5 rounded border border-ink-primary shadow-xs">
                0
              </span>
            </div>
            <p className="font-body-md text-body-md text-ink-primary font-medium mt-1">
              The return value is evaluated before <code className="bg-surface-card px-1 rounded font-mono font-bold text-round-3-purple">finally</code> changes result to 100.
            </p>
            <div className="flex items-center gap-space-xs text-status-correct font-headline-sm text-label-ticker font-bold mt-2 pt-2 border-t border-ink-primary/20">
              <span>🔑 KEY #2 RECOVERED</span>
            </div>
          </div>

          {/* Action Navigation */}
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
        <>
          {/* Question Label */}
          <div className="font-headline-sm text-headline-sm text-ink-primary font-black uppercase">
            What will this program print?
          </div>

          {/* 4 Interactive Option Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md my-space-xs">
            {OPTIONS.map(opt => {
              const isSelected = selectedOption === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  disabled={solved || isExpired || loading}
                  onClick={() => handleSelectOption(opt.label)}
                  className={`p-space-md rounded-xl border-2 border-ink-primary text-left transition-all cursor-pointer flex items-center justify-between min-h-[70px] ${
                    isSelected
                      ? 'bg-round-3-purple text-on-tertiary shadow-[4px_4px_0px_#0F172A] ring-4 ring-round-3-purple/30'
                      : 'bg-canvas-cream hover:bg-surface-container-high text-ink-primary shadow-[2px_2px_0px_#0F172A]'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-space-md">
                    <span className={`w-8 h-8 rounded-lg border-2 border-ink-primary flex items-center justify-center font-black ${
                      isSelected ? 'bg-surface-card text-ink-primary shadow-xs' : 'bg-surface-card text-ink-primary'
                    }`}>
                      {opt.label}
                    </span>
                    <span className="font-display-xl text-headline-lg font-black font-mono">
                      {opt.text}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[24px]">check_circle</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Confirmation Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-sm mt-space-xs">
            <div className="flex items-center gap-space-xs font-headline-sm text-headline-sm font-black text-ink-primary">
              <span className="text-ink-secondary uppercase font-bold text-label-ticker">SELECTION:</span>
              {selectedOption ? (
                <span className="bg-round-3-purple text-on-tertiary px-space-md py-1 rounded-lg border-2 border-ink-primary font-black shadow-[2px_2px_0px_#0F172A] text-headline-sm">
                  YOUR ANSWER: {selectedOption}
                </span>
              ) : (
                <span className="text-ink-secondary italic font-medium text-body-md">
                  Select an option above to test
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedOption || loading || isExpired}
              onClick={handleConfirmAnswer}
              className="w-full sm:w-auto px-space-xl py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer font-black shrink-0"
            >
              {loading ? 'CHECKING...' : 'CONFIRM ANSWER →'}
            </button>
          </div>

          {/* Error Message Display */}
          {errorMsg && (
            <div className="p-space-md bg-status-wrong/10 text-status-wrong rounded-xl font-headline-sm text-headline-sm font-black border border-status-wrong/30 flex flex-col gap-1">
              <div className="flex items-center gap-space-xs text-status-wrong font-black">
                <span className="material-symbols-outlined text-[22px]">cancel</span>
                <span>✕ INCORRECT</span>
              </div>
              <p className="font-body-md text-body-md text-ink-primary font-medium pl-7">
                Re-check what happens between return and finally.
              </p>
            </div>
          )}
        </>
      )}

      {/* Hints System */}
      <HintSystem
        teamId={teamId}
        missionNumber={2}
        hints={content.hints ?? HINTS}
        initialHintCount={attempt?.hint_count ?? 0}
        isExpired={isExpired}
      />
    </div>
  );
}

