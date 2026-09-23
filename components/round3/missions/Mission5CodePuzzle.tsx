'use client';

// components/round3/missions/Mission5CodePuzzle.tsx
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { validateMissionAnswerServer } from '@/lib/round3/missions';
import ClueReveal from '../ClueReveal';
import HintSystem from '../HintSystem';
import { Round3Mission, Round3MissionAttempt } from '@/types';
import { toast } from 'sonner';

interface SortableStripProps {
  id: string;
  code: string;
  index: number;
}

function SortableStrip({ id, code, index }: SortableStripProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-space-sm bg-surface-muted rounded-lg border-2 border-ink-primary shadow-xs flex items-center justify-between cursor-grab hover:bg-surface-container-high transition-colors active:cursor-grabbing group select-none"
    >
      <div className="flex items-center gap-space-sm font-label-code text-body-sm">
        <span className="material-symbols-outlined text-ink-secondary text-[16px] group-hover:text-ink-primary">
          drag_indicator
        </span>
        <span className="text-ink-primary font-bold">{index + 1}</span>
        <code className="text-round-1-blue font-bold">{code}</code>
      </div>
      <span className="font-label-sticker text-[10px] text-ink-secondary uppercase font-bold">
        LINE 0{index + 1}
      </span>
    </div>
  );
}

interface MissionProps {
  teamId: string;
  mission: Round3Mission;
  attempt?: Round3MissionAttempt;
  onSuccess: (clue: string) => void;
}

export default function Mission5CodePuzzle({ teamId, mission, attempt, onSuccess }: MissionProps) {
  const content = mission.handout_content;
  const initialStrips = content.strips ?? [
    "}",
    "total = total * 2;",
    "System.out.println(total);",
    "int total = 1;",
    "for (int i = 1; i <= 3; i++) {"
  ];

  // We map initialStrips to objects with IDs
  const [strips, setStrips] = useState(
    initialStrips.map((strip, idx) => ({ id: `strip-${idx}`, code: strip }))
  );

  const [answer, setAnswer] = useState(attempt?.submitted_answer ?? '');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(attempt?.is_correct ?? false);
  const [cluePiece, setCluePiece] = useState(attempt?.clue_piece_revealed ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setStrips((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setLoading(true);
    setErrorMsg('');

    const res = await validateMissionAnswerServer(teamId, 5, answer);
    setLoading(false);

    if (res.is_correct && res.clue_piece) {
      setSolved(true);
      setCluePiece(res.clue_piece);
      onSuccess(res.clue_piece);
      toast.success('Mission 5 Clear! Clue #5 revealed.');
    } else {
      setErrorMsg('Incorrect output number. Trace your loop carefully (total starts at 1, doubles 3 times)!');
      toast.error('Incorrect. Try again!');
    }
  };

  return (
    <div className="bg-surface-card rounded-xl p-space-lg shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="px-space-sm py-space-xs bg-status-wrong/15 text-status-wrong rounded-md font-label-sticker text-label-sticker font-bold">
          MODERATE+ • {mission.time_estimate}
        </span>
        <span className="font-label-code text-label-sticker text-ink-secondary">MISSION 05</span>
      </div>

      <h1 className="font-headline-lg text-headline-lg text-ink-primary font-black uppercase">
        {mission.title}
      </h1>

      <p className="font-body-md text-body-md text-ink-secondary">
        {content.briefing}
      </p>

      {/* Drag & Drop Code Strips */}
      <div className="p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase font-bold">
            PARSON&apos;S CODE REORDERING (DRAG STRIPS TO FIX):
          </span>
          <span className="font-label-sticker text-[10px] text-round-3-purple font-bold">
            ⚡ LIVE DRAG & DROP
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={strips.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-space-xs">
              {strips.map((strip, idx) => (
                <SortableStrip key={strip.id} id={strip.id} code={strip.code} index={idx} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Live Code Preview */}
        <div className="mt-space-sm p-space-sm bg-inverse-surface rounded-lg border border-ink-primary text-inverse-on-surface font-label-code text-body-sm shadow-inner">
          <span className="text-outline-variant text-[10px] block uppercase font-bold mb-1">
            // REORDERED PROGRAM PREVIEW:
          </span>
          {strips.map((s) => (
            <div key={s.id} className="text-surface font-mono">
              {s.code}
            </div>
          ))}
        </div>
      </div>

      {solved ? (
        <ClueReveal missionNumber={5} cluePiece={cluePiece} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm mt-space-sm">
          <label className="font-headline-sm text-label-ticker text-ink-primary">
            {content.question}
          </label>
          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. 8"
              className="flex-1 px-space-md py-space-sm bg-surface-container rounded-lg font-label-code text-headline-sm text-ink-primary tracking-wider focus:outline-none focus:bg-surface-card border-2 border-ink-primary shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !answer.trim()}
              className="px-space-lg py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'CHECKING...' : 'SUBMIT OUTPUT →'}
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
        missionNumber={5}
        hints={content.hints}
        initialHintCount={attempt?.hint_count ?? 0}
      />
    </div>
  );
}
