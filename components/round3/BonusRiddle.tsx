'use client';

// components/round3/BonusRiddle.tsx
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface BonusRiddleProps {
  teamId: string;
}

export default function BonusRiddle({ teamId }: BonusRiddleProps) {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showHint1, setShowHint1] = useState(false);
  const [showHint2, setShowHint2] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setLoading(true);

    const normalized = answer.replace(/\s+/g, '');
    const isCorrect = normalized === '312211';

    const supabase = createClient();
    await supabase.from('round3_bonus_attempts').insert({
      team_id: teamId,
      submitted_answer: answer,
      is_correct: isCorrect,
    });

    setLoading(false);

    if (isCorrect) {
      setSolved(true);
      toast.success('⚡ GENIUS! Bonus Riddle Solved!');
    } else {
      toast.error('Incorrect bonus sequence answer. Try again!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-surface-card rounded-xl p-space-lg shadow-[4px_4px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md my-space-lg">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-currency-gold/20 text-on-secondary-fixed rounded-md font-label-sticker text-label-sticker font-bold border border-currency-gold/40">
          ⚡ BONUS TIEBREAKER RIDDLE
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary font-bold">LOOK-AND-SAY</span>
      </div>

      <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
        THE NUMERICAL SEQUENCE
      </h1>

      <p className="font-body-md text-body-md text-ink-secondary">
        Observe the pattern carefully and enter the next line in the sequence.
      </p>

      {/* Sequence Box */}
      <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary font-label-code text-headline-sm text-center space-y-2 shadow-inner">
        <div>1</div>
        <div>1 1</div>
        <div>2 1</div>
        <div>1 2 1 1</div>
        <div>1 1 1 2 2 1</div>
        <div className="text-round-3-purple font-black animate-pulse">?</div>
      </div>

      {/* Hints */}
      <div className="flex flex-col gap-2">
        {!showHint1 && (
          <button
            type="button"
            onClick={() => setShowHint1(true)}
            className="text-xs font-bold text-round-2-orange hover:underline text-left"
          >
            💡 Need Hint 1?
          </button>
        )}
        {showHint1 && (
          <div className="p-2 bg-round-2-amber/15 rounded border border-round-2-amber/40 text-xs font-semibold text-ink-primary">
            <strong>Hint 1:</strong> Read the previous line OUT LOUD. Describe how many of each digit appear in a row.
          </div>
        )}

        {showHint1 && !showHint2 && (
          <button
            type="button"
            onClick={() => setShowHint2(true)}
            className="text-xs font-bold text-round-2-orange hover:underline text-left"
          >
            💡 Need Hint 2?
          </button>
        )}
        {showHint2 && (
          <div className="p-2 bg-round-2-amber/15 rounded border border-round-2-amber/40 text-xs font-semibold text-ink-primary">
            <strong>Hint 2:</strong> The line &quot;1 1 1 2 2 1&quot; contains: three 1s, two 2s, one 1. Write that in numbers!
          </div>
        )}
      </div>

      {solved ? (
        <div className="p-space-md bg-status-correct/15 text-status-correct rounded-xl border-2 border-status-correct flex flex-col items-center text-center gap-space-sm">
          <span className="text-[32px]">🎉</span>
          <h2 className="font-headline-sm text-headline-sm font-black">
            ⚡ GENIUS! BONUS RIDDLE SOLVED!
          </h2>
          <p className="font-body-sm text-body-sm font-semibold">
            Your team submitted <code className="font-bold">312211</code>. This tiebreaker result is recorded on the master scoreboard.
          </p>
          <Link
            href="/round3/result"
            className="mt-2 py-space-sm px-space-md bg-status-correct text-on-primary rounded-lg font-headline-sm text-label-ticker border border-ink-primary shadow-[2px_2px_0px_#0F172A]"
          >
            RETURN TO SUMMARY →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm mt-space-sm">
          <label className="font-headline-sm text-label-ticker text-ink-primary">
            ENTER THE NEXT LINE IN THE SEQUENCE
          </label>
          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Enter the next line..."
              className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary tracking-wider focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !answer.trim()}
              className="px-space-lg py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'CHECKING...' : 'SUBMIT RIDDLE →'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
