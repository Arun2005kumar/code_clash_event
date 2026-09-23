'use client';

// components/quiz/ProgressTracker.tsx
// Visual grid of answered/unanswered/current question indicators

import { motion } from 'framer-motion';

interface ProgressTrackerProps {
  totalQuestions: number;
  answeredQuestions: Set<string>;
  questionIds: string[];
  currentIndex: number;
  onJump?: (index: number) => void;
}

export default function ProgressTracker({
  totalQuestions,
  answeredQuestions,
  questionIds,
  currentIndex,
  onJump,
}: ProgressTrackerProps) {
  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Progress — {answeredQuestions.size}/{totalQuestions}
      </h3>
      <div className="grid grid-cols-6 gap-1.5">
        {questionIds.map((id, index) => {
          const isAnswered = answeredQuestions.has(id);
          const isCurrent = index === currentIndex;

          return (
            <motion.button
              key={id}
              onClick={() => onJump?.(index)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
              style={{
                backgroundColor: isCurrent
                  ? '#3b82f6'
                  : isAnswered
                  ? '#10b981'
                  : '#f1f5f9',
                color: isCurrent || isAnswered ? 'white' : '#64748b',
              }}
              animate={isCurrent ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ repeat: isCurrent ? Infinity : 0, duration: 1.5 }}
            >
              {isAnswered && !isCurrent ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Current
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-slate-200 inline-block" /> Unanswered
        </span>
      </div>
    </div>
  );
}
