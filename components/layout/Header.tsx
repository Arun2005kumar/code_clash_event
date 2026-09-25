'use client';

// components/layout/Header.tsx — Dynamic Stitch Design Header with Team Profile Popover & Switch Team

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getTeamSession, clearTeamSession } from '@/lib/auth/session';
import { TeamSession } from '@/types';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  activePath?: string;
}

export default function Header({ activePath }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<TeamSession | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeRound, setActiveRound] = useState<'round1' | 'round2' | 'round3'>('round1');
  const [activeRoundLabel, setActiveRoundLabel] = useState<string>('LIVE ARENA');
  const popoverRef = useRef<HTMLDivElement>(null);

  const refreshSession = () => {
    const s = getTeamSession();
    setSession(s);
  };

  useEffect(() => {
    refreshSession();

    const handleSessionEvent = () => refreshSession();
    window.addEventListener('team-session-change', handleSessionEvent);
    window.addEventListener('storage', handleSessionEvent);

    return () => {
      window.removeEventListener('team-session-change', handleSessionEvent);
      window.removeEventListener('storage', handleSessionEvent);
    };
  }, []);

  useEffect(() => {
    const fetchActiveRound = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('competition_settings')
          .select('round1_active, round2_active, round3_active')
          .limit(1)
          .maybeSingle();

        if (data) {
          if ((data as any).round3_active) {
            setActiveRound('round3');
            setActiveRoundLabel('ROUND 3 LIVE');
          } else if (data.round2_active) {
            setActiveRound('round2');
            setActiveRoundLabel('ROUND 2 LIVE');
          } else if (data.round1_active) {
            setActiveRound('round1');
            setActiveRoundLabel('ROUND 1 LIVE');
          } else {
            setActiveRound('round1');
            setActiveRoundLabel('ARENA READY');
          }
        }
      } catch (e) {
        // Fallback
      }
    };

    fetchActiveRound();

    const supabase = createClient();
    const channel = supabase
      .channel('public:competition_settings:header')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => {
        fetchActiveRound();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Click outside listener for popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchTeam = () => {
    clearTeamSession();
    setSession(null);
    setPopoverOpen(false);
    toast.info('Logged out from team session. Please log in with your team credentials.');
    router.push('/');
  };

  const isCurrent = (path: string) => {
    if (activePath) return activePath === path;
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-canvas-cream/95 backdrop-blur-md border-b-2 border-ink-primary">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex items-center justify-between gap-space-md">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-space-md">
          <Link href="/" className="flex items-center gap-space-sm group">
            <div className="w-9 h-9 rounded-lg bg-round-1-blue text-on-primary font-headline-sm text-headline-sm flex items-center justify-center font-black shadow-[2px_2px_0px_#0F172A] group-hover:translate-x-[1px] group-hover:translate-y-[1px] transition-transform border border-ink-primary">
              ⚡
            </div>
            <span className="font-headline-sm text-headline-sm text-ink-primary tracking-tight font-black hidden sm:inline-block">
              CODE::ARENA
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-space-xs px-space-sm py-1 bg-round-2-amber/20 border-2 border-ink-primary rounded-full shadow-[2px_2px_0px_#0F172A]">
            <span className="w-2 h-2 rounded-full bg-round-2-orange animate-ping"></span>
            <span className="font-label-ticker text-label-ticker text-on-secondary-container uppercase font-extrabold">
              {activeRoundLabel}
            </span>
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="hidden lg:flex items-center gap-space-xs p-1 bg-surface-muted border-2 border-ink-primary rounded-xl">
          {!session && (
            <>
              <Link
                href="/"
                className={`px-space-md py-space-xs font-label-ticker text-label-ticker uppercase transition-all ${
                  isCurrent('/') && !pathname.includes('admin') && !pathname.includes('round') && !pathname.includes('scoreboard')
                    ? 'bg-primary text-on-primary shadow-[2px_2px_0px_#0F172A] rounded-lg font-bold'
                    : 'text-on-surface-variant hover:text-ink-primary'
                }`}
              >
                Arena
              </Link>

              <Link
                href="/#mission-rounds"
                className="px-space-md py-space-xs font-label-ticker text-label-ticker uppercase text-on-surface-variant hover:text-ink-primary transition-all"
              >
                Rules
              </Link>
            </>
          )}

          <Link
            href={`/${activeRound}`}
            className={`px-space-md py-space-xs font-label-ticker text-label-ticker uppercase transition-all ${
              pathname.startsWith('/round')
                ? 'bg-primary text-on-primary shadow-[2px_2px_0px_#0F172A] rounded-lg font-bold'
                : 'text-on-surface-variant hover:text-ink-primary'
            }`}
          >
            Live Arena
          </Link>

          <Link
            href="/scoreboard"
            className={`px-space-md py-space-xs font-label-ticker text-label-ticker uppercase transition-all ${
              pathname.startsWith('/scoreboard')
                ? 'bg-primary text-on-primary shadow-[2px_2px_0px_#0F172A] rounded-lg font-bold'
                : 'text-on-surface-variant hover:text-ink-primary'
            }`}
          >
            Scoreboard
          </Link>

          {!session && (
            <Link
              href="/admin/dashboard"
              className={`px-space-md py-space-xs font-label-ticker text-label-ticker uppercase transition-all ${
                pathname.startsWith('/admin')
                  ? 'bg-primary text-on-primary shadow-[2px_2px_0px_#0F172A] rounded-lg font-bold'
                  : 'text-on-surface-variant hover:text-ink-primary'
              }`}
            >
              Admin Room
            </Link>
          )}
        </nav>

        {/* Right Team Pill & Dynamic Profile Popover */}
        <div className="flex items-center gap-space-sm relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setPopoverOpen(!popoverOpen)}
            className="flex items-center gap-space-xs bg-surface-card border-2 border-ink-primary rounded-lg px-space-sm py-1.5 shadow-[2px_2px_0px_#0F172A] hover:bg-surface-muted transition-all cursor-pointer group"
          >
            <span className="font-label-sticker text-label-sticker text-round-1-blue font-extrabold uppercase tracking-wide">
              {session?.teamName ? `#${session.teamName.toUpperCase().replace(/\s+/g, '-')}` : '#TEAM-LOGIN'}
            </span>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm border border-ink-primary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[16px]">person</span>
            </div>
          </button>

          {/* Popover Dropdown Menu */}
          {popoverOpen && (
            <div className="absolute right-0 top-12 w-72 bg-surface-card border-2 border-ink-primary rounded-xl shadow-2xl p-space-md flex flex-col gap-space-sm z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b pb-space-xs border-surface-muted">
                <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase">TEAM PROFILE</span>
                <span className="font-label-sticker text-label-sticker bg-status-correct/20 text-status-correct px-2 py-0.5 rounded font-bold">
                  {session ? 'ACTIVE SESSION' : 'GUEST'}
                </span>
              </div>

              {session ? (
                <div className="flex flex-col gap-space-xs bg-surface-muted p-space-sm rounded-lg border border-ink-primary font-body-sm text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Team Name:</span>
                    <strong className="text-ink-primary font-extrabold">{session.teamName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Leader Name:</span>
                    <strong className="text-ink-primary font-bold">{session.leaderName || 'Not set'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Reg Number:</span>
                    <strong className="font-label-code text-round-1-blue font-extrabold">{session.leaderRegNo || 'N/A'}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-space-sm bg-round-2-amber/20 text-ink-primary rounded-lg font-body-sm text-body-sm text-center">
                  No team logged in yet. Please log in on the home page.
                </div>
              )}

              <div className="flex flex-col gap-space-xs pt-space-xs">
                {session ? (
                  <>
                    <Link
                      href="/scoreboard"
                      onClick={() => setPopoverOpen(false)}
                      className="w-full py-space-sm px-space-md bg-round-3-purple/15 hover:bg-round-3-purple/25 text-round-3-purple rounded-lg font-label-ticker text-label-ticker font-extrabold flex items-center justify-center gap-space-xs border border-ink-primary shadow-sm transition-all text-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">leaderboard</span>
                      <span>VIEW SCOREBOARD</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSwitchTeam}
                      className="w-full py-space-sm px-space-md bg-status-wrong/15 hover:bg-status-wrong/25 text-status-wrong rounded-lg font-label-ticker text-label-ticker font-extrabold flex items-center justify-center gap-space-xs border border-ink-primary shadow-sm transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                      <span>LOGOUT / SWITCH TEAM</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/"
                    onClick={() => setPopoverOpen(false)}
                    className="w-full py-space-sm px-space-md bg-primary text-on-primary rounded-lg font-label-ticker text-label-ticker font-extrabold flex items-center justify-center gap-space-xs border border-ink-primary shadow-sm hover:bg-primary-container transition-all text-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>GO TO TEAM LOGIN</span>
                  </Link>
                )}

                <Link
                  href="/admin/login"
                  onClick={() => setPopoverOpen(false)}
                  className="w-full py-1 text-center font-label-sticker text-label-sticker text-ink-secondary hover:text-ink-primary underline uppercase transition-colors"
                >
                  Admin Portal Login →
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
