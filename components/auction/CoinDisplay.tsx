'use client';

// components/auction/CoinDisplay.tsx
// Animated coin counter with spin icon and flash on change

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface CoinDisplayProps {
  coins: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function CoinDisplay({ coins, showLabel = true, size = 'md' }: CoinDisplayProps) {
  const prevCoins = useRef(coins);
  const [flash, setFlash] = useState<'decrease' | 'increase' | null>(null);

  useEffect(() => {
    if (coins < prevCoins.current) {
      setFlash('decrease');
    } else if (coins > prevCoins.current) {
      setFlash('increase');
    }
    prevCoins.current = coins;

    if (flash) {
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    }
  }, [coins]);

  const sizes = {
    sm: { icon: 'text-xl', number: 'text-xl', label: 'text-xs' },
    md: { icon: 'text-3xl', number: 'text-3xl', label: 'text-sm' },
    lg: { icon: 'text-5xl', number: 'text-5xl', label: 'text-base' },
  };

  const s = sizes[size];

  return (
    <motion.div
      className="flex items-center gap-2"
      animate={flash === 'decrease' ? { x: [-3, 3, -3, 3, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Spinning coin */}
      <motion.span
        className={s.icon}
        animate={flash ? { rotateY: [0, 180, 360] } : {}}
        transition={{ duration: 0.5 }}
      >
        🪙
      </motion.span>

      <div>
        <motion.span
          key={coins}
          initial={{ scale: 1.3, color: flash === 'decrease' ? '#ef4444' : flash === 'increase' ? '#10b981' : 'inherit' }}
          animate={{ scale: 1, color: '#0f172a' }}
          transition={{ duration: 0.5 }}
          className={`font-black ${s.number} block leading-none`}
          style={{ color: flash === 'decrease' ? '#ef4444' : flash === 'increase' ? '#10b981' : '#0f172a' }}
        >
          {coins}
        </motion.span>
        {showLabel && (
          <span className={`${s.label} text-slate-500 font-medium`}>coins</span>
        )}
      </div>
    </motion.div>
  );
}
