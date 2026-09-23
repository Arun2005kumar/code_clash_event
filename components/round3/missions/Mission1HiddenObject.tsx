'use client';

// components/round3/missions/Mission1HiddenObject.tsx
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

export default function Mission1HiddenObject({ teamId, mission, attempt, onSuccess }: MissionProps) {
  const [answer, setAnswer] = useState(attempt?.submitted_answer ?? '');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const content = mission.handout_content;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 1, answer);
    setLoading(false);

    if (res.is_correct && res.clue_piece) {
      setSolved(true);
      setCluePiece(res.clue_piece);
      onSuccess(res.clue_piece);
      toast.success('Mission 1 Clear! Clue #1 revealed.');
    } else {
      const msgs = [
        "Nope. The vault laughed.",
        "Try again. Your code has bugs.",
        "Close... but also not close.",
        "The hacker says: nice try 😏"
      ];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      setErrorMsg(randomMsg);
      toast.error('Incorrect answer. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          EASY • {mission.time_estimate}
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary">MISSION 01</span>
      </div>

      <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
        {mission.title}
      </h1>

      <p className="font-body-md text-body-md text-ink-secondary">
        {content.briefing}
      </p>

      {/* Handout lines */}
      <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary font-label-code text-body-md space-y-2 shadow-inner">
        {content.lines?.map((line, idx) => (
          <div key={idx} className="text-ink-primary font-semibold">
            {line}
          </div>
        ))}
      </div>

      <div className="p-space-sm bg-surface-muted rounded-lg font-label-sticker text-label-sticker text-ink-secondary">
        {content.instruction}
      </div>

      {solved ? (
        <ClueReveal missionNumber={1} cluePiece={cluePiece} nextMissionNumber={2} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm mt-space-sm">
          <label className="font-headline-sm text-label-ticker text-ink-primary">
            ENTER THE 6-LETTER WORD
          </label>
          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="e.g. candle"
              className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary uppercase tracking-wider focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !answer.trim()}
              className="px-space-lg py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'CHECKING...' : 'SUBMIT ANSWER →'}
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
        missionNumber={1}
        hints={content.hints}
        initialHintCount={attempt?.hint_count ?? 0}
      />
    </div>
  );
}
