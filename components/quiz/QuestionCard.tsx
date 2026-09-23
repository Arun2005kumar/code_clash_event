'use client';

// components/quiz/QuestionCard.tsx
// Displays a single MCQ question with animated option selection

import { motion, AnimatePresence } from 'framer-motion';
import { Option } from '@/types';

interface BaseQuestion {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface QuestionCardProps {
  question: BaseQuestion;
  questionIndex: number;
  selectedOption: Option | null;
  onSelect: (option: Option) => void;
  disabled?: boolean;
}

const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

export default function QuestionCard({
  question,
  questionIndex,
  selectedOption,
  onSelect,
  disabled = false,
}: QuestionCardProps) {
  const optionLabels: Record<Option, string> = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      >
        {/* Question Header */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold px-3.5 py-1.2 rounded-full mb-3 shadow-xs">
            <span>Question {questionIndex + 1} of 30</span>
          </span>
          <p className="text-slate-900 font-bold text-lg sm:text-xl leading-relaxed">
            {question.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3.5">
          {OPTIONS.map((opt) => {
            const isSelected = selectedOption === opt;
            return (
              <motion.button
                key={opt}
                onClick={() => !disabled && onSelect(opt)}
                whileHover={!disabled ? { scale: 1.008, y: -1 } : {}}
                whileTap={!disabled ? { scale: 0.985 } : {}}
                animate={isSelected ? { scale: [1, 1.015, 1] } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`w-full text-left p-4.5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 shadow-md shadow-indigo-500/10'
                    : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {/* Option Badge */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm border-2 transition-all ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'border-slate-300 text-slate-600 bg-slate-50'
                  }`}
                >
                  {isSelected ? (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : (
                    opt
                  )}
                </div>

                {/* Option Label Text */}
                <span className={`text-sm sm:text-base font-semibold ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                  {optionLabels[opt]}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
