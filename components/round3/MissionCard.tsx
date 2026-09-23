'use client';

// components/round3/MissionCard.tsx
import Link from 'next/link';
import { Round3Mission, Round3MissionAttempt } from '@/types';

interface MissionCardProps {
  mission: Round3Mission;
  attempt?: Round3MissionAttempt;
}

export default function MissionCard({ mission, attempt }: MissionCardProps) {
  const isSolved = attempt?.is_correct ?? false;
  const cluePiece = attempt?.clue_piece_revealed;

  return (
    <article
      className={`flex flex-col justify-between p-space-md rounded-xl shadow-[3px_3px_0px_#0F172A] relative overflow-hidden transition-all group ${
        isSolved
          ? 'bg-surface-card'
          : 'bg-surface-card border-2 border-ink-primary hover:-translate-y-0.5'
      }`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          isSolved ? 'bg-status-correct' : 'bg-round-3-purple'
        }`}
      />
      <div>
        {/* Header info */}
        <div className="flex items-center justify-between gap-space-xs mb-space-sm">
          <span
            className={`px-space-sm py-space-xs rounded-md font-label-sticker text-label-sticker font-bold ${
              isSolved
                ? 'bg-status-correct/15 text-status-correct'
                : 'bg-round-3-purple/15 text-round-3-purple'
            }`}
          >
            {mission.difficulty.toUpperCase()} • {mission.time_estimate}
          </span>
          {isSolved ? (
            <span className="inline-flex items-center gap-1 font-label-sticker text-label-sticker text-status-correct font-bold">
              <span className="material-symbols-outlined text-[16px]">check_circle</span> CLUE FOUND
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-label-sticker text-label-sticker text-round-3-purple font-extrabold bg-round-3-purple/10 px-2 py-0.5 rounded-full">
              AVAILABLE ⚡
            </span>
          )}
        </div>

        {/* Mission ID & Title */}
        <div className="flex items-center gap-space-xs mb-space-xs">
          <span className="font-label-code text-label-sticker text-round-3-purple font-bold">
            M-0{mission.mission_number}
          </span>
          <h2 className="font-headline-sm text-headline-sm text-ink-primary font-black uppercase">
            {mission.title}
          </h2>
        </div>

        <p className="font-body-md text-body-sm text-ink-secondary mb-space-md line-clamp-2">
          {mission.handout_content.briefing}
        </p>

        {/* Clue Box */}
        {isSolved ? (
          <div className="p-space-sm bg-status-correct/10 rounded-lg flex items-center justify-between mb-space-md shadow-sm border border-status-correct/30">
            <div className="flex items-center gap-space-xs font-label-code text-label-code text-ink-primary">
              <span className="text-round-2-amber">🔑</span>
              <span>CLUE {mission.mission_number}:</span>
              <span className="font-extrabold tracking-wider bg-surface-card px-space-xs py-0.5 rounded shadow-[1px_1px_0px_#0F172A] text-status-correct">
                {cluePiece ?? 'REVEALED'}
              </span>
            </div>
            <span className="material-symbols-outlined text-status-correct text-[18px]">verified</span>
          </div>
        ) : (
          <div className="p-space-sm bg-round-3-purple/10 rounded-lg flex items-center justify-between mb-space-md border border-round-3-purple/20">
            <div className="flex items-center gap-space-xs font-label-code text-label-code text-ink-primary">
              <span className="text-ink-secondary">🔑</span>
              <span>CLUE {mission.mission_number}:</span>
              <span className="font-bold text-round-3-purple animate-pulse">??? (Pending)</span>
            </div>
            <span className="font-label-sticker text-[10px] text-round-3-purple uppercase font-bold">UNSOLVED</span>
          </div>
        )}
      </div>

      <Link
        href={`/round3/mission/${mission.mission_number}`}
        className={`w-full py-space-sm px-space-md font-headline-sm text-label-ticker rounded-lg shadow-[2px_2px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-space-xs text-center border-2 border-ink-primary ${
          isSolved
            ? 'bg-canvas-cream hover:bg-surface-container-high text-ink-primary'
            : 'bg-round-3-purple hover:bg-tertiary-container text-on-tertiary'
        }`}
      >
        <span>{isSolved ? 'REVIEW MISSION' : 'ENTER MISSION'}</span>
        <span className="material-symbols-outlined text-[18px]">
          {isSolved ? 'visibility' : 'arrow_forward'}
        </span>
      </Link>
    </article>
  );
}
