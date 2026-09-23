'use client';

// components/round3/missions/Mission4CaesarCipher.tsx
import { useState } from 'react';
import { validateMissionAnswerServer } from '@/lib/round3/missions';
import ClueReveal from '../ClueReveal';
import HintSystem from '../HintSystem';
import { Round3Mission, Round3MissionAttempt } from '@/types';
import { toast } from 'sonner';

interface MissionProps {
  teamId: string;
  mission: Round3Mission;
  attempt?: Round3MissionAttempt;
  onSuccess: (clue: string) => void;
}

export default function Mission4CaesarCipher({ teamId, mission, attempt, onSuccess }: MissionProps) {
  const [showWheel, setShowWheel] = useState(false);
  const [answer, setAnswer] = useState(attempt?.submitted_answer ?? '');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const content = mission.handout_content;
  const encoded = content.encoded ?? ['K', 'D', 'F', 'N'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 4, answer);
    setLoading(false);

    if (res.is_correct && res.clue_piece) {
      setSolved(true);
      setCluePiece(res.clue_piece);
      onSuccess(res.clue_piece);
      toast.success('Mission 4 Clear! Clue #4 revealed.');
    } else {
      setErrorMsg('Incorrect count. Decode the letters (K-3=H, D-3=A, F-3=C, N-3=K) and enter total letter count!');
      toast.error('Incorrect. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-pink/15 text-round-3-pink rounded-md font-label-sticker text-label-sticker font-bold">
          MODERATE • {mission.time_estimate}
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary">MISSION 04</span>
      </div>

      <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
        {mission.title}
      </h1>

      <p className="font-body-md text-body-md text-ink-secondary">
        {content.briefing}
      </p>

      {/* Encoded Letter Tiles */}
      <div className="my-space-sm p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-sm flex flex-col items-center gap-space-md">
        <div className="flex items-center justify-between w-full">
          <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase">
            Encoded Intercept Stream:
          </span>
          <span className="font-label-sticker text-label-sticker text-round-3-purple font-bold">
            ALGORITHM: CHAR - 3
          </span>
        </div>

        <div className="grid grid-cols-4 gap-space-md sm:gap-space-lg w-full max-w-md">
          {encoded.map((char, idx) => (
            <div key={idx} className="flex flex-col items-center gap-space-xs">
              <div className="w-full aspect-square bg-surface-card rounded-xl border-2 border-ink-primary shadow-md flex flex-col items-center justify-center">
                <span className="font-display-xl text-display-xl text-ink-primary font-black">
                  {char}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle Reference Strip */}
      <button
        type="button"
        onClick={() => setShowWheel(!showWheel)}
        className="inline-flex items-center justify-between w-full px-space-md py-space-sm bg-surface-container rounded-lg text-ink-primary font-headline-sm text-label-ticker border-2 border-ink-primary shadow-sm hover:bg-surface-container-high transition-colors"
      >
        <span className="inline-flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          📖 ALPHABET REFERENCE STRIP
        </span>
        <span className={`material-symbols-outlined text-[18px] transition-transform ${showWheel ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {showWheel && (
        <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-inner overflow-x-auto">
          <div className="flex items-center justify-between gap-1 min-w-[580px] text-center font-label-code text-body-sm">
            {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((letter, idx) => (
              <div
                key={letter}
                className={`flex flex-col p-1 rounded shadow-xs w-7 border ${
                  ['H','A','C','K'].includes(letter)
                    ? 'bg-round-3-purple text-on-tertiary border-ink-primary font-bold scale-105'
                    : ['K','D','F','N'].includes(letter)
                    ? 'bg-round-2-orange text-on-secondary border-ink-primary font-bold'
                    : 'bg-surface-card border-ink-primary text-ink-primary'
                }`}
              >
                <span className="text-[10px] opacity-75">{idx + 1}</span>
                <strong>{letter}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {solved ? (
        <ClueReveal missionNumber={4} cluePiece={cluePiece} nextMissionNumber={5} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm mt-space-sm">
          <label className="font-headline-sm text-label-ticker text-ink-primary">
            {content.question}
          </label>
          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="e.g. 4"
              className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary tracking-wider focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !answer.trim()}
              className="px-space-lg py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'CHECKING...' : 'DECODE & SUBMIT →'}
            </button>
          </div>

          {errorMsg && (
            <div className="p-space-sm bg-status-wrong/10 text-status-wrong rounded-lg font-label-sticker text-label-sticker font-bold border border-status-wrong/30">
              ⚠️ {errorMsg}
            </div>
          )}
        </form>
      )}

      <HintSystem
        teamId={teamId}
        missionNumber={4}
        hints={content.hints}
        initialHintCount={attempt?.hint_count ?? 0}
      />
    </div>
  );
}
