'use client';

// components/round3/missions/Mission3LogicBoxes.tsx — Mission 03: THE HACKER'S SWITCHBOARD
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

const SIGNAL_EQUATIONS = [
  'A + A = 8',
  'B + B = 14',
  'C + C = 4',
  'D + D = 18',
];

export default function Mission3LogicBoxes({ teamId, mission, attempt, onSuccess, isExpired = false }: MissionProps) {
  const [codeInput, setCodeInput] = useState(attempt?.submitted_answer ?? '');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirmAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim() || solved || isExpired || loading) return;
    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 3, codeInput.trim());
    setLoading(false);

    if (res.is_correct) {
      setSolved(true);
      const piece = res.clue_piece ?? '2497';
      setCluePiece(piece);
      onSuccess(piece);
      toast.success('SIGNAL DECODED! Key #3 recovered.');
    } else {
      setErrorMsg('SIGNAL REJECTED: The decoded sequence is incorrect. Recheck the letter-to-number mapping.');
      toast.error('Signal rejected. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          MODERATE • EST. SOLVE TIME: 4–6 MIN
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary font-bold">MISSION 03</span>
      </div>

      <div>
        <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
          THE HACKER&apos;S SWITCHBOARD
        </h1>
        <p className="font-body-md text-body-md text-ink-secondary font-medium mt-1">
          📡 INTERCEPTED SIGNAL: A scrambled signal has been intercepted. The system uses letters as numeric codes. Discover the hidden mapping and decode the final transmission.
        </p>
      </div>

      {isExpired && (
        <div className="p-space-sm bg-status-wrong text-white rounded-lg font-headline-sm text-headline-sm font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex items-center justify-center gap-space-xs uppercase">
          <span className="material-symbols-outlined text-[22px]">timer_off</span>
          <span>TIME EXPIRED — SUBMISSIONS DISABLED</span>
        </div>
      )}

      {/* Signal Display Box */}
      <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-sm flex flex-col gap-space-md">
        <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase font-bold tracking-wider block">
          INTERCEPTED EQUATIONS:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm font-label-code text-headline-sm text-ink-primary font-black">
          {SIGNAL_EQUATIONS.map((eq, idx) => (
            <div key={idx} className="p-space-sm bg-surface-card rounded-lg border-2 border-ink-primary text-center shadow-xs">
              {eq}
            </div>
          ))}
        </div>

        <div className="p-space-md bg-round-3-purple/10 rounded-xl border-2 border-round-3-purple flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <span className="font-headline-sm text-headline-sm font-black text-ink-primary uppercase">
            TARGET TRANSMISSION TO DECODE:
          </span>
          <span className="font-display-xl text-headline-lg text-round-3-purple font-black tracking-widest bg-surface-card px-space-md py-1 rounded-lg border-2 border-ink-primary shadow-xs">
            C A D B
          </span>
        </div>
      </div>

      {solved ? (
        <div className="p-space-lg bg-surface-card rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] flex flex-col gap-space-md animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <div className="px-space-md py-space-xs bg-status-correct text-on-tertiary rounded-full font-headline-sm text-headline-sm font-black inline-flex items-center gap-space-xs shadow-xs animate-bounce">
              <span className="material-symbols-outlined text-[20px]">verified</span>
              <span>✓ SIGNAL DECODED!</span>
            </div>
            <div className="px-space-sm py-space-xs bg-status-correct/15 text-status-correct rounded-md font-label-sticker text-label-sticker font-extrabold border border-status-correct/30">
              🔑 KEY #3 RECOVERED
            </div>
          </div>

          <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary flex flex-col gap-space-xs shadow-inner">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm font-black text-ink-primary uppercase">
                DECODED CODE:
              </span>
              <span className="font-display-xl text-headline-lg text-status-correct font-black bg-surface-card px-space-md py-0.5 rounded border border-ink-primary shadow-xs">
                2497
              </span>
            </div>
            <div className="flex items-center gap-space-xs text-status-correct font-headline-sm text-label-ticker font-bold mt-2 pt-2 border-t border-ink-primary/20">
              <span>Mission 3 complete. MISSION 04 UNLOCKED</span>
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
              href="/round3/mission/4"
              className="flex-1 py-space-sm px-space-md bg-round-3-pink hover:bg-round-3-pink/90 text-on-tertiary font-headline-sm text-label-ticker rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary flex items-center justify-center gap-space-xs text-center font-black"
            >
              <span>PROCEED TO MISSION 04 →</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConfirmAnswer} className="flex flex-col gap-space-sm mt-space-xs">
          <label className="font-headline-sm text-headline-sm text-ink-primary font-black uppercase">
            Enter the 4-digit code
          </label>

          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              maxLength={4}
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              placeholder="ENTER 4-DIGIT CODE"
              disabled={isExpired || loading}
              className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary tracking-widest focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!codeInput.trim() || loading || isExpired}
              className="px-space-xl py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer font-black shrink-0"
            >
              {loading ? 'CHECKING...' : 'CONFIRM CODE →'}
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
        missionNumber={3}
        hints={mission.handout_content.hints ?? [
          'Divide each letter sum by 2 to find its numeric value.',
          'A = 4, B = 7, C = 2, D = 9. Now write out C A D B.'
        ]}
        initialHintCount={attempt?.hint_count ?? 0}
        isExpired={isExpired}
      />
    </div>
  );
}
