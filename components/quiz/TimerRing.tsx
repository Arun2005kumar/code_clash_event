'use client';

// components/quiz/TimerRing.tsx
// SVG circular progress timer — green → amber (5 min left) → red (2 min left)

import { motion } from 'framer-motion';
import { formatTime } from '@/lib/utils';

interface TimerRingProps {
  totalSeconds: number;
  remainingSeconds: number;
  size?: number;
}

export default function TimerRing({ totalSeconds, remainingSeconds, size = 120 }: TimerRingProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = remainingSeconds / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);

  const isWarning = remainingSeconds <= 5 * 60 && remainingSeconds > 2 * 60;
  const isDanger = remainingSeconds <= 2 * 60;

  const strokeColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          animate={{ stroke: strokeColor, strokeDashoffset }}
          transition={{ stroke: { duration: 0.5 }, strokeDashoffset: { duration: 0.5 } }}
        />
      </svg>

      {/* Time display */}
      <motion.div
        className="absolute flex flex-col items-center"
        animate={isDanger ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={{ repeat: isDanger ? Infinity : 0, duration: 1 }}
      >
        <span
          className="font-mono font-black text-lg leading-none"
          style={{ color: strokeColor }}
        >
          {formatTime(remainingSeconds)}
        </span>
        <span className="text-xs text-slate-400 mt-0.5">left</span>
      </motion.div>
    </div>
  );
}
