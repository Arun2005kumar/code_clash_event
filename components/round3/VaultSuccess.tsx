'use client';

// components/round3/VaultSuccess.tsx
import Link from 'next/link';

interface VaultSuccessProps {
  teamName: string;
  finishTimeSeconds?: number;
}

export default function VaultSuccess({ teamName, finishTimeSeconds }: VaultSuccessProps) {
  const mins = finishTimeSeconds ? String(Math.floor(finishTimeSeconds / 60)).padStart(2, '0') : '26';
  const secs = finishTimeSeconds ? String(finishTimeSeconds % 60).padStart(2, '0') : '14';

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-space-lg my-space-lg">
      <div className="relative bg-surface-card rounded-xl p-space-lg overflow-hidden shadow-xl border-2 border-ink-primary">
        {/* Festive Confetti / Light Rays Backdrop */}
        <div className="absolute -right-24 -top-24 w-64 h-64 bg-status-correct/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 bottom-10 w-56 h-56 bg-round-3-pink/15 rounded-full blur-3xl pointer-events-none" />

        {/* TOP ACCESS BADGE */}
        <div className="flex items-center justify-between pb-space-sm border-b-2 border-surface-muted">
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-status-correct text-on-primary rounded-full font-label-ticker text-label-ticker shadow-sm border border-ink-primary font-black animate-bounce">
            <span className="material-symbols-outlined text-[18px]">lock_open</span>
            <span>🔓 VAULT BREACHED</span>
          </div>
          <span className="px-space-sm py-space-xs bg-status-correct/15 text-status-correct rounded-md font-label-sticker text-label-sticker font-extrabold border border-status-correct/30">
            5/5 CLUES VERIFIED
          </span>
        </div>

        {/* CELEBRATION HEADLINES */}
        <div className="mt-space-md">
          <div className="font-label-sticker text-label-sticker text-round-3-purple tracking-widest uppercase font-bold">
            STAGE 03 CLEAR // HEIST ACCOMPLISHED
          </div>
          <h2 className="font-headline-lg text-headline-lg text-ink-primary mt-1 tracking-tight leading-none font-black uppercase">
            OPERATION: TECH HEIST COMPLETE
          </h2>

          <div className="mt-space-sm p-space-sm bg-surface-container rounded-lg flex items-center gap-space-sm border border-ink-primary">
            <span className="w-8 h-8 rounded-full bg-status-correct flex items-center justify-center text-on-primary font-bold text-sm shrink-0 border border-ink-primary">
              ✓
            </span>
            <div>
              <span className="font-headline-sm text-body-md text-ink-primary font-bold block uppercase">
                TEAM {teamName.toUpperCase()} HAS BREACHED THE MAIN VAULT!
              </span>
              <span className="font-body-sm text-body-sm text-status-correct font-bold">
                Campus Mainframe Core Successfully Decrypted
              </span>
            </div>
          </div>
        </div>

        {/* TIME LOCK STAMP */}
        <div className="mt-space-md bg-inverse-surface text-inverse-on-surface rounded-xl p-space-md flex items-center justify-between border-2 border-ink-primary">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-currency-gold text-[28px]">timer</span>
            <div>
              <div className="font-label-sticker text-[11px] text-surface-variant tracking-wider font-bold">
                OFFICIAL VAULT BREACH RUNTIME
              </div>
              <div className="font-label-code text-headline-sm text-inverse-on-surface font-bold">
                ⏱ {mins}:{secs}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-space-sm py-0.5 bg-status-correct text-on-primary rounded font-label-sticker text-label-sticker font-bold border border-ink-primary">
              FINISHED
            </span>
            <span className="block font-label-code text-[11px] text-surface-variant mt-0.5 font-bold">
              PODIUM SECURED
            </span>
          </div>
        </div>

        {/* REWARDS BENTO STRIP */}
        <div className="mt-space-md">
          <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase tracking-wider block mb-space-xs font-bold">
            LOOT RECOVERED &amp; BADGES UNLOCKED
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-xs">
            <div className="bg-surface-container-high p-space-sm rounded-lg flex flex-col items-center text-center justify-center border border-ink-primary">
              <span className="text-[24px]">⚡</span>
              <span className="font-headline-sm text-body-md text-ink-primary font-bold mt-1">+10 PTS</span>
              <span className="font-label-sticker text-[10px] text-ink-secondary uppercase font-bold">VAULT BONUS</span>
            </div>
            <div className="bg-currency-gold/15 p-space-sm rounded-lg flex flex-col items-center text-center justify-center border border-currency-gold/30">
              <span className="text-[24px]">🪙</span>
              <span className="font-headline-sm text-body-md text-on-secondary-fixed font-bold mt-1">100 COINS</span>
              <span className="font-label-sticker text-[10px] text-on-secondary-fixed uppercase font-bold">PRESERVED</span>
            </div>
            <div className="bg-tertiary-fixed p-space-sm rounded-lg flex flex-col items-center text-center justify-center border border-ink-primary">
              <span className="text-[24px]">🏆</span>
              <span className="font-headline-sm text-body-md text-on-tertiary-fixed font-bold mt-1">TROPHY</span>
              <span className="font-label-sticker text-[10px] text-on-tertiary-fixed uppercase font-bold">VAULT CRACKER</span>
            </div>
          </div>
        </div>

        {/* WITTY QUOTE */}
        <div className="mt-space-md p-space-md bg-canvas-cream rounded-xl border-2 border-ink-primary relative overflow-hidden">
          <p className="font-body-md text-body-md italic text-ink-primary font-semibold leading-relaxed relative z-10">
            “Nice work. The mainframe never stood a chance. Your compiler is weeping tears of absolute joy.”
          </p>
          <div className="mt-space-xs flex items-center justify-between text-ink-secondary font-label-sticker text-[11px] font-bold relative z-10">
            <span>— CODING CLUB ARCHITECTS</span>
            <span className="text-round-3-purple font-bold">[LEET_STATUS: MAX]</span>
          </div>
        </div>

        {/* CELEBRATION ACTION BUTTONS */}
        <div className="mt-space-lg flex flex-col gap-space-sm">
          <Link
            href="/round3/result"
            className="w-full py-space-sm px-space-md bg-primary text-on-primary rounded-xl font-headline-sm text-headline-sm font-black flex items-center justify-center gap-space-xs hover:bg-primary/90 transition-all shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary text-center"
          >
            <span>VIEW FINAL ROUND 3 SUMMARY</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <Link
            href="/round3/bonus"
            className="w-full py-space-sm px-space-md bg-canvas-cream hover:bg-surface-container text-ink-primary rounded-xl font-headline-sm text-label-ticker flex items-center justify-center gap-space-xs transition-all shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary text-center"
          >
            <span className="text-round-2-orange">⚡</span>
            <span>ATTEMPT BONUS FAST-FINISHER RIDDLE</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
