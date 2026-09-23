'use client';

// components/auction/LiveLeaderboard.tsx
// Real-time sorted bid table with Framer Motion layout animations

import { motion, AnimatePresence } from 'framer-motion';
import { Round2Bid } from '@/types';
import { formatDateTime } from '@/lib/utils';

interface LiveLeaderboardProps {
  bids: Round2Bid[];
  onSelectWinner?: (teamId: string) => void;
  selectedWinnerId?: string | null;
  showSelectButton?: boolean;
}

export default function LiveLeaderboard({
  bids,
  onSelectWinner,
  selectedWinnerId,
  showSelectButton = false,
}: LiveLeaderboardProps) {
  // Sort: highest bid first, then earliest timestamp
  const sorted = [...bids].sort((a, b) => {
    if (b.bid_amount !== a.bid_amount) return b.bid_amount - a.bid_amount;
    return new Date(a.bid_timestamp).getTime() - new Date(b.bid_timestamp).getTime();
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-4xl mb-3">⏳</div>
        <p className="font-medium">Waiting for bids...</p>
        <p className="text-sm mt-1">Teams are placing their bids now.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Live badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-sm font-bold text-red-600 uppercase tracking-wide">LIVE</span>
        <span className="text-sm text-slate-500">{sorted.length} bid{sorted.length !== 1 ? 's' : ''} received</span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {sorted.map((bid, index) => {
            const isTop = index === 0;
            const isSelected = bid.team_id === selectedWinnerId;

            return (
              <motion.div
                key={bid.team_id}
                layout
                layoutId={bid.team_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  isTop
                    ? 'border-amber-300 bg-amber-50'
                    : isSelected
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-100 bg-white'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 text-center font-black text-lg ${isTop ? 'text-amber-500' : 'text-slate-400'}`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>

                {/* Team info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    {bid.team_name || bid.team_id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Bid at {formatDateTime(bid.bid_timestamp)}
                  </p>
                </div>

                {/* Option */}
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-sm font-bold">
                    Opt. {bid.selected_option}
                  </span>
                </div>

                {/* Bid amount */}
                <div className="text-right">
                  <p className="font-black text-lg text-slate-900">{bid.bid_amount} 🪙</p>
                </div>

                {/* Select winner button (admin only) */}
                {showSelectButton && onSelectWinner && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelectWinner(bid.team_id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ Selected' : 'Select'}
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
