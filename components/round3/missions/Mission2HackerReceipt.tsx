'use client';

// components/round3/missions/Mission2HackerReceipt.tsx
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

export default function Mission2HackerReceipt({ teamId, mission, attempt, onSuccess }: MissionProps) {
  const [selectedItem, setSelectedItem] = useState('');
  const [correctedPrice, setCorrectedPrice] = useState(attempt?.submitted_answer ?? '');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const content = mission.handout_content;
  const receipt = content.receipt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctedPrice.trim()) return;
    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 2, correctedPrice);
    setLoading(false);

    if (res.is_correct && res.clue_piece) {
      setSolved(true);
      setCluePiece(res.clue_piece);
      onSuccess(res.clue_piece);
      toast.success('Mission 2 Clear! Clue #2 revealed.');
    } else {
      setErrorMsg('Incorrect price calculation. Double-check the canteen receipt clues!');
      toast.error('Incorrect price. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-1-blue/15 text-round-1-blue rounded-md font-label-sticker text-label-sticker font-bold">
          EASY-MODERATE • {mission.time_estimate}
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary">MISSION 02</span>
      </div>

      <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
        {mission.title}
      </h1>

      <p className="font-body-md text-body-md text-ink-secondary">
        {content.briefing}
      </p>

      {/* Receipt Visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Receipt Slip */}
        <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary font-label-code shadow-sm">
          <div className="text-center font-bold text-headline-sm border-b-2 border-dashed border-ink-primary pb-2 mb-3">
            === {receipt?.shop} ===
          </div>
          <div className="space-y-1.5 text-body-md">
            {receipt?.items.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedItem(item.name)}
                className={`flex justify-between p-2 rounded cursor-pointer transition-colors ${
                  selectedItem === item.name
                    ? 'bg-round-2-amber/30 font-bold border border-round-2-orange'
                    : 'hover:bg-surface-muted'
                }`}
              >
                <span>{item.name}</span>
                <span>Rs. {item.price}</span>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-dashed border-ink-primary mt-3 pt-2 flex justify-between font-bold text-headline-sm text-round-3-purple">
            <span>PRINTED TOTAL</span>
            <span>Rs. {receipt?.total}</span>
          </div>
        </div>

        {/* Evidence List */}
        <div className="p-space-md bg-surface-muted rounded-xl border-2 border-ink-primary flex flex-col justify-between">
          <div>
            <span className="font-label-sticker text-label-sticker text-round-2-orange font-black block mb-2">
              INTERCEPTED EVIDENCE CLUES
            </span>
            <ul className="space-y-2 font-body-sm text-body-sm text-ink-primary">
              {content.evidence?.map((ev, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-round-2-orange font-bold">•</span>
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 p-2 bg-surface-card rounded border border-ink-primary text-xs text-ink-secondary">
            {content.question}
          </div>
        </div>
      </div>

      {solved ? (
        <ClueReveal missionNumber={2} cluePiece={cluePiece} nextMissionNumber={3} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm mt-space-sm">
          <label className="font-headline-sm text-label-ticker text-ink-primary">
            ENTER THE CORRECT ITEM PRICE (NUMERIC ONLY)
          </label>
          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              value={correctedPrice}
              onChange={e => setCorrectedPrice(e.target.value)}
              placeholder="e.g. 30"
              className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary tracking-wider focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !correctedPrice.trim()}
              className="px-space-lg py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'CHECKING...' : 'SUBMIT PRICE →'}
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
        missionNumber={2}
        hints={content.hints}
        initialHintCount={attempt?.hint_count ?? 0}
      />
    </div>
  );
}
