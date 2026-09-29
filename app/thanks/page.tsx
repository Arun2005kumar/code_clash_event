'use client';

// app/thanks/page.tsx — Dedicated Thanks for Attending Page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { getTeamSession } from '@/lib/auth/session';
import ConfettiBurst from '@/components/animations/ConfettiBurst';
import ParticleNetworkCanvas from '@/components/home/ParticleNetworkCanvas';

export default function ThanksPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getTeamSession>>(null);

  useEffect(() => {
    setSession(getTeamSession());
  }, []);

  return (
    <div className="bg-[#090D16] min-h-screen text-on-surface font-body-md selection:bg-round-2-orange selection:text-ink-primary flex flex-col relative overflow-hidden">
      {/* Background Particles */}
      <div className="fixed inset-0 opacity-40 pointer-events-none z-0">
        <ParticleNetworkCanvas />
      </div>

      <ConfettiBurst trigger={true} />

      <Header />

      <main className="relative z-10 flex-grow pt-24 pb-16 px-margin-mobile lg:px-margin flex flex-col items-center justify-center text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-space-lg">
          
          {/* Trophy Icon */}
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-currency-gold via-round-2-orange to-round-3-purple p-1 shadow-[8px_8px_0px_#0F172A] animate-bounce">
              <div className="w-full h-full bg-[#0F172A] rounded-[22px] flex items-center justify-center">
                <span className="material-symbols-outlined text-[56px] text-currency-gold" style={{ fontVariationSettings: "'FILL' 1" }}>
                  military_tech
                </span>
              </div>
            </div>
            <div className="absolute -top-3 -right-3 bg-round-3-pink text-white font-label-sticker text-label-sticker px-2.5 py-1 rounded-full border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] -rotate-6 font-black uppercase">
              THAT'S A WRAP! 🎉
            </div>
          </div>

          {/* Headline */}
          <div className="flex flex-col items-center gap-space-xs">
            <h1 className="font-headline-lg text-4xl sm:text-6xl font-black tracking-tight text-canvas-cream uppercase leading-none">
              THANK YOU FOR ATTENDING! ⚡
            </h1>
            <p className="font-body-md text-lg sm:text-xl text-slate-300 max-w-xl font-medium mt-2">
              The battle of algorithms and auction strategies has officially concluded. We salute every brain that competed today!
            </p>
          </div>

          {/* Team Recognition */}
          {session ? (
            <div className="w-full bg-surface-card/90 backdrop-blur-xl border-2 border-ink-primary rounded-2xl p-space-lg shadow-[6px_6px_0px_#0F172A] flex flex-col items-center gap-space-sm">
              <span className="font-label-sticker text-label-sticker text-currency-gold uppercase font-black tracking-widest">
                PARTICIPANT HONOR ROLL
              </span>
              <h2 className="font-headline-md text-2xl sm:text-3xl font-black text-ink-primary uppercase tracking-tight">
                SALUTE TO TEAM <span className="text-round-1-blue font-black underline decoration-round-2-orange">{session.teamName}</span> 🏆
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-space-md text-body-sm text-ink-secondary pt-1 font-semibold">
                <span>Leader: {session.leaderName}</span>
                <span>•</span>
                <span>Reg: {session.leaderRegNo}</span>
              </div>
            </div>
          ) : (
            <div className="w-full bg-surface-card/90 backdrop-blur-xl border-2 border-ink-primary rounded-2xl p-space-md shadow-[6px_6px_0px_#0F172A]">
              <p className="font-headline-sm text-headline-sm font-bold text-ink-primary">
                To all participating teams &amp; coders — Thank you for bringing your A-Game! 🔥
              </p>
            </div>
          )}

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md w-full pt-space-md">
            <div className="bg-surface-card/80 backdrop-blur-md p-space-md rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex flex-col items-center text-center">
              <span className="font-label-ticker text-label-ticker text-round-1-blue font-black uppercase">ROUND 01</span>
              <span className="font-body-sm text-body-sm text-ink-secondary font-medium">MCQ Logic Sprint</span>
            </div>

            <div className="bg-surface-card/80 backdrop-blur-md p-space-md rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex flex-col items-center text-center">
              <span className="font-label-ticker text-label-ticker text-round-2-orange font-black uppercase">ROUND 02</span>
              <span className="font-body-sm text-body-sm text-ink-secondary font-medium">Code Auction Bidding</span>
            </div>

            <div className="bg-surface-card/80 backdrop-blur-md p-space-md rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex flex-col items-center text-center">
              <span className="font-label-ticker text-label-ticker text-round-3-purple font-black uppercase">ROUND 03</span>
              <span className="font-body-sm text-body-sm text-ink-secondary font-medium">Operation Tech Heist</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md w-full pt-space-md">
            <button
              onClick={() => router.push('/scoreboard')}
              className="w-full sm:w-auto px-space-xl py-space-md bg-round-1-blue hover:bg-primary text-on-primary font-headline-sm text-headline-sm font-black rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-[22px]">emoji_events</span>
              <span>VIEW FINAL SCOREBOARD</span>
            </button>
          </div>

        </div>
      </main>

      <footer className="relative z-10 w-full max-w-4xl mx-auto pb-space-lg px-margin-mobile lg:px-margin border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-space-md">
        <p className="font-body-sm text-body-sm text-slate-400">
          College Coding Club • Code Clash Event 2026
        </p>
        <div className="inline-block px-space-md py-1 bg-surface-card border-2 border-ink-primary rounded-full shadow-[2px_2px_0px_#0F172A] -rotate-1">
          <span className="font-label-sticker text-label-sticker text-ink-primary uppercase inline-flex items-center gap-1.5 font-extrabold">
            <img src="/logo.png" alt="Code Clash" className="w-4 h-4 object-contain inline-block" />
            Built with Team Vectonix ⚡
          </span>
        </div>
      </footer>
    </div>
  );
}
