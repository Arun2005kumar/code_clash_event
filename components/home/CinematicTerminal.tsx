'use client';

import { useState, useEffect } from 'react';

interface CinematicTerminalProps {
  tiltX: number;
  tiltY: number;
}

const TERMINAL_LOGS = [
  { text: '> INITIALIZING CODE CLASH PROTOCOL...', color: 'text-ink-primary font-bold' },
  { text: '> LOADING ARENA KERNEL v2.5...', color: 'text-round-1-blue font-bold' },
  { text: '> TEAM NETWORK: ONLINE & SYNCED', color: 'text-emerald-600 font-bold' },
  { text: '> ROUND 01: SPRINT READY (30 MCQs)', color: 'text-amber-600 font-bold' },
  { text: '> MISSION STATUS: ACTIVE', color: 'text-round-3-purple font-extrabold' },
  { text: '> CHALLENGERS DETECTED IN SQUAD QUEUE', color: 'text-round-2-orange font-bold' },
  { text: '> ARENA READY. STAND BY FOR DISPATCH.', color: 'text-emerald-600 font-extrabold' },
];

export default function CinematicTerminal({ tiltX, tiltY }: CinematicTerminalProps) {
  const [displayedLogs, setDisplayedLogs] = useState<typeof TERMINAL_LOGS>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  useEffect(() => {
    if (currentLineIndex >= TERMINAL_LOGS.length) return;

    const timer = setTimeout(() => {
      setDisplayedLogs((prev) => [...prev, TERMINAL_LOGS[currentLineIndex]]);
      setCurrentLineIndex((prev) => prev + 1);
    }, 450);

    return () => clearTimeout(timer);
  }, [currentLineIndex]);

  return (
    <div
      className="w-full max-w-xl mt-space-lg mb-space-xl relative transition-transform duration-200 ease-out"
      style={{
        transform: `perspective(1000px) rotateX(${tiltY * -8}deg) rotateY(${tiltX * 8}deg)`,
      }}
    >
      {/* Outer Shell Card */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-2xl text-left transform -rotate-1 hover:rotate-0 transition-transform duration-300 border-2 border-ink-primary relative overflow-hidden group">
        
        {/* Subtle Scanline Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none opacity-40 animate-pulse" />

        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-muted/80 px-space-sm py-1.5 rounded-lg border border-ink-primary/20">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-status-wrong inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-currency-gold inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-status-correct inline-block shadow-sm"></span>
          </div>
          <span className="font-label-code text-label-code text-ink-secondary flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-[15px] text-round-1-blue">terminal</span>
            terminal://arena_v2.5.sh
          </span>
          <span className="font-label-sticker text-label-sticker px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black border border-emerald-300">
            ONLINE
          </span>
        </div>

        {/* Terminal Body */}
        <div className="font-label-code text-label-code space-y-1.5 min-h-[140px] flex flex-col justify-end">
          <p className="text-ink-secondary">
            <span className="text-round-1-blue font-bold">visitor@hack-box</span>:
            <span className="text-round-3-purple">~</span>$ ./init_arena --squad-mode
          </p>

          {displayedLogs.map((log, idx) => (
            <p key={idx} className={`${log.color} transition-opacity duration-300 flex items-center gap-1`}>
              <span>{log.text}</span>
            </p>
          ))}

          {/* Active Blinking Cursor */}
          <p className="text-ink-secondary flex items-center gap-1 pt-1">
            <span className="text-round-1-blue font-bold">&gt;</span>
            <span className="font-bold">Awaiting team login gesture...</span>
            <span className="w-2.5 h-4 bg-round-1-blue inline-block animate-ping"></span>
          </p>
        </div>
      </div>

      {/* Quirky "NO BUGS ALLOWED*" Sticker */}
      <div className="absolute -bottom-5 -right-3 sm:-right-8 bg-round-2-amber text-ink-primary px-space-md py-1.5 rounded-lg shadow-lg transform rotate-3 hover:scale-105 transition-transform duration-200 border-2 border-ink-primary z-10">
        <div className="flex items-center gap-1 font-label-sticker text-label-sticker font-extrabold uppercase">
          <span className="material-symbols-outlined text-[16px]">pest_control</span>
          <span>NO BUGS ALLOWED*</span>
        </div>
        <span className="block text-[9px] font-body-sm leading-tight text-ink-primary/80 italic font-semibold">
          *We can&apos;t actually guarantee that.
        </span>
      </div>
    </div>
  );
}
