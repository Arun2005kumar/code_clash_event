'use client';

// components/round3/MissionHub.tsx
import Link from 'next/link';
import MissionCard from './MissionCard';
import Round3Timer from './Round3Timer';
import { Round3Mission, Round3MissionAttempt, Round3TeamState } from '@/types';

interface MissionHubProps {
  teamName: string;
  missions: Round3Mission[];
  attempts: Round3MissionAttempt[];
  teamState: Round3TeamState | null;
}

export default function MissionHub({ teamName, missions, attempts, teamState }: MissionHubProps) {
  const solvedMap = new Map<number, Round3MissionAttempt>();
  attempts.forEach(a => {
    if (a.is_correct) solvedMap.set(a.mission_number, a);
  });

  const solvedCount = solvedMap.size;
  const isVaultReady = solvedCount >= 5;

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* TOP STATUS & HUD BAR */}
      <section className="w-full pt-space-md pb-space-lg">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md p-space-md bg-surface-card rounded-xl shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-36 h-36 bg-round-3-purple/10 rounded-full pointer-events-none blur-xl" />
          
          {/* Left: Round Badge & Mode Specs */}
          <div className="flex flex-wrap items-center gap-space-sm z-10">
            <div className="flex items-center gap-space-xs px-space-md py-space-xs bg-round-3-purple text-on-tertiary rounded-lg shadow-[2px_2px_0px_#0F172A] border border-ink-primary transform -rotate-1">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span className="font-headline-sm text-label-ticker tracking-wider uppercase font-black">
                ROUND 03 — CODE CLASH
              </span>
            </div>
            <div className="px-space-sm py-space-xs bg-surface-container-highest text-ink-primary rounded-md font-label-sticker text-label-sticker uppercase border border-ink-primary font-bold">
              OPERATION: TECH HEIST
            </div>
            <div className="px-space-sm py-space-xs bg-round-3-pink/15 text-round-3-pink rounded-md font-label-sticker text-label-sticker uppercase border border-round-3-pink/30 font-bold">
              5-MISSION PUZZLE HUNT
            </div>
          </div>

          {/* Right: Team Economy & Heist Chrono */}
          <div className="flex flex-wrap items-center gap-space-sm z-10">
            {/* Team Purse */}
            <div className="flex items-center gap-space-xs px-space-md py-space-xs bg-canvas-cream text-ink-primary rounded-lg shadow-[2px_2px_0px_#0F172A] border border-ink-primary">
              <span className="text-round-2-amber text-[18px] leading-none">🪙</span>
              <div className="flex flex-col">
                <span className="font-label-sticker text-label-sticker text-ink-secondary leading-none font-bold">
                  TEAM PURSE
                </span>
                <span className="font-headline-sm text-body-md font-black text-ink-primary">
                  100 Coins
                </span>
              </div>
            </div>

            {/* Team Info */}
            <div className="flex items-center gap-space-xs px-space-md py-space-xs bg-canvas-cream text-ink-primary rounded-lg shadow-[2px_2px_0px_#0F172A] border border-ink-primary">
              <span className="material-symbols-outlined text-primary text-[18px]">group</span>
              <div className="flex flex-col">
                <span className="font-label-sticker text-label-sticker text-ink-secondary leading-none font-bold">
                  TEAM
                </span>
                <span className="font-headline-sm text-body-md font-black text-ink-primary">
                  {teamName}
                </span>
              </div>
            </div>

            {/* Prominent Global Timer */}
            {teamState?.team_id && (
              <Round3Timer teamId={teamState.team_id} />
            )}
          </div>
        </div>
      </section>

      {/* HERO STRIP & INTRO DECK */}
      <section className="w-full mb-space-lg">
        <div className="p-space-lg lg:p-space-xl bg-canvas-cream rounded-xl shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary relative overflow-hidden">
          <div className="absolute -top-2 right-8 hidden md:flex items-center gap-space-xs px-space-md py-space-xs bg-round-2-amber text-ink-primary font-label-sticker text-label-sticker rounded-full shadow-[2px_2px_0px_#0F172A] border border-ink-primary transform rotate-3 z-10 font-bold">
            <span>⚡ NERD MODE ON</span>
          </div>
          <div className="max-w-3xl flex flex-col gap-space-sm z-10 relative">
            <div className="inline-flex items-center gap-space-xs px-space-sm py-0.5 bg-tertiary-fixed text-on-tertiary-fixed rounded-full w-fit font-label-sticker text-label-sticker border border-ink-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-round-3-purple" />
              <span>HEIST PROTOCOL ENGAGED</span>
            </div>
            <h1 className="font-display-xl text-headline-lg lg:text-display-xl text-ink-primary tracking-tight font-black leading-tight">
              OPERATION: TECH HEIST <span className="inline-block transform hover:rotate-12 transition-transform">🕵️‍♂️</span>
            </h1>
            <p className="font-body-lg text-body-md lg:text-body-lg text-ink-secondary font-medium max-w-2xl">
              Five missions. Five clues. One final vault. Solve the cryptographic puzzles, extract the secret keys, and infiltrate the central mainframe before the timer exhausts.
            </p>

            <div className="pt-space-sm flex flex-wrap items-center gap-space-sm">
              <div className="flex items-center gap-space-xs px-space-md py-space-xs bg-surface-card rounded-lg shadow-[2px_2px_0px_#0F172A] border border-ink-primary">
                <span className="material-symbols-outlined text-round-2-orange text-[18px]">
                  {isVaultReady ? 'lock_open' : 'lock'}
                </span>
                <span className="font-label-sticker text-label-sticker text-ink-primary font-bold">
                  VAULT STATUS: {isVaultReady ? 'UNLOCKED 🔓' : 'LOCKED 🔒'} ({solvedCount}/5 KEYS RECOVERED)
                </span>
              </div>
              <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-status-correct/15 text-status-correct rounded-md font-label-sticker text-label-sticker font-bold border border-status-correct/30">
                <span>KEY EXTRACTION: {Math.round((solvedCount / 5) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION TILES GRID */}
      <section className="w-full mb-space-xl">
        <div className="flex items-center justify-between mb-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="font-headline-md text-headline-md text-ink-primary font-black uppercase">
              INFILTRATION TARGETS
            </span>
            <span className="px-space-sm py-space-xs bg-surface-container-high rounded-full font-label-code text-label-code text-ink-secondary border border-ink-primary font-bold">
              5 STAGES
            </span>
          </div>
          <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase font-bold">
            Click active node to breach
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {missions.map(mission => {
            const isAvailable = mission.mission_number === 1 || solvedMap.has(mission.mission_number - 1);
            return (
              <MissionCard
                key={mission.id}
                mission={mission}
                attempt={solvedMap.get(mission.mission_number)}
                isAvailable={isAvailable}
              />
            );
          })}
        </div>
      </section>

      {/* VAULT CRACKER PREVIEW BAR AT BOTTOM */}
      <section className="w-full">
        <div className="p-space-lg bg-surface-card rounded-xl shadow-[4px_4px_0px_#0F172A] border-2 border-ink-primary relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-sm pb-space-md mb-space-md border-b-2 border-surface-muted">
            <div className="flex items-center gap-space-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-round-3-pink inline-block border border-ink-primary" />
                <span className="w-3 h-3 rounded-full bg-round-2-amber inline-block border border-ink-primary" />
                <span className="w-3 h-3 rounded-full bg-status-correct inline-block border border-ink-primary" />
              </div>
              <span className="font-label-sticker text-label-ticker text-ink-primary font-bold tracking-wider uppercase">
                CENTRAL DIGITAL VAULT DECK // ACCESS SYSTEM
              </span>
            </div>
            <div className="font-label-code text-label-sticker text-ink-secondary">
              CHASSIS_ID: #HEIST-VAULT-R3
            </div>
          </div>

          {/* Key Slots Array */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-space-sm mb-space-lg">
            {[1, 2, 3, 4, 5].map(mNum => {
              const attempt = solvedMap.get(mNum);
              const isSolved = attempt?.is_correct ?? false;
              const clue = attempt?.clue_piece_revealed;
              return (
                <div
                  key={mNum}
                  className={`p-space-sm rounded-lg shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-1 ${
                    isSolved ? 'bg-status-correct/10' : 'bg-canvas-cream opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-label-sticker text-[10px] text-ink-secondary font-bold">
                      KEY SLOT {mNum}
                    </span>
                    <span className="material-symbols-outlined text-[16px]">
                      {isSolved ? 'check_circle' : 'lock'}
                    </span>
                  </div>
                  <span className="font-headline-sm text-body-md text-ink-primary font-bold">
                    {isSolved ? clue : '[?] LOCKED'}
                  </span>
                  <span
                    className={`font-label-sticker text-[10px] font-bold uppercase ${
                      isSolved ? 'text-status-correct' : 'text-ink-secondary'
                    }`}
                  >
                    {isSolved ? 'SECURED ✓' : 'UNSEARCHED'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action Master Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md">
            {isVaultReady ? (
              <Link
                href="/round3/vault"
                className="py-space-md px-space-lg bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-headline-sm font-black rounded-xl shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex items-center justify-center gap-space-sm transition-all animate-pulse"
              >
                <span className="material-symbols-outlined text-[22px]">lock_open</span>
                <span>ENTER DIGITAL VAULT DECK (ALL 5 KEYS SECURED!) 🔓</span>
              </Link>
            ) : (
              <button
                disabled
                className="py-space-md px-space-lg bg-surface-container text-ink-secondary font-headline-sm text-label-ticker rounded-xl shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary cursor-not-allowed flex items-center justify-center gap-space-sm"
              >
                <span className="material-symbols-outlined text-[22px]">lock_person</span>
                <span>CRACK DIGITAL VAULT (LOCKED — {5 - solvedCount} KEYS REMAINING) 🔒</span>
              </button>
            )}

            <div className="flex items-center gap-space-xs text-ink-secondary font-body-sm text-body-sm italic">
              <span className="material-symbols-outlined text-[18px] text-round-3-purple">info</span>
              <span>“Your brain has been selected for suspicious activity.”</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
