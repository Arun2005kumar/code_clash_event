'use client';

// components/animations/ConfettiBurst.tsx
// Triggers a confetti burst animation using canvas-confetti

import { useEffect } from 'react';

interface ConfettiBurstProps {
  trigger: boolean;
}

export default function ConfettiBurst({ trigger }: ConfettiBurstProps) {
  useEffect(() => {
    if (!trigger) return;

    const fire = async () => {
      const confetti = (await import('canvas-confetti')).default;
      const duration = 2000;
      const end = Date.now() + duration;

      const colors = ['#3b82f6', '#0f172a', '#f59e0b', '#10b981'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      };

      frame();
    };

    fire();
  }, [trigger]);

  return null;
}
