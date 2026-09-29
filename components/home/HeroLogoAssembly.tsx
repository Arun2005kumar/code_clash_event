'use client';

import { useState, useEffect } from 'react';

interface HeroLogoAssemblyProps {
  onLogoClick?: () => void;
  parallaxX?: number;
  parallaxY?: number;
}

const SYMBOLS = [
  { id: 'scout', name: 'SCOUT', icon: 'radar', color: 'bg-blue-600 text-white border-blue-400', dir: '-translate-x-12 -translate-y-8' },
  { id: 'strategist', name: 'STRATEGIST', icon: 'psychology', color: 'bg-purple-600 text-white border-purple-400', dir: 'translate-x-12 -translate-y-8' },
  { id: 'coder', name: 'CODER', icon: 'code', color: 'bg-amber-500 text-black border-amber-300', dir: '-translate-x-16 translate-y-4' },
  { id: 'debugger', name: 'DEBUGGER', icon: 'bug_report', color: 'bg-emerald-600 text-white border-emerald-400', dir: 'translate-x-16 translate-y-4' },
  { id: 'finalist', name: 'FINALIST', icon: 'military_tech', color: 'bg-rose-600 text-white border-rose-400', dir: 'translate-y-12' },
];

export default function HeroLogoAssembly({ onLogoClick, parallaxX = 0, parallaxY = 0 }: HeroLogoAssemblyProps) {
  const [stage, setStage] = useState(0); // 0 to 5 for symbol reveal
  const [assemblyState, setAssemblyState] = useState<'assembling' | 'assembled' | 'ready' | 'settled'>('assembling');
  const [isHovered, setIsHovered] = useState(false);
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [energyWave, setEnergyWave] = useState(false);

  // 1. Superhero Assembly Sequence
  useEffect(() => {
    // Reveal symbols one by one every 400ms
    const interval = setInterval(() => {
      setStage((prev) => {
        if (prev < 5) return prev + 1;
        clearInterval(interval);
        return 5;
      });
    }, 450);

    return () => clearInterval(interval);
  }, []);

  // 2. Banner sequence after assembly
  useEffect(() => {
    if (stage === 5) {
      setAssemblyState('assembled'); // "TEAM ASSEMBLED"
      const t1 = setTimeout(() => setAssemblyState('ready'), 1400); // "MISSION READY"
      const t2 = setTimeout(() => setAssemblyState('settled'), 3000); // Settles
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [stage]);

  // 3. Periodic Energy Wave every 20 seconds
  useEffect(() => {
    const energyTimer = setInterval(() => {
      setEnergyWave(true);
      setTimeout(() => setEnergyWave(false), 2500);
    }, 20000);

    return () => clearInterval(energyTimer);
  }, []);

  const handleLogoClick = () => {
    setMissionModalOpen(true);
    if (onLogoClick) onLogoClick();
  };

  return (
    <div className="flex flex-col items-center justify-center relative w-full select-none z-20">
      
      {/* ── Periodic Scanning Energy Wave Overlay ── */}
      {energyWave && (
        <div className="absolute -inset-x-32 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-amber-500 blur-sm animate-pulse z-0 pointer-events-none" />
      )}

      {/* ── Cheerful Event Badge ── */}
      <div className="inline-flex items-center gap-space-xs px-space-md py-1.5 bg-currency-gold/20 text-on-secondary-container rounded-full shadow-sm mb-space-md transform hover:scale-105 transition-transform duration-200 border border-ink-primary/30">
        <img src="/logo.png" alt="Code Clash Logo" className="w-6 h-6 object-contain" />
        <span className="font-label-ticker text-label-ticker uppercase tracking-wider text-ink-primary font-extrabold">
          CODING CLUB PRESENTS
        </span>
      </div>

      {/* ── MAIN LOGO COCKPIT WITH HOLOGRAPHIC RINGS & SYMBOLS ── */}
      <div className="relative flex items-center justify-center my-4 mb-10 sm:mb-12 group cursor-pointer" onClick={handleLogoClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        
        {/* Holographic Circular Energy Ring */}
        <div
          className={`absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-dashed ${
            isHovered ? 'border-amber-500 scale-110 rotate-180 duration-700' : 'border-blue-500/40 animate-spin-slow'
          } transition-all pointer-events-none`}
          style={{ animationDuration: isHovered ? '6s' : '18s' }}
        />

        {/* Outer Glow Orb */}
        <div className={`absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-round-1-blue/20 blur-2xl transition-all duration-500 ${isHovered ? 'scale-125 bg-amber-500/30' : ''}`} />

        {/* Scanning Beam Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent pointer-events-none opacity-30 animate-pulse rounded-full" />

        {/* Official Logo Image */}
        <img
          src="/logo.png"
          alt="Code Clash Official Logo"
          className={`w-32 h-32 sm:w-44 sm:h-44 object-contain relative z-10 drop-shadow-[4px_4px_0px_#0F172A] transition-all duration-300 ${
            isHovered ? 'scale-110 drop-shadow-[6px_6px_0px_#2563EB]' : 'hover:scale-105'
          }`}
          style={{
            transform: `translate3d(${parallaxX * 10}px, ${parallaxY * 10}px, 0) ${isHovered ? 'scale(1.1)' : 'scale(1)'}`,
          }}
        />

        {/* 5 Holographic Team Assembly Badges Orbiting Logo cleanly */}
        {SYMBOLS.map((sym, idx) => {
          const isUnlocked = stage > idx;
          // Position mapping:
          // 0 (Scout): Top-Left
          // 1 (Strategist): Top-Right
          // 2 (Coder): Mid-Left
          // 3 (Debugger): Mid-Right
          // 4 (Finalist): Bottom-Center (above heading)
          let posStyle: React.CSSProperties = {};
          if (idx === 0) posStyle = { top: '-12%', left: '-18%' };
          else if (idx === 1) posStyle = { top: '-12%', right: '-18%' };
          else if (idx === 2) posStyle = { top: '35%', left: '-30%' };
          else if (idx === 3) posStyle = { top: '35%', right: '-30%' };
          else if (idx === 4) posStyle = { bottom: '-22%', left: '50%', transform: 'translateX(-50%)' };

          return (
            <div
              key={sym.id}
              className={`absolute z-20 transition-all duration-500 ease-out flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md ${
                sym.color
              } ${isUnlocked ? 'opacity-100 scale-100' : 'opacity-0 scale-50 ' + sym.dir}`}
              style={posStyle}
            >
              <span className="material-symbols-outlined text-[15px]">{sym.icon}</span>
              <span>{sym.name}</span>
            </div>
          );
        })}
      </div>

      {/* ── CENTER BANNER: "TEAM ASSEMBLED" / "MISSION READY" ── */}
      {assemblyState !== 'settled' && (
        <div className="my-3 transition-all duration-500 animate-bounce">
          <div className="px-4 py-1.5 bg-ink-primary text-white font-label-ticker text-xs sm:text-sm font-extrabold uppercase tracking-widest rounded-full shadow-lg border-2 border-currency-gold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{assemblyState === 'assembled' ? '⚡ TEAM ASSEMBLED' : '🚀 MISSION READY'}</span>
          </div>
        </div>
      )}

      {/* ── MAIN HEADING & TAGLINE ── */}
      <div className="flex flex-col items-center justify-center gap-2 mb-space-sm mt-2">
        <h1 className="font-display-xl text-display-xl text-ink-primary tracking-tight">
          CODE{' '}
          <span className="relative inline-block text-primary-container">
            CLASH
            <svg
              className="absolute -bottom-2 left-0 w-full h-3 text-secondary-container"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 200 12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M3 9C45 3 155 3 197 9" stroke="currentColor" strokeLinecap="round" strokeWidth="6"></path>
            </svg>
          </span>
        </h1>
      </div>
      <p className="font-headline-md text-headline-md text-ink-secondary mt-space-xs max-w-2xl text-center">
        Three rounds. One team. Zero excuses.
      </p>

      {/* ── INTERACTIVE LOGO CLICK MODAL ("MISSION ACTIVATED") ── */}
      {missionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/70 backdrop-blur-md animate-fade-in">
          <div className="bg-surface-card border-4 border-ink-primary rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden flex flex-col items-center gap-4">
            
            <div className="w-20 h-20 rounded-full bg-round-1-blue/20 text-round-1-blue border-2 border-ink-primary flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-4xl">rocket_launch</span>
            </div>

            <div className="space-y-1">
              <span className="bg-round-2-orange text-white font-label-sticker text-xs font-black px-3 py-1 rounded-full uppercase">
                MISSION ACTIVATED
              </span>
              <h3 className="text-3xl font-black text-ink-primary tracking-tight mt-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                CODE CLASH // ROUND 01
              </h3>
              <p className="text-sm font-semibold text-ink-secondary">
                The terminal is active. Enter your squad details below to lock into the Arena!
              </p>
            </div>

            <button
              onClick={() => setMissionModalOpen(false)}
              className="w-full py-3 bg-round-1-blue hover:bg-primary text-white font-black text-sm uppercase rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] active:translate-y-1 transition-all cursor-pointer"
            >
              ENGAGE ARENA TERMINAL →
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
