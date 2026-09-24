'use client';

// components/round3/HintSystem.tsx
import { useState } from 'react';
import { incrementHintCountServer } from '@/lib/round3/hints';
import { toast } from 'sonner';

interface HintSystemProps {
  teamId: string;
  missionNumber: number;
  hints: string[];
  initialHintCount?: number;
  isExpired?: boolean;
}

export default function HintSystem({ teamId, missionNumber, hints, initialHintCount = 0, isExpired = false }: HintSystemProps) {
  const [hintCount, setHintCount] = useState(initialHintCount);
  const [loading, setLoading] = useState(false);

  const handleRevealHint = async () => {
    if (hintCount >= hints.length || isExpired) return;
    setLoading(true);
    const success = await incrementHintCountServer(teamId, missionNumber);
    setLoading(false);
    if (success) {
      setHintCount(prev => prev + 1);
      toast.info(`Hint #${hintCount + 1} revealed (+30s penalty added to finish time).`);
    } else {
      toast.error('Failed to reveal hint.');
    }
  };

  return (
    <div className="flex flex-col gap-space-sm mt-space-md border-t-2 border-surface-muted pt-space-md">
      <div className="flex items-center justify-between">
        <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase">
          HINT SYSTEM ({hintCount} / {hints.length} USED)
        </span>
        {hintCount < hints.length && (
          <button
            type="button"
            onClick={handleRevealHint}
            disabled={loading || isExpired}
            className="inline-flex items-center gap-space-xs text-ink-primary hover:text-round-2-orange font-label-sticker text-label-sticker transition-colors cursor-pointer bg-round-2-amber/15 px-space-sm py-1 rounded-md border border-round-2-amber/40 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] text-round-2-orange">lightbulb</span>
            <span>{loading ? 'REVEALING...' : `💡 REVEAL HINT #${hintCount + 1} (+30 SEC PENALTY)`}</span>
          </button>
        )}
      </div>

      {hintCount > 0 && (
        <div className="flex flex-col gap-space-xs">
          {hints.slice(0, hintCount).map((hintText, idx) => (
            <div
              key={idx}
              className="p-space-sm bg-round-2-amber/15 text-ink-primary rounded-lg font-body-sm text-body-sm shadow-xs flex items-start gap-space-sm border border-round-2-amber/30"
            >
              <span className="material-symbols-outlined text-round-2-orange text-[20px] shrink-0 mt-0.5">
                info
              </span>
              <div>
                <strong className="text-round-2-orange">Hint #{idx + 1}:</strong> {hintText}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
