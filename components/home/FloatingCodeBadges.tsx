'use client';

interface FloatingCodeBadgesProps {
  parallaxX: number;
  parallaxY: number;
}

export default function FloatingCodeBadges({ parallaxX, parallaxY }: FloatingCodeBadgesProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Badge 1: Top Left */}
      <div
        className="absolute top-8 left-6 md:left-14 transition-transform duration-300 ease-out hidden sm:block"
        style={{
          transform: `translate3d(${parallaxX * 25}px, ${parallaxY * 25}px, 0) rotate(-6deg)`,
        }}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-round-2-amber/90 text-ink-primary font-label-code text-xs font-bold rounded-lg shadow-md border-2 border-ink-primary backdrop-blur-sm animate-pulse">
          <span className="w-2 h-2 rounded-full bg-status-correct"></span>
          {'{ }'} syntax.valid
        </span>
      </div>

      {/* Badge 2: Top Right */}
      <div
        className="absolute top-16 right-8 md:right-20 transition-transform duration-300 ease-out hidden sm:block"
        style={{
          transform: `translate3d(${parallaxX * -30}px, ${parallaxY * 20}px, 0) rotate(5deg)`,
        }}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-round-3-pink text-white font-label-code text-xs font-bold rounded-lg shadow-md border-2 border-ink-primary backdrop-blur-sm">
          <span>&lt;/&gt;</span> 0101_READY
        </span>
      </div>

      {/* Badge 3: Mid Left */}
      <div
        className="absolute top-1/3 left-4 lg:left-10 transition-transform duration-300 ease-out hidden lg:block"
        style={{
          transform: `translate3d(${parallaxX * 20}px, ${parallaxY * -25}px, 0) rotate(8deg)`,
        }}
      >
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-surface-card text-round-1-blue font-label-code text-xs font-extrabold rounded-lg shadow-sm border-2 border-ink-primary">
          <span className="material-symbols-outlined text-[14px]">bolt</span>
          ROUND_01
        </span>
      </div>

      {/* Badge 4: Mid Right */}
      <div
        className="absolute top-2/5 right-6 lg:right-12 transition-transform duration-300 ease-out hidden lg:block"
        style={{
          transform: `translate3d(${parallaxX * -22}px, ${parallaxY * -18}px, 0) rotate(-4deg)`,
        }}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-round-1-blue text-white font-label-code text-xs font-bold rounded-lg shadow-md border-2 border-ink-primary">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          MISSION_READY
        </span>
      </div>

      {/* Badge 5: Bottom Left */}
      <div
        className="absolute bottom-28 left-8 lg:left-24 transition-transform duration-300 ease-out hidden md:block"
        style={{
          transform: `translate3d(${parallaxX * 35}px, ${parallaxY * 15}px, 0) rotate(-10deg)`,
        }}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-high text-ink-primary font-label-code text-xs font-semibold rounded-lg shadow-sm border-2 border-ink-primary">
          <span className="material-symbols-outlined text-[14px] text-emerald-600">wifi</span>
          TEAM_ONLINE
        </span>
      </div>

      {/* Badge 6: Bottom Right */}
      <div
        className="absolute bottom-36 right-10 lg:right-28 transition-transform duration-300 ease-out hidden md:block"
        style={{
          transform: `translate3d(${parallaxX * -28}px, ${parallaxY * 30}px, 0) rotate(6deg)`,
        }}
      >
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-currency-gold/20 text-ink-primary font-label-code text-xs font-bold rounded-lg shadow-md border-2 border-ink-primary">
          <span>⚡</span> CODE.exe
        </span>
      </div>

      {/* Badge 7: Center Top Ambient */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 transition-transform duration-300 ease-out hidden xl:block"
        style={{
          transform: `translate3d(calc(-50% + ${parallaxX * 10}px), ${parallaxY * 10}px, 0)`,
        }}
      >
        <span className="inline-flex items-center gap-1 px-3 py-0.5 bg-ink-primary text-white font-label-code text-[11px] font-bold rounded-full shadow-sm border border-white/20">
          [ SYSTEM_ACTIVE ]
        </span>
      </div>
    </div>
  );
}
