'use client';

// app/admin/round3/page.tsx — Round 3 placeholder for admin

import { motion } from 'framer-motion';

export default function AdminRound3Page() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Round 3</h1>
        <p className="text-slate-500 text-sm mt-1">Coming Soon — Configuration available after Round 2</p>
      </div>

      <div className="card p-12 text-center max-w-lg">
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="text-6xl mb-6"
        >🧠</motion.div>
        <h2 className="text-xl font-bold text-slate-900 mb-3">Round 3 Coming Soon</h2>
        <p className="text-slate-500 mb-6">
          Round 3 configuration will be available here after Round 2 is completed.
          The architecture supports plug-in style round additions without rewriting existing flows.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 text-left">
          <p className="font-semibold mb-1">Developer Note:</p>
          <ul className="space-y-1 text-xs">
            <li>• Add <code>round3_questions</code>, <code>round3_attempts</code> tables via migration</li>
            <li>• Create <code>/app/round3/page.tsx</code> for team-facing round</li>
            <li>• Add admin management in this section</li>
            <li>• Toggle <code>round3_active</code> in competition_settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
