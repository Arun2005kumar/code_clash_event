'use client';

// components/animations/BootSequence.tsx — Interactive Cyber Boot sequence for initial load

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BootSequence() {
  const [show, setShow] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // Only show on initial application visit per browser tab session
    if (typeof window === 'undefined') return;
    const hasBooted = sessionStorage.getItem('codeclash_boot_done');
    if (!hasBooted) {
      setShow(true);
      sessionStorage.setItem('codeclash_boot_done', 'true');
    }
  }, []);

  useEffect(() => {
    if (!show) return;

    // Progress percentage counter animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 8) + 4;
      });
    }, 80);

    // Terminal typing steps
    const step1 = setTimeout(() => setStep(1), 300);
    const step2 = setTimeout(() => setStep(2), 700);
    const step3 = setTimeout(() => setStep(3), 1100);
    const step4 = setTimeout(() => setStep(4), 1600);
    const closeBoot = setTimeout(() => setShow(false), 2200);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      clearTimeout(step4);
      clearTimeout(closeBoot);
    };
  }, [show]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999999,
          background: '#0B0F17',
          color: '#38BDF8',
          fontFamily: "'Fira Code', monospace, sans-serif",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        {/* Futuristic Grid Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />

        {/* Scan line effect */}
        <motion.div
          animate={{ y: ['0%', '100%', '0%'] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.5), transparent)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '520px', width: '100%', position: 'relative', zIndex: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#38BDF8',
                boxShadow: '0 0 10px #38BDF8',
              }}
            />
            <span style={{ fontSize: '12px', letterSpacing: '0.1em', opacity: 0.8 }}>
              CODE CLASH OS // v2.0
            </span>
          </div>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#FFFFFF',
              marginBottom: '4px',
              letterSpacing: '-0.02em',
            }}
          >
            CODE CLASH
          </h1>
          <div
            style={{
              fontSize: '14px',
              color: '#F59E0B',
              fontWeight: 700,
              letterSpacing: '0.15em',
              marginBottom: '32px',
            }}
          >
            OPERATION TECH HEIST
          </div>

          {/* Terminal Console Output */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              fontSize: '13px',
              lineHeight: 1.8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {step >= 0 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                &gt; SYSTEM INITIALIZING...
              </motion.div>
            )}
            {step >= 1 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                &gt; LOADING CHALLENGE ENGINE...
              </motion.div>
            )}
            {step >= 2 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                &gt; ESTABLISHING SECURE CONNECTION...
              </motion.div>
            )}
            {step >= 3 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ color: '#10B981', fontWeight: 700 }}
              >
                &gt; ACCESS GRANTED ✓
              </motion.div>
            )}
          </div>

          {/* Progress Bar & Percentage */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                flex: 1,
                height: '6px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <motion.div
                style={{
                  height: '100%',
                  width: `${Math.min(100, progress)}%`,
                  background: 'linear-gradient(90deg, #38BDF8, #10B981)',
                  borderRadius: '3px',
                }}
              />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', minWidth: '45px' }}>
              {Math.min(100, progress)}%
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
