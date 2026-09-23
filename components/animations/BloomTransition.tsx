'use client';

// components/animations/BloomTransition.tsx
// Circular ripple bloom transition from login to round 1

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface BloomTransitionProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function BloomTransition({ isActive, onComplete }: BloomTransitionProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[10000] pointer-events-none"
          style={{ backgroundColor: 'white' }}
          initial={{ clipPath: 'circle(0% at 50% 50%)' }}
          animate={{ clipPath: 'circle(150% at 50% 50%)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={onComplete}
        />
      )}
    </AnimatePresence>
  );
}
