'use client';

// components/auction/BidSelector.tsx
// 1 / 2 / 5 coin bid selection cards

import { motion } from 'framer-motion';
import { BidAmount } from '@/types';

interface BidSelectorProps {
  selectedBid: BidAmount | null;
  onSelect: (amount: BidAmount) => void;
  availableCoins: number;
  disabled?: boolean;
}

const BID_OPTIONS: BidAmount[] = [1, 2, 5];

export default function BidSelector({ selectedBid, onSelect, availableCoins, disabled = false }: BidSelectorProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Place Your Bid
      </p>
      <div className="grid grid-cols-3 gap-3">
        {BID_OPTIONS.map((amount) => {
          const isSelected = selectedBid === amount;
          const canAfford = availableCoins >= amount;
          const isDisabled = disabled || !canAfford;

          return (
            <motion.button
              key={amount}
              onClick={() => !isDisabled && onSelect(amount)}
              whileHover={!isDisabled ? { scale: 1.03, y: -2 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              animate={isSelected ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`relative p-4 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center gap-2 ${
                isSelected
                  ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20'
                  : isDisabled
                  ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:shadow-md cursor-pointer'
              }`}
            >
              {/* Coin icon */}
              <motion.div
                animate={isSelected ? { rotate: [0, 360] } : { rotate: 0 }}
                transition={{ duration: 0.4 }}
                className="text-2xl"
              >
                🪙
              </motion.div>

              <div>
                <p className={`text-2xl font-black ${isSelected ? 'text-amber-400' : canAfford ? 'text-slate-900' : 'text-slate-300'}`}>
                  {amount}
                </p>
                <p className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {amount === 1 ? 'coin' : 'coins'}
                </p>
              </div>

              {!canAfford && (
                <span className="text-[10px] text-red-400 font-medium">Insufficient</span>
              )}
            </motion.button>
          );
        })}
      </div>
      {availableCoins === 1 && (
        <p className="mt-2 text-xs text-amber-600 font-medium text-center">
          😬 Living on the edge, aren't we?
        </p>
      )}
    </div>
  );
}
