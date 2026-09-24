'use client';

// components/round3/missions/Mission3LogicBoxes.tsx
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

export default function Mission3LogicBoxes({ teamId, mission, attempt, onSuccess, isExpired = false }: MissionProps) {
  const [selectedBox, setSelectedBox] = useState(attempt?.submitted_answer?.toUpperCase() ?? '');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const content = mission.handout_content;
  const boxes = content.boxes ?? [
    { label: 'A', text: 'The prize is here.' },
    { label: 'B', text: 'The prize is not in A.' },
    { label: 'C', text: 'The prize is not here.' },
    { label: 'D', text: 'The prize is not in C.' }
  ];

  // Box Selection (Highlight only, no auto-submit)
  const handleSelectBox = (label: string) => {
    if (solved || isExpired || loading) return;
    setSelectedBox(label);
    setErrorMsg('');
  };

  // Confirm Answer Submission
  const handleConfirmAnswer = async () => {
    if (!selectedBox || solved || isExpired || loading) return;
    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 3, selectedBox);
    setLoading(false);

    if (res.is_correct && res.clue_piece) {
      setSolved(true);
      setCluePiece(res.clue_piece);
      onSuccess(res.clue_piece);
      toast.success('Mission 3 Clear! Key #3 recovered.');
    } else {
      setErrorMsg('✕ INCORRECT');
      toast.error('Incorrect box. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          MODERATE • EST. SOLVE TIME • 4–6 MIN
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary font-bold">MISSION 03</span>
      </div>

      <div>
        <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
          {mission.title}
        </h1>
        <p className="font-body-md text-body-md text-ink-secondary font-medium mt-1">
          {content.briefing}
        </p>
      </div>

      {isExpired && (
        <div className="p-space-sm bg-status-wrong text-white rounded-lg font-headline-sm text-headline-sm font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex items-center justify-center gap-space-xs uppercase">
          <span className="material-symbols-outlined text-[22px]">timer_off</span>
          <span>TIME EXPIRED — SUBMISSIONS DISABLED</span>
        </div>
      )}

      {/* If Solved: Show compact viewport-friendly Success State */}
      {solved ? (
        <div className="p-space-lg bg-surface-card rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] flex flex-col gap-space-md animate-fadeIn">
          {/* Success Header Badges */}
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <div className="px-space-md py-space-xs bg-status-correct text-on-tertiary rounded-full font-headline-sm text-headline-sm font-black inline-flex items-center gap-space-xs shadow-xs animate-bounce">
              <span className="material-symbols-outlined text-[20px]">celebration</span>
              <span>✓ CLUE #3 FOUND!</span>
            </div>
            <div className="px-space-sm py-space-xs bg-status-correct/15 text-status-correct rounded-md font-label-sticker text-label-sticker font-extrabold border border-status-correct/30">
              3/5 KEYS RECOVERED
            </div>
          </div>

          {/* Key Unlocked Display */}
          <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary flex flex-col items-center justify-center text-center gap-1 shadow-inner">
            <div className="flex items-center gap-space-xs font-headline-sm text-headline-sm font-black text-ink-primary">
              <span className="text-[28px]">🔑</span>
              <span>KEY 03 UNLOCKED:</span>
              <span className="font-display-xl text-headline-lg text-status-correct font-black">
                “{cluePiece || 'BOX C'}”
              </span>
            </div>
            <p className="font-body-sm text-body-sm italic text-ink-secondary">
              “Logic prevails. Mainframe security node bypassed.”
            </p>
          </div>

          {/* Proceed Navigation Button */}
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
        <>
          {/* 4 Interactive Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md my-space-xs">
            {boxes.map((box, idx) => {
              const isSelected = selectedBox === box.label;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={solved || isExpired || loading}
                  onClick={() => handleSelectBox(box.label)}
                  className={`p-space-md rounded-xl border-2 border-ink-primary text-left transition-all cursor-pointer flex flex-col justify-between min-h-[120px] ${
                    isSelected
                      ? 'bg-round-3-purple text-on-tertiary shadow-[4px_4px_0px_#0F172A] ring-4 ring-round-3-purple/30'
                      : 'bg-canvas-cream hover:bg-surface-container-high text-ink-primary shadow-[2px_2px_0px_#0F172A]'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
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

          {/* Selection Bar & Confirm Answer Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-sm mt-space-xs">
            <div className="flex items-center gap-space-xs font-headline-sm text-headline-sm font-black text-ink-primary">
              <span className="text-ink-secondary uppercase font-bold text-label-ticker">SELECTION:</span>
              {selectedBox ? (
                <span className="bg-round-3-purple text-on-tertiary px-space-md py-1 rounded-lg border-2 border-ink-primary font-black shadow-[2px_2px_0px_#0F172A] text-headline-sm">
                  YOUR SELECTION: BOX {selectedBox}
                </span>
              ) : (
                <span className="text-ink-secondary italic font-medium text-body-md">
                  Click a box above to choose your answer
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedBox || loading || isExpired}
              onClick={handleConfirmAnswer}
              className="w-full sm:w-auto px-space-xl py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer font-black shrink-0"
            >
              {loading ? 'CHECKING...' : 'CONFIRM ANSWER →'}
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-space-sm bg-status-wrong/10 text-status-wrong rounded-lg font-headline-sm text-headline-sm font-black border border-status-wrong/30 flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[20px]">cancel</span>
              <span>{errorMsg}</span>
            </div>
          )}
        </>
      )}

      {/* Hints System */}
      <HintSystem
        teamId={teamId}
        missionNumber={3}
        hints={content.hints ?? []}
        initialHintCount={attempt?.hint_count ?? 0}
        isExpired={isExpired}
      />
    </div>
  );
}

