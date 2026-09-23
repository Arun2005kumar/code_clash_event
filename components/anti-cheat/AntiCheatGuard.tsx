'use client';

// components/anti-cheat/AntiCheatGuard.tsx
// Master anti-cheat wrapper component for all exam pages.
// Handles: fullscreen enforcement, tab switch detection, copy-paste blocking,
// keyboard shortcut blocking, DevTools detection, violation logging.

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logViolation } from '@/lib/anti-cheat/violations';
import { ViolationType } from '@/types';

interface AntiCheatGuardProps {
  teamId: string;
  children: React.ReactNode;
  onViolation?: (type: ViolationType, count: number) => void;
}

interface OverlayState {
  show: boolean;
  message: string;
  type: 'warning' | 'fullscreen' | 'devtools';
  countdown?: number;
}

const BLOCKED_KEYS = new Set([
  'F12', 'F11',
]);

const BLOCKED_COMBOS: { ctrl?: boolean; shift?: boolean; key: string }[] = [
  { ctrl: true, key: 'c' },
  { ctrl: true, key: 'v' },
  { ctrl: true, key: 'x' },
  { ctrl: true, key: 'u' },
  { ctrl: true, key: 's' },
  { ctrl: true, key: 'p' },
  { ctrl: true, key: 'a' },
  { ctrl: true, key: 'f' },
  { ctrl: true, shift: true, key: 'i' },
  { ctrl: true, shift: true, key: 'j' },
  { ctrl: true, shift: true, key: 'c' },
];

