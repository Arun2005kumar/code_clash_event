'use client';

// components/animations/CountUp.tsx
// Animated number counter that counts up from 0 to a target value

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  target: number;
  duration?: number; // ms
  suffix?: string;
  prefix?: string;
  className?: string;
}

export default function CountUp({ target, duration = 1500, suffix = '', prefix = '', className = '' }: CountUpProps) {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return (
    <span className={className}>
      {prefix}{current}{suffix}
    </span>
  );
}
