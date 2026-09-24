'use client';

// components/round3/missions/Mission4CaesarCipher.tsx — Mission 04: THE SAFE CRACK
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

const SAFE_CLUES = [
  { code: '682', hint: 'One digit is correct and correctly placed' },
  { code: '614', hint: 'One digit is correct but wrongly placed' },
  { code: '206', hint: 'Two digits are correct but wrongly placed' },
  { code: '738', hint: 'Nothing is correct' },
  { code: '780', hint: 'One digit is correct but wrongly placed' },
];

export default function Mission4CaesarCipher({ teamId, mission, attempt, onSuccess, isExpired = false }: MissionProps) {
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

    const res = await validateMissionAnswerServer(teamId, 4, codeInput.trim());
    setLoading(false);

    if (res.is_correct) {
      setSolved(true);
      const piece = res.clue_piece ?? '042';
      setCluePiece(piece);
      onSuccess(piece);
      toast.success('SAFE CRACKED! Key #4 recovered.');
    } else {
      setErrorMsg('ACCESS DENIED: The security code is incorrect. Recheck the clues and try again.');
      toast.error('Access denied. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          MODERATE • EST. SOLVE TIME: 3–4 MIN
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary font-bold">MISSION 04</span>
      </div>

      <div>
        <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
          THE SAFE CRACK
        </h1>
        <p className="font-body-md text-body-md text-ink-secondary font-medium mt-1">
          🔒 SECURITY LOCK DETECTED: The next key is protected by a 3-digit security lock. Five intercepted clues reveal the combination. Crack the code before the security system locks down.
        </p>
      </div>

      {isExpired && (
        <div className="p-space-sm bg-status-wrong text-white rounded-lg font-headline-sm text-headline-sm font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex items-center justify-center gap-space-xs uppercase">
          <span className="material-symbols-outlined text-[22px]">timer_off</span>
          <span>TIME EXPIRED — SUBMISSIONS DISABLED</span>
        </div>
      )}

      {/* Clues Card */}
      <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-sm flex flex-col gap-space-sm">
        <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase font-bold tracking-wider block">
          INTERCEPTED SAFE CLUES:
        </span>
        <div className="flex flex-col gap-space-xs">
          {SAFE_CLUES.map((c, idx) => (
            <div key={idx} className="p-space-sm bg-surface-card rounded-lg border-2 border-ink-primary flex items-center gap-space-md shadow-xs">
              <span className="font-display-xl text-headline-md text-round-3-purple font-black tracking-widest px-space-sm bg-surface-container rounded border border-ink-primary">
                {c.code}
              </span>
              <span className="font-body-md text-body-md text-ink-primary font-bold">
                → {c.hint}
              </span>
            </div>
          ))}
        </div>
      </div>

      {solved ? (
        <div className="p-space-lg bg-surface-card rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] flex flex-col gap-space-md animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <div className="px-space-md py-space-xs bg-status-correct text-on-tertiary rounded-full font-headline-sm text-headline-sm font-black inline-flex items-center gap-space-xs shadow-xs animate-bounce">
              <span className="material-symbols-outlined text-[20px]">verified</span>
              <span>✓ SAFE CRACKED!</span>
            </div>
            <div className="px-space-sm py-space-xs bg-status-correct/15 text-status-correct rounded-md font-label-sticker text-label-sticker font-extrabold border border-status-correct/30">
              🔑 KEY #4 RECOVERED
            </div>
          </div>

          <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary flex flex-col gap-space-xs shadow-inner">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm font-black text-ink-primary uppercase">
                SAFE CODE:
              </span>
              <span className="font-display-xl text-headline-lg text-status-correct font-black bg-surface-card px-space-md py-0.5 rounded border border-ink-primary shadow-xs">
                042
              </span>
            </div>
            <div className="flex items-center gap-space-xs text-status-correct font-headline-sm text-label-ticker font-bold mt-2 pt-2 border-t border-ink-primary/20">
              <span>Mission 4 complete. MISSION 05 UNLOCKED</span>
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
              href="/round3/mission/5"
              className="flex-1 py-space-sm px-space-md bg-round-3-pink hover:bg-round-3-pink/90 text-on-tertiary font-headline-sm text-label-ticker rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary flex items-center justify-center gap-space-xs text-center font-black"
            >
              <span>PROCEED TO MISSION 05 →</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConfirmAnswer} className="flex flex-col gap-space-sm mt-space-xs">
          <label className="font-headline-sm text-headline-sm text-ink-primary font-black uppercase">
            Determine the 3-digit safe code
          </label>

          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              maxLength={3}
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              placeholder="3-DIGIT INPUT"
              disabled={isExpired || loading}
              className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary tracking-widest focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!codeInput.trim() || loading || isExpired}
              className="px-space-xl py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer font-black shrink-0"
            >
              {loading ? 'CRACKING...' : 'CRACK THE SAFE →'}
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
        missionNumber={4}
        hints={mission.handout_content.hints ?? [
          'Start with the clue where no digit is correct.',
          'The last clue tells you something about 0, 7 and 8.'
        ]}
        initialHintCount={attempt?.hint_count ?? 0}
        isExpired={isExpired}
      />
    </div>
  );
}
