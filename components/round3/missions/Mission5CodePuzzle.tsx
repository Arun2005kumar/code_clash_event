'use client';

// components/round3/missions/Mission5CodePuzzle.tsx — Mission 05: FIX THE PUZZLE
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

const STRIPS = [
  '1. }',
  '2. total = total * 2;',
  '3. System.out.println(total);',
  '4. int total = 1;',
  '5. for (int i = 1; i <= 3; i++) {',
];

export default function Mission5CodePuzzle({ teamId, mission, attempt, onSuccess, isExpired = false }: MissionProps) {
  const [outputInput, setOutputInput] = useState(attempt?.submitted_answer ?? '');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirmAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outputInput.trim() || solved || isExpired || loading) return;
    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 5, outputInput.trim());
    setLoading(false);

    if (res.is_correct) {
      setSolved(true);
      const piece = res.clue_piece ?? '8';
      setCluePiece(piece);
      onSuccess(piece);
      toast.success('SYSTEM RESTORED! Key #5 recovered.');
    } else {
      setErrorMsg("OUTPUT REJECTED: The system output doesn't match. Recheck the program order and trace the execution.");
      toast.error('Output rejected. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          MODERATE+ • EST. SOLVE TIME: 5–6 MIN
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary font-bold">MISSION 05</span>
      </div>

      <div>
        <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
          FIX THE PUZZLE
        </h1>
        <p className="font-body-md text-body-md text-ink-secondary font-medium mt-1">
          💻 SYSTEM FRAGMENTATION DETECTED: The final system has been corrupted. Five code fragments have been separated and shuffled. Your team must reconstruct the program in the correct order.
        </p>
      </div>

      {isExpired && (
        <div className="p-space-sm bg-status-wrong text-white rounded-lg font-headline-sm text-headline-sm font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex items-center justify-center gap-space-xs uppercase">
          <span className="material-symbols-outlined text-[22px]">timer_off</span>
          <span>TIME EXPIRED — SUBMISSIONS DISABLED</span>
        </div>
      )}

      {/* Handout & Strips Card */}
      <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-sm flex flex-col gap-space-sm">
        <div className="p-space-sm bg-round-2-amber/20 border border-round-2-amber rounded-lg font-headline-sm text-headline-sm font-black text-ink-primary flex items-center gap-space-xs">
          <span>🧩 HANDOUT REQUIRED:</span>
          <span className="font-medium text-body-md">Collect the 5 physical code strips from the Game Master and arrange them physically before submitting your answer.</span>
        </div>

        <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase font-bold tracking-wider block mt-1">
          SHUFFLED CODE STRIPS:
        </span>
        <div className="flex flex-col gap-space-xs">
          {STRIPS.map((strip, idx) => (
            <div key={idx} className="p-space-sm bg-surface-card rounded-lg border-2 border-ink-primary font-mono text-body-md font-bold text-ink-primary shadow-xs">
              {strip}
            </div>
          ))}
        </div>
      </div>

      {solved ? (
        <div className="p-space-lg bg-surface-card rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] flex flex-col gap-space-md animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <div className="px-space-md py-space-xs bg-status-correct text-on-tertiary rounded-full font-headline-sm text-headline-sm font-black inline-flex items-center gap-space-xs shadow-xs animate-bounce">
              <span className="material-symbols-outlined text-[20px]">verified</span>
              <span>✓ SYSTEM RESTORED!</span>
            </div>
            <div className="px-space-sm py-space-xs bg-status-correct/15 text-status-correct rounded-md font-label-sticker text-label-sticker font-extrabold border border-status-correct/30">
              🔑 KEY #5 RECOVERED — 5/5 KEYS ACQUIRED
            </div>
          </div>

          <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary flex flex-col gap-space-xs shadow-inner">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm font-black text-ink-primary uppercase">
                PROGRAM OUTPUT:
              </span>
              <span className="font-display-xl text-headline-lg text-status-correct font-black bg-surface-card px-space-md py-0.5 rounded border border-ink-primary shadow-xs">
                8
              </span>
            </div>
            <div className="flex items-center gap-space-xs text-status-correct font-headline-sm text-label-ticker font-bold mt-2 pt-2 border-t border-ink-primary/20">
              <span>All five mission keys have been recovered. THE FINAL VAULT IS NOW ACCESSIBLE.</span>
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
              href="/round3/vault"
              className="flex-1 py-space-sm px-space-md bg-round-3-purple hover:bg-round-3-purple/90 text-on-tertiary font-headline-sm text-label-ticker rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary flex items-center justify-center gap-space-xs text-center font-black"
            >
              <span>ENTER THE FINAL VAULT 🔓 →</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConfirmAnswer} className="flex flex-col gap-space-sm mt-space-xs">
          <label className="font-headline-sm text-headline-sm text-ink-primary font-black uppercase">
            What is the output of the reconstructed program?
          </label>

          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              value={outputInput}
              onChange={e => setOutputInput(e.target.value)}
              placeholder="ENTER OUTPUT"
              disabled={isExpired || loading}
              className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary tracking-wider focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!outputInput.trim() || loading || isExpired}
              className="px-space-xl py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer font-black shrink-0"
            >
              {loading ? 'CHECKING...' : 'CONFIRM OUTPUT →'}
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
        missionNumber={5}
        hints={mission.handout_content.hints ?? [
          'What must exist before the loop can run?',
          'The print happens once — is it inside or outside the loop?'
        ]}
        initialHintCount={attempt?.hint_count ?? 0}
        isExpired={isExpired}
      />
    </div>
  );
}
