'use client';

// components/animations/ScorePopup.tsx
// Floating "+10" green particle animation when score increases

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ScorePopupProps {
  trigger: boolean;
  amount?: number;
  color?: 'green' | 'red';
}

export default function ScorePopup({ trigger, amount = 10, color = 'green' }: ScorePopupProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  const isPositive = amount > 0;
  const textColor = color === 'green' ? 'text-emerald-500' : 'text-red-500';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`absolute top-0 right-0 font-black text-2xl pointer-events-none z-50 ${textColor}`}
          initial={{ opacity: 1, y: 0, scale: 0.8 }}
          animate={{ opacity: 0, y: -50, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          {isPositive ? '+' : ''}{amount}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
