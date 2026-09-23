'use client';

// components/auction/HammerButton.tsx
// Admin LOCK HAMMER button with gavel animation, shake on click, confirmation modal

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface HammerButtonProps {
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
  winnerTeamName?: string;
}

export default function HammerButton({ onConfirm, disabled, loading, winnerTeamName }: HammerButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [shake, setShake] = useState(false);
  const [soldAnimation, setSoldAnimation] = useState(false);

  const handleClick = () => {
    if (disabled || loading) return;
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setShowModal(true);
    }, 500);
  };

  const handleConfirm = () => {
    setSoldAnimation(true);
    setTimeout(() => {
      setSoldAnimation(false);
      setShowModal(false);
      onConfirm();
    }, 2000);
  };

  return (
    <>
      {/* Hammer button */}
      <motion.button
        onClick={handleClick}
        disabled={disabled || loading}
        animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className={`relative flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 overflow-hidden ${
          disabled
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-slate-900 text-white shadow-lg shadow-slate-900/30 hover:bg-slate-700 cursor-pointer'
        }`}
        whileHover={!disabled ? { scale: 1.02, y: -1 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
      >
        {/* Border draw animation on hover */}
        {!disabled && (
          <span className="absolute inset-0 border-2 border-transparent hover:border-amber-400 rounded-2xl transition-all duration-300" />
        )}

        {/* Gavel icon with swing on hover */}
        <motion.span
          className="text-2xl"
          whileHover={{ rotate: [-15, 15, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
        >
          🔨
        </motion.span>

        <span>{loading ? 'Processing...' : 'LOCK HAMMER'}</span>
      </motion.button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {soldAnimation ? (
                <motion.div>
                  <div className="text-5xl mb-4">🔨</div>
                  <motion.p
                    className="text-2xl font-black text-slate-900"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Going once...
                  </motion.p>
                  <motion.p
                    className="text-2xl font-black text-slate-700 mt-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    Going twice...
                  </motion.p>
                  <motion.p
                    className="text-3xl font-black text-amber-500 mt-2"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.1 }}
                    transition={{ delay: 1.4, type: 'spring' }}
                  >
                    🔨 SOLD!
                  </motion.p>
                </motion.div>
              ) : (
                <>
                  <div className="text-5xl mb-4">🔨</div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Lock the Hammer?</h2>
                  {winnerTeamName && (
                    <p className="text-slate-600 mb-2">
                      Awarding to: <strong className="text-slate-900">{winnerTeamName}</strong>
                    </p>
                  )}
                  <p className="text-sm text-slate-500 mb-6">This action cannot be undone. The question will be resolved.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-700 transition-colors"
                    >
                      🔨 Lock It
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
