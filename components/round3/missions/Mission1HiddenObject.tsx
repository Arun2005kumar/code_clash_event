'use client';

// components/round3/missions/Mission1HiddenObject.tsx — Mission 01: THE HIDDEN MESSAGE
import { useState, useEffect } from 'react';
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
  isExpired?: boolean;
}

const PUZZLE_LINES = [
  '1. Curious teams inspect clues.',
  '2. Observe game patterns carefully.',
  '3. Teams solve fun puzzles.',
  '4. Smart teams can find answers.',
];

export default function Mission1HiddenObject({ teamId, mission, attempt, onSuccess, isExpired = false }: MissionProps) {
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');

  const [stage, setStage] = useState<1 | 2>(1);
  const [stage1Input, setStage1Input] = useState('');
  const [stage2Input, setStage2Input] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (attempt?.is_correct) {
      setSolved(true);
      setCluePiece(attempt.clue_piece_revealed ?? 'CANDLE');
      return;
    }
    const key = `codeclash_team_${teamId}_m1_stage1`;
    if (localStorage.getItem(key) === 'true') {
      setStage(2);
    }
  }, [teamId, attempt]);

  const handleStage1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return;
    setErrorMsg('');

    const formatted = stage1Input.trim().toUpperCase();
    if (!formatted) return;

    if (formatted === 'CAND') {
      setStage(2);
      localStorage.setItem(`codeclash_team_${teamId}_m1_stage1`, 'true');
      toast.success('Extraction protocol successful! Second clue unlocked.');
    } else {
      setErrorMsg('ACCESS DENIED: The answer doesn\'t match. Recheck your extraction and try again.');
      toast.error('Access Denied. Recheck extraction!');
    }
  };

  const handleStage2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return;
    if (!stage2Input.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 1, stage2Input.trim());
    setLoading(false);

    if (res.is_correct && res.clue_piece) {
      setSolved(true);
      setCluePiece(res.clue_piece);
      onSuccess(res.clue_piece);
      toast.success('MESSAGE DECODED! Key #1 recovered.');
    } else {
      setErrorMsg('ACCESS DENIED: The answer doesn\'t match. Recheck your extraction and try again.');
      toast.error('Access Denied. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          EASY • EST. SOLVE TIME: 4–5 MIN
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary font-bold">MISSION 01</span>
      </div>

      <div>
        <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
          THE HIDDEN MESSAGE
        </h1>
        <p className="font-body-md text-body-md text-ink-secondary font-medium mt-1">
          🕵️ SYSTEM MESSAGE: We&apos;ve intercepted a suspicious message hidden inside four lines of text. The message isn&apos;t meant to be read normally. Extract the hidden letters using the rule below.
        </p>
      </div>

      {isExpired && (
        <div className="p-space-sm bg-status-wrong text-white rounded-lg font-headline-sm text-headline-sm font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex items-center justify-center gap-space-xs uppercase">
          <span className="material-symbols-outlined text-[22px]">timer_off</span>
          <span>TIME EXPIRED — SUBMISSIONS DISABLED</span>
        </div>
      )}

      {solved ? (
        <ClueReveal missionNumber={1} cluePiece={cluePiece} nextMissionNumber={2} />
      ) : (
        <>
          {stage === 1 && (
            <div className="flex flex-col gap-space-md">
              <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-inner space-y-3">
                <div className="flex items-center gap-space-xs text-round-3-purple font-headline-sm text-headline-sm font-black">
                  <span className="material-symbols-outlined">target</span>
                  <span>YOUR OBJECTIVE</span>
                </div>
                <div className="font-label-code text-body-md text-ink-primary space-y-1">
                  <p className="font-bold">For each numbered line:</p>
                  <p className="text-round-3-purple font-black text-lg">Nth LINE → Nth WORD → Nth LETTER</p>
                  <p className="text-ink-secondary font-normal text-sm">Do this for all four lines. You will obtain four letters.</p>
                </div>
              </div>

              <div className="p-space-md bg-surface-card rounded-xl border-2 border-ink-primary font-label-code text-body-md space-y-2 shadow-sm">
                <span className="font-label-sticker text-[10px] text-ink-secondary uppercase font-bold tracking-wider block mb-1">
                  INTERCEPTED PUZZLE LINES:
                </span>
                {PUZZLE_LINES.map((line, idx) => (
                  <div key={idx} className="text-ink-primary font-bold">
                    {line}
                  </div>
                ))}
              </div>

              <form onSubmit={handleStage1Submit} className="flex flex-col gap-space-sm mt-space-xs">
                <label className="font-headline-sm text-label-ticker text-ink-primary font-extrabold uppercase">
                  ENTER THE FOUR EXTRACTED LETTERS
                </label>

                <div className="flex flex-col sm:flex-row gap-space-sm">
                  <input
                    type="text"
                    maxLength={4}
                    value={stage1Input}
                    onChange={e => setStage1Input(e.target.value.toUpperCase())}
                    placeholder="Enter 4 letters..."
                    disabled={isExpired}
                    className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary uppercase tracking-widest focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isExpired || stage1Input.trim().length !== 4}
                    className="px-space-lg py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer font-extrabold"
                  >
                    CONFIRM EXTRACTION →
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-space-md bg-status-wrong/10 text-status-wrong rounded-xl font-headline-sm text-headline-sm font-black border border-status-wrong/30">
                    🚨 {errorMsg}
                  </div>
                )}
              </form>
            </div>
          )}

          {stage === 2 && (
            <div className="flex flex-col gap-space-md animate-fadeIn">
              <div className="p-space-sm bg-status-correct/15 border-2 border-status-correct rounded-xl text-status-correct font-headline-sm text-headline-sm font-black flex items-center gap-space-xs shadow-sm">
                <span className="material-symbols-outlined text-[24px]">verified</span>
                <span>✓ STAGE 1 EXTRACTION CONFIRMED</span>
              </div>

              <div className="p-space-md bg-surface-card rounded-xl border-2 border-ink-primary shadow-sm space-y-1">
                <span className="font-label-sticker text-label-sticker text-round-3-pink uppercase font-extrabold tracking-wider block">
                  SECOND CLUE
                </span>
                <p className="font-headline-sm text-headline-sm text-ink-primary font-black">
                  &quot;What do we use when there is no light?&quot;
                </p>
              </div>

              <form onSubmit={handleStage2Submit} className="flex flex-col gap-space-sm mt-space-xs">
                <label className="font-headline-sm text-label-ticker text-ink-primary font-extrabold uppercase">
                  ENTER FINAL ANSWER
                </label>
                <div className="flex flex-col sm:flex-row gap-space-sm">
                  <input
                    type="text"
                    value={stage2Input}
                    onChange={e => setStage2Input(e.target.value)}
                    placeholder="Enter final answer..."
                    disabled={isExpired || loading}
                    className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary uppercase tracking-wider focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isExpired || loading || !stage2Input.trim()}
                    className="px-space-lg py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer font-extrabold"
                  >
                    {loading ? 'CHECKING...' : 'CONFIRM ANSWER →'}
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-space-md bg-status-wrong/10 text-status-wrong rounded-xl font-headline-sm text-headline-sm font-black border border-status-wrong/30">
                    🚨 {errorMsg}
                  </div>
                )}
              </form>
            </div>
          )}
        </>
      )}

      <HintSystem
        teamId={teamId}
        missionNumber={1}
        hints={mission.handout_content.hints ?? [
          "Follow the extraction rule for each line.",
          "Line 1 → 1st word, 1st letter. Line 2 → 2nd word, 2nd letter. And so on.",
          "Think about what you light up when there is no power or light."
        ]}
        initialHintCount={attempt?.hint_count ?? 0}
        isExpired={isExpired}
      />
    </div>
  );
}
