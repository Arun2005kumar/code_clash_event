'use client';

import { motion, AnimatePresence, TargetAndTransition } from 'framer-motion';
import { usePathname } from 'next/navigation';

const ROUTE_TRANSITIONS: Record<
  string,
  {
    enter: TargetAndTransition;
    exit: TargetAndTransition;
    color: string;
    label: string;
  }
> = {
  '/': { enter: { opacity: 0, scale: 0.98 }, exit: { opacity: 0, scale: 1.02 }, color: '#3b82f6', label: '🏠 Home' },
  '/round1': { enter: { opacity: 0, x: 40 }, exit: { opacity: 0, x: -40 }, color: '#8b5cf6', label: '📝 Round 1' },
  '/round1/result': { enter: { opacity: 0, y: 30 }, exit: { opacity: 0, y: -30 }, color: '#10b981', label: '🏆 Results' },
  '/round2': { enter: { opacity: 0, x: 40 }, exit: { opacity: 0, x: -40 }, color: '#f59e0b', label: '🪙 Round 2' },
  '/round2/result': { enter: { opacity: 0, y: 30 }, exit: { opacity: 0, y: -30 }, color: '#10b981', label: '🏆 Results' },
  '/round3': { enter: { opacity: 0, x: 40 }, exit: { opacity: 0, x: -40 }, color: '#6366f1', label: '🔐 Round 3' },
  '/round3/vault': { enter: { opacity: 0, scale: 0.8 }, exit: { opacity: 0, scale: 1.2 }, color: '#7c3aed', label: '🔓 Vault' },
};

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const transition = ROUTE_TRANSITIONS[pathname] ?? ROUTE_TRANSITIONS['/'];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={transition.enter}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={transition.exit}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
