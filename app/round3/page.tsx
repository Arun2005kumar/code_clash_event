'use client';

// app/round3/page.tsx — Redesigned Funny Round 3 Placeholder

import { motion } from 'framer-motion';

export default function Round3Page() {
  return (
    <main className="min-h-screen bg-light-grid flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full flex flex-col items-center">
        {/* Animated Brain Emoji */}
        <motion.div
          className="text-7xl mb-6"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          🧠
        </motion.div>

        {/* Gradient Title */}
        <h1
          className="text-5xl font-black mb-3 tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 bg-clip-text text-transparent"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ROUND 3
        </h1>

        <p className="text-lg font-semibold text-slate-600 mb-2">
          Something interesting is loading...
        </p>

        {/* Funny CS Student Line */}
        <p className="text-sm text-slate-400 italic mb-6">
          "Our developers are currently arguing about the rules."
        </p>

        {/* Animated Bouncing Dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-indigo-500"
              animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
            />
          ))}
        </div>

        {/* Locked Status Chip */}
        <div className="px-6 py-2.5 rounded-full bg-indigo-50 border-1.5 border-indigo-200 text-indigo-700 font-extrabold text-xs shadow-xs">
          Locked until Round 2 ends 🔒
        </div>
      </div>
    </main>
  );
}
