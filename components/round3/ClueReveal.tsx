'use client';

// components/round3/ClueReveal.tsx
import Link from 'next/link';

interface ClueRevealProps {
  missionNumber: number;
  cluePiece: string;
  nextMissionNumber?: number;
}

export default function ClueReveal({ missionNumber, cluePiece, nextMissionNumber }: ClueRevealProps) {
  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[4px_4px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md relative overflow-hidden my-space-md">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-status-correct/10 rounded-full blur-xl pointer-events-none" />
      
      {/* Banner & Sticker */}
      <div className="flex items-center justify-between">
        <span className="px-space-md py-space-xs bg-status-correct text-on-tertiary rounded-full font-headline-sm text-label-ticker inline-flex items-center gap-space-xs shadow-xs animate-bounce">
          <span className="material-symbols-outlined text-[18px]">celebration</span>
          ✓ CLUE #{missionNumber} FOUND!
        </span>
        <span className="font-label-sticker text-label-sticker text-ink-secondary px-space-xs py-[2px] bg-surface-muted rounded rotate-2 shadow-xs border border-ink-primary">
          ★ VERIFIED
        </span>
      </div>

      {/* Clue Token Display */}
      <div className="p-space-md bg-canvas-cream rounded-xl shadow-inner border border-ink-primary flex flex-col items-center justify-center text-center gap-space-xs">
        <span className="font-label-sticker text-label-sticker text-ink-secondary tracking-widest uppercase">
          Decrypted Cryptographic Artifact
        </span>
        <div className="flex items-center gap-space-sm mt-space-xs">
          <span className="text-[32px]">🔑</span>
          <span className="font-display-xl text-headline-lg sm:text-display-xl text-ink-primary font-black tracking-wider">
            CLUE #{missionNumber}: “{cluePiece}”
          </span>
        </div>
        <p className="font-body-sm text-body-sm italic text-ink-secondary mt-space-xs">
          “Nice. One less puzzle trying to ruin your day.”
        </p>
      </div>

      {/* C2A Buttons */}
      <div className="flex flex-col sm:flex-row gap-space-sm">
        <Link
          href="/round3"
          className="flex-1 py-space-sm px-space-md bg-canvas-cream hover:bg-surface-container-high text-ink-primary font-headline-sm text-label-ticker rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary flex items-center justify-center gap-space-xs text-center"
        >
          <span className="material-symbols-outlined text-[18px]">grid_view</span>
          <span>MISSION HUB</span>
        </Link>

        {nextMissionNumber && nextMissionNumber <= 5 ? (
          <Link
            href={`/round3/mission/${nextMissionNumber}`}
            className="flex-1 py-space-sm px-space-md bg-round-3-pink hover:bg-round-3-pink/90 text-on-tertiary font-headline-sm text-label-ticker rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary flex items-center justify-center gap-space-xs text-center"
          >
            <span>PROCEED TO MISSION 0{nextMissionNumber}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        ) : (
          <Link
            href="/round3/vault"
            className="flex-1 py-space-sm px-space-md bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-label-ticker rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary flex items-center justify-center gap-space-xs text-center animate-pulse"
          >
            <span>GO TO FINAL VAULT 🔓</span>
            <span className="material-symbols-outlined text-[18px]">lock_open</span>
          </Link>
        )}
      </div>
    </div>
  );
}