export default function AntiCheatGuard({ teamId, children, onViolation }: AntiCheatGuardProps) {
  const [overlay, setOverlay] = useState<OverlayState>({ show: false, message: '', type: 'warning' });
  const [violationCount, setViolationCount] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const devToolsCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastInnerWidth = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 0);
  const lastInnerHeight = useRef<number>(typeof window !== 'undefined' ? window.innerHeight : 0);

  const recordViolation = useCallback(async (type: ViolationType, message: string, overlayType: OverlayState['type'] = 'warning') => {
    await logViolation(teamId, type);
    const newCount = violationCount + 1;
    setViolationCount(newCount);
    onViolation?.(type, newCount);

    const warningText = newCount >= 3
      ? `⚠️ Warning ${newCount}/3+: Your team has been flagged for admin review.`
      : `Warning ${newCount}/3: Next violation will flag your team to the admin.`;

    setOverlay({
      show: true,
      message: `${message}\n\n${warningText}`,
      type: overlayType,
    });
  }, [teamId, violationCount, onViolation]);

  // ─── Fullscreen Enforcement ─────────────────────────────────
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.warn('[AntiCheat] Fullscreen request failed:', err);
    }
  }, []);

  const startFullscreenCountdown = useCallback(async () => {
    setOverlay({
      show: true,
      message: 'Fullscreen exited! Re-entering fullscreen in...',
      type: 'fullscreen',
      countdown: 3,
    });

    await logViolation(teamId, 'fullscreen_exit');
    const newCount = violationCount + 1;
    setViolationCount(newCount);
    onViolation?.('fullscreen_exit', newCount);

    let count = 3;
    countdownRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        enterFullscreen();
        setOverlay({ show: false, message: '', type: 'warning' });
      } else {
        setOverlay(prev => ({ ...prev, countdown: count }));
      }
    }, 1000);
  }, [teamId, violationCount, onViolation, enterFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        startFullscreenCountdown();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Enter fullscreen on mount
    enterFullscreen();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [enterFullscreen, startFullscreenCountdown]);

  // ─── Tab Switch / Visibility Detection ──────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch', '👀 Tab switch detected. We saw that.');
      }
    };

    const handleBlur = () => {
      recordViolation('window_blur', '⚠️ Window focus lost. Keep focus on the exam.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [recordViolation]);

  // ─── Copy / Paste / Cut / Right-click Prevention ────────────
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('copy_attempt', '📋 Copying is not allowed during the exam.');
    };
    const preventPaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('contextmenu', prevent);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('contextmenu', prevent);
    };
  }, [recordViolation]);

  // ─── Keyboard Shortcut Blocking ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block individual keys
      if (BLOCKED_KEYS.has(e.key)) {
        e.preventDefault();
        recordViolation('keyboard_shortcut', `🚫 Key "${e.key}" is blocked during the exam.`);
        return;
      }

      // Block Ctrl/Cmd combos
      for (const combo of BLOCKED_COMBOS) {
        const ctrlMatch = combo.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = combo.shift ? e.shiftKey : !e.shiftKey || combo.shift === undefined;
        if (ctrlMatch && shiftMatch && e.key.toLowerCase() === combo.key) {
          e.preventDefault();
          if (combo.key === 'p') {
            recordViolation('print_attempt', '🖨️ Printing is not allowed during the exam.');
          } else {
            recordViolation('keyboard_shortcut', `🚫 Shortcut blocked during the exam.`);
          }
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [recordViolation]);

  // ─── DevTools Detection (window size heuristic) ─────────────
  useEffect(() => {
    const checkDevTools = () => {
      const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight);

      const prevWidthDiff = Math.abs(window.outerWidth - lastInnerWidth.current);
      const prevHeightDiff = Math.abs(window.outerHeight - lastInnerHeight.current);

      // If the difference suddenly grows significantly, DevTools likely opened
      if (
        (widthDiff > 160 && Math.abs(widthDiff - prevWidthDiff) > 100) ||
        (heightDiff > 160 && Math.abs(heightDiff - prevHeightDiff) > 100)
      ) {
        recordViolation('devtools_detected', '🛠️ DevTools detected! This is a competitive exam.');
      }

      lastInnerWidth.current = window.innerWidth;
      lastInnerHeight.current = window.innerHeight;
    };

    devToolsCheckRef.current = setInterval(checkDevTools, 1000);
    return () => {
      if (devToolsCheckRef.current) clearInterval(devToolsCheckRef.current);
    };
  }, [recordViolation]);

  // ─── Text Selection Prevention ──────────────────────────────
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'anticheat-styles';
    style.textContent = `
      * { user-select: none !important; -webkit-user-select: none !important; }
      ::selection { background: transparent !important; }
      @media print { body { display: none !important; } }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById('anticheat-styles');
      if (el) el.remove();
    };
  }, []);

  const dismissOverlay = () => {
    // Teams cannot dismiss — only auto-closes or admin action
    // Do nothing
  };

  return (
    <>
      {children}

      <AnimatePresence>
        {overlay.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
            onClick={dismissOverlay}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl border-4 border-red-500"
              onClick={(e) => e.stopPropagation()}
            >
              {overlay.type === 'fullscreen' ? (
                <>
                  <div className="text-5xl mb-4">🖥️</div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Fullscreen Required</h2>
                  <p className="text-slate-600 mb-4">{overlay.message}</p>
                  <div className="text-6xl font-black text-blue-600 mb-4">
                    {overlay.countdown}
                  </div>
                  <p className="text-sm text-slate-500">Re-entering fullscreen automatically...</p>
                </>
              ) : overlay.type === 'devtools' ? (
                <>
                  <div className="text-5xl mb-4">🛠️</div>
                  <h2 className="text-2xl font-bold text-red-600 mb-2">DevTools Detected!</h2>
                  <p className="text-slate-600 mb-6 whitespace-pre-line">{overlay.message}</p>
                  <button
                    onClick={() => setOverlay({ show: false, message: '', type: 'warning' })}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    I understand — Close DevTools
                  </button>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">
                    {violationCount >= 3 ? '⛔' : '⚠️'}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {violationCount >= 3 ? 'Team Flagged!' : 'Violation Detected'}
                  </h2>
                  <p className="text-slate-600 mb-6 whitespace-pre-line">{overlay.message}</p>
                  <div className="flex gap-2 justify-center mb-4">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={`w-3 h-3 rounded-full ${n <= violationCount ? 'bg-red-500' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setOverlay({ show: false, message: '', type: 'warning' })}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
                  >
                    I understand — Return to Exam
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
