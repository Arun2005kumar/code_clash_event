'use client';

// components/round3/missions/Mission3LogicBoxes.tsx
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

export default function Mission3LogicBoxes({ teamId, mission, attempt, onSuccess }: MissionProps) {
  const [selectedBox, setSelectedBox] = useState(attempt?.submitted_answer?.toUpperCase() ?? '');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const content = mission.handout_content;
  const boxes = content.boxes ?? [];

  const handleSelectBox = async (label: string) => {
    if (solved) return;
    setSelectedBox(label);
    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 3, label);
    setLoading(false);

    if (res.is_correct && res.clue_piece) {
      setSolved(true);
      setCluePiece(res.clue_piece);
      onSuccess(res.clue_piece);
      toast.success('Mission 3 Clear! Clue #3 revealed.');
    } else {
      setErrorMsg(`Box ${label} does not satisfy the single true statement rule. Try another box!`);
      toast.error('Incorrect box. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          MODERATE • {mission.time_estimate}
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary">MISSION 03</span>
      </div>

      <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
        {mission.title}
      </h1>

      <p className="font-body-md text-body-md text-ink-secondary">
        {content.briefing}
      </p>

      {/* 4 Interactive Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md my-space-sm">
        {boxes.map((box, idx) => {
          const isSelected = selectedBox === box.label;
          return (
            <button
              key={idx}
              type="button"
              disabled={solved || loading}
              onClick={() => handleSelectBox(box.label)}
              className={`p-space-md rounded-xl border-2 border-ink-primary text-left transition-all cursor-pointer flex flex-col justify-between min-h-[120px] ${
                isSelected
                  ? 'bg-round-3-purple text-on-tertiary shadow-[4px_4px_0px_#0F172A]'
                  : 'bg-canvas-cream hover:bg-surface-container-high text-ink-primary shadow-[2px_2px_0px_#0F172A]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display-xl text-headline-lg font-black">
                  BOX {box.label}
                </span>
                <span className="text-[24px]">📦</span>
              </div>
              <p className="font-headline-sm text-body-md font-bold mt-2">
                “{box.text}”
              </p>
            </button>
          );
        })}
      </div>

      {solved ? (
        <ClueReveal missionNumber={3} cluePiece={cluePiece} nextMissionNumber={4} />
      ) : (
        errorMsg && (
          <div className="p-space-sm bg-status-wrong/10 text-status-wrong rounded-lg font-label-sticker text-label-sticker font-bold border border-status-wrong/30">
            ⚠️ {errorMsg}
          </div>
        )
      )}

      <HintSystem
        teamId={teamId}
        missionNumber={3}
        hints={content.hints}
        initialHintCount={attempt?.hint_count ?? 0}
      />
    </div>
  );
}
