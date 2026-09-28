'use client';

// components/anti-cheat/ExamIntegrityModal.tsx — Pre-test integrity verification & user gesture fullscreen trigger

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExamIntegrityModalProps {
  isOpen: boolean;
  roundTitle: string;
  onConfirmFullscreen: () => Promise<void>;
  onCancel?: () => void;
}

export default function ExamIntegrityModal({
  isOpen,
  roundTitle,
  onConfirmFullscreen,
  onCancel,
}: ExamIntegrityModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleStart = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await onConfirmFullscreen();
    } catch {
      setErrorMsg('Fullscreen could not be enabled. Please grant full screen permissions and try again.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999998,
          background: 'rgba(11, 15, 23, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            background: '#1E293B',
            border: '3px solid #3B82F6',
            borderRadius: '24px',
            padding: '40px 36px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header Shield Icon */}
          <div
            style={{
              fontSize: '56px',
              marginBottom: '16px',
              lineHeight: 1,
            }}
          >
            🛡️
          </div>

          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#60A5FA',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            CODE CLASH EXAM INTEGRITY
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#FFFFFF',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
            }}
          >
            {roundTitle} — Security Lock
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}
          >
            Code Clash requires <strong>strict Fullscreen mode</strong> during this test.
            Tab switches, window focus loss, shortcuts, and copy-pasting will be logged.
            Exceeding 3 violations will lock your session.
          </p>

          {/* Checklist */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '28px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#10B981', fontWeight: 800 }}>✓</span>
              <span>Fullscreen mode will activate on start</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#10B981', fontWeight: 800 }}>✓</span>
              <span>Test timer begins only after fullscreen is confirmed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#F59E0B', fontWeight: 800 }}>⚠</span>
              <span>Maximum 3 violations allowed per team</span>
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                padding: '16px 28px',
                fontSize: '16px',
                fontWeight: 800,
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                letterSpacing: '0.02em',
                transition: 'transform 0.15s ease',
              }}
            >
              {loading ? '⚡ ENABLING FULLSCREEN...' : '🖥️ ENTER FULLSCREEN & START'}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: '8px',
                }}
              >
                Cancel & return
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
