'use client';

// components/layout/EventEndedGuard.tsx — Realtime "Thanks for Attending" Full-Screen Takeover
import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import ConfettiBurst from '@/components/animations/ConfettiBurst';
import ParticleNetworkCanvas from '@/components/home/ParticleNetworkCanvas';

export default function EventEndedGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const [eventEnded, setEventEnded] = useState(false);
  const [session, setSession] = useState<ReturnType<typeof getTeamSession>>(null);
  const [confetti, setConfetti] = useState(false);

  const checkStatus = useCallback(async () => {
    // Exclude admin pages so admin can control settings without being blocked
    if (pathname?.startsWith('/admin')) {
      setEventEnded(false);
      return;
    }

    const supabase = createClient();
    const { data: settings } = await supabase
      .from('competition_settings')
      .select('event_ended, current_round')
      .limit(1)
      .maybeSingle();

    const isEnded = !!(settings?.event_ended || settings?.current_round === 99);
    setEventEnded(isEnded);

    if (isEnded) {
      setConfetti(true);
    }
  }, [pathname]);

  useEffect(() => {
    setSession(getTeamSession());
    checkStatus();

    const supabase = createClient();
    const channel = supabase
      .channel('public:competition_settings:thanks_guard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => {
        checkStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkStatus]);

  if (!eventEnded || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-[#090D16] text-on-surface font-body-md overflow-y-auto selection:bg-round-2-orange selection:text-ink-primary">
      {/* Background Interactive Particle Canvas */}
      <div className="fixed inset-0 opacity-40 pointer-events-none z-0">
        <ParticleNetworkCanvas />
      </div>

      <ConfettiBurst trigger={confetti} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-between p-margin-mobile lg:p-margin py-space-xl text-center">
        
        {/* Header Branding */}
        <header className="w-full max-w-4xl mx-auto flex items-center justify-between pt-4">
          <div className="inline-flex items-center gap-2 bg-surface-card/80 backdrop-blur-md px-space-md py-1.5 rounded-full border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A]">
            <img src="/logo.png" alt="Code Clash Logo" className="w-5 h-5 object-contain" />
            <span className="font-label-ticker text-label-ticker text-ink-primary font-black uppercase tracking-wider">
              CODING CLUB PRESENTS • CODE CLASH
            </span>
          </div>

          <button
            onClick={() => router.push('/scoreboard')}
            className="px-space-md py-1.5 bg-round-1-blue hover:bg-primary text-on-primary font-label-ticker text-label-ticker font-black rounded-full border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">leaderboard</span>
            <span>LIVE LEADERBOARD</span>
          </button>
        </header>

        {/* Hero Section */}
        <main className="my-auto py-space-xl max-w-3xl mx-auto flex flex-col items-center gap-space-lg">
          
          {/* Animated Trophy Decal */}
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

          {/* Title & Subtitle */}
          <div className="flex flex-col items-center gap-space-xs">
            <h1 className="font-headline-lg text-4xl sm:text-6xl font-black tracking-tight text-canvas-cream uppercase leading-none">
              THANK YOU FOR ATTENDING! ⚡
            </h1>
            <p className="font-body-md text-lg sm:text-xl text-slate-300 max-w-xl font-medium mt-2">
              The battle of algorithms and auction strategies has officially concluded. We salute every brain that competed today!
            </p>
          </div>

          {/* Team Recognition Card (If Logged In) */}
          {session ? (
            <div className="w-full bg-surface-card/90 backdrop-blur-xl border-2 border-ink-primary rounded-2xl p-space-lg shadow-[6px_6px_0px_#0F172A] flex flex-col items-center gap-space-sm">
              <span className="font-label-sticker text-label-sticker text-currency-gold uppercase font-black tracking-widest">
                PARTICIPANT HONOR ROLL
              </span>
              <h2 className="font-headline-md text-2xl sm:text-3xl font-black text-ink-primary uppercase tracking-tight">
                SALUTE TO TEAM <span className="text-round-1-blue font-black underline decoration-round-2-orange">{session.teamName}</span> 🏆
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-space-md text-body-sm text-ink-secondary pt-1 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-round-1-blue">person</span>
                  Leader: {session.leaderName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-round-2-orange">badge</span>
                  Reg: {session.leaderRegNo}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full bg-surface-card/90 backdrop-blur-xl border-2 border-ink-primary rounded-2xl p-space-md shadow-[6px_6px_0px_#0F172A]">
              <p className="font-headline-sm text-headline-sm font-bold text-ink-primary">
                To all participating teams &amp; coders — Thank you for bringing your A-Game! 🔥
              </p>
            </div>
          )}

          {/* Event Highlights Recap Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md w-full pt-space-md">
            <div className="bg-surface-card/80 backdrop-blur-md p-space-md rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-round-1-blue/20 text-round-1-blue border border-ink-primary flex items-center justify-center mb-2 font-bold">
                ⚡
              </div>
              <span className="font-label-ticker text-label-ticker text-ink-primary font-black uppercase">ROUND 1</span>
              <span className="font-body-sm text-body-sm text-ink-secondary font-medium">MCQ Logic Sprint</span>
            </div>

            <div className="bg-surface-card/80 backdrop-blur-md p-space-md rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-round-2-orange/20 text-round-2-orange border border-ink-primary flex items-center justify-center mb-2 font-bold">
                🎯
              </div>
              <span className="font-label-ticker text-label-ticker text-ink-primary font-black uppercase">ROUND 2</span>
              <span className="font-body-sm text-body-sm text-ink-secondary font-medium">Code Auction Bidding</span>
            </div>

            <div className="bg-surface-card/80 backdrop-blur-md p-space-md rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-round-3-purple/20 text-round-3-purple border border-ink-primary flex items-center justify-center mb-2 font-bold">
                🔓
              </div>
              <span className="font-label-ticker text-label-ticker text-ink-primary font-black uppercase">ROUND 3</span>
              <span className="font-body-sm text-body-sm text-ink-secondary font-medium">Operation Tech Heist</span>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md w-full pt-space-md">
            <button
              onClick={() => router.push('/scoreboard')}
              className="w-full sm:w-auto px-space-xl py-space-md bg-round-1-blue hover:bg-primary text-on-primary font-headline-sm text-headline-sm font-black rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-[22px]">emoji_events</span>
              <span>CHECK FINAL STANDINGS</span>
            </button>
          </div>

        </main>

        {/* Footer Signature */}
        <footer className="w-full max-w-4xl mx-auto pt-space-lg border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-space-md">
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
    </div>
  );
}
