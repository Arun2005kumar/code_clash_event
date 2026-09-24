'use client';

// components/round3/missions/Mission1HiddenObject.tsx — Mission 01: Two-Stage Solving Flow
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
  '4. Smart teams can find answers.'
];

export default function Mission1HiddenObject({ teamId, mission, attempt, onSuccess, isExpired = false }: MissionProps) {
  // If already solved on backend
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');

  // Stage 1 (Extract CAND) vs Stage 2 (Solve CANDLE)
  const [stage, setStage] = useState<1 | 2>(1);
  const [stage1Input, setStage1Input] = useState('');
  const [stage2Input, setStage2Input] = useState(attempt?.submitted_answer ?? '');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check localStorage for Stage 1 progress if not already completed on backend
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

  // Handle Stage 1 Submission (Validating CAND)
  const handleStage1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return;
    setErrorMsg('');

    const formatted = stage1Input.trim().toUpperCase();
    if (!formatted) return;

    if (formatted === 'CAND') {
      setStage(2);
      localStorage.setItem(`codeclash_team_${teamId}_m1_stage1`, 'true');
      toast.success('Extraction protocol successful! Intermediate clue unlocked.');
    } else {
      setErrorMsg('Incorrect extraction. Follow the protocol: line 1 letter 1, line 2 letter 2, etc.');
      toast.error('Incorrect letters. Try again!');
    }
  };

  // Handle Stage 2 Submission (Validating CANDLE against Server)
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
      toast.success('Mission 1 Clear! Key #1 recovered.');
    } else {
      setErrorMsg('Incorrect final answer. Reason using the extracted clue (CAND) and the light hint.');
      toast.error('Incorrect answer. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-bold">
          EASY • {mission.time_estimate}
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary font-bold">MISSION 01</span>
      </div>

      <div>
        <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
          THE HIDDEN OBJECT
        </h1>
        <p className="font-body-md text-body-md text-ink-secondary font-medium mt-1">
          &quot;The marker hid 4 letters in plain sight.&quot;
        </p>
      </div>

      {/* If fully solved, show Stage 3 Final Success State */}
      {solved ? (
        <ClueReveal missionNumber={1} cluePiece={cluePiece} nextMissionNumber={2} />
      ) : (
        <>
          {/* Stage 1: Extraction Protocol */}
          {stage === 1 && (
            <div className="flex flex-col gap-space-md">
              {/* Extraction Protocol Instruction Card */}
              <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-inner space-y-3">
                <div className="flex items-center gap-space-xs text-round-3-purple font-headline-sm text-headline-sm font-black">
                  <span className="material-symbols-outlined">description</span>
                  <span>EXTRACTION PROTOCOL</span>
                </div>
                <div className="font-label-code text-body-md text-ink-primary space-y-1">
                  <p className="font-bold">For each numbered line:</p>
                  <p className="text-round-3-purple font-black">NTH LINE → NTH WORD → NTH LETTER</p>
                </div>
                <div className="p-space-sm bg-surface-card rounded-lg border border-ink-primary/20 font-label-code text-body-sm text-ink-secondary">
                  <span className="font-bold text-ink-primary">Example:</span><br />
                  Line 2 → 2nd word → 2nd letter
                </div>
              </div>

              {/* Puzzle Text Display */}
              <div className="p-space-md bg-surface-card rounded-xl border-2 border-ink-primary font-label-code text-body-md space-y-2 shadow-sm">
                <span className="font-label-sticker text-[10px] text-ink-secondary uppercase font-bold tracking-wider block mb-1">
                  PATTERNS TO ANALYZE:
                </span>
                {PUZZLE_LINES.map((line, idx) => (
                  <div key={idx} className="text-ink-primary font-bold">
                    {line}
                  </div>
                ))}
              </div>

              {/* Stage 1 Input Form */}
              <form onSubmit={handleStage1Submit} className="flex flex-col gap-space-sm mt-space-xs">
                <div className="flex items-center justify-between">
                  <label className="font-headline-sm text-label-ticker text-ink-primary font-extrabold uppercase">
                    ENTER THE 4 EXTRACTED LETTERS
                  </label>
                  <div className="flex items-center gap-1 font-label-code text-headline-sm text-round-3-purple font-black">
                    <span>RECOVERED LETTERS:</span>
                    <span className="tracking-widest bg-surface-container px-2 py-0.5 rounded border border-ink-primary">
                      {stage1Input.padEnd(4, '_').toUpperCase().split('').join(' ')}
                    </span>
                  </div>
                </div>

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
                    SUBMIT LETTERS →
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-space-sm bg-status-wrong/10 text-status-wrong rounded-lg font-label-sticker text-label-sticker font-bold border border-status-wrong/30">
                    ⚠️ {errorMsg}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Stage 2: Intermediate Clue & Final Hint */}
          {stage === 2 && (
            <div className="flex flex-col gap-space-md animate-fadeIn">
              {/* Stage 1 Success Banner */}
              <div className="p-space-sm bg-status-correct/15 border-2 border-status-correct rounded-xl text-status-correct font-headline-sm text-headline-sm font-black flex items-center gap-space-xs shadow-sm">
                <span className="material-symbols-outlined text-[24px]">verified</span>
                <span>✓ EXTRACTION SUCCESSFUL</span>
              </div>

              {/* Intermediate Clue Card */}
              <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-sm space-y-2">
                <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase font-bold tracking-wider block">
                  RECOVERED CLUE
                </span>
                <div className="flex items-center gap-2">
                  {'CAND'.split('').map((char, idx) => (
                    <span key={idx} className="w-10 h-12 bg-surface-card rounded-lg border-2 border-ink-primary flex items-center justify-center font-label-code text-xl font-black text-round-3-purple shadow-[2px_2px_0px_#0F172A]">
                      {char}
                    </span>
                  ))}
                </div>
                <p className="font-body-sm text-body-sm text-ink-secondary font-semibold italic pt-1">
                  &quot;These letters are an intermediate clue, not the final answer.&quot;
                </p>
              </div>

              {/* Final Hint Card */}
              <div className="p-space-md bg-surface-card rounded-xl border-2 border-ink-primary shadow-sm space-y-1">
                <span className="font-label-sticker text-label-sticker text-round-3-pink uppercase font-extrabold tracking-wider block">
                  FINAL HINT
                </span>
                <p className="font-headline-sm text-headline-sm text-ink-primary font-black">
                  &quot;What do we use when there is no light?&quot;
                </p>
              </div>

              {/* Stage 2 Input Form */}
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
                    {loading ? 'CHECKING...' : 'SUBMIT ANSWER →'}
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-space-sm bg-status-wrong/10 text-status-wrong rounded-lg font-label-sticker text-label-sticker font-bold border border-status-wrong/30">
                    ⚠️ {errorMsg}
                  </div>
                )}
              </form>
            </div>
          )}
        </>
      )}

      {/* Hints System */}
      <HintSystem
        teamId={teamId}
        missionNumber={1}
        hints={mission.handout_content.hints ?? []}
        initialHintCount={attempt?.hint_count ?? 0}
      />
    </div>
  );
}

