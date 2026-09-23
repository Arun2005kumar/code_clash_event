'use client';

// app/admin/layout.tsx — Stitch Admin Layout with Navigation & Master Control Header

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const NAV = [
  { href: '/admin/dashboard', icon: 'tune', label: 'Stage Controls' },
  { href: '/admin/round1', icon: 'timer', label: 'Round Manager' },
  { href: '/admin/round2/auction', icon: 'gavel', label: 'Auction Engine', hasLive: true },
  { href: '/admin/teams', icon: 'group', label: 'Teams & Scores' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    if (pathname === '/admin/login') { setChecking(false); return; }
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/admin/login'); return; }
      setAdminEmail(user.email ?? '');
      setChecking(false);
    };
    check();
  }, [pathname, router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Logged out.');
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') return <>{children}</>;
  if (checking) {
    return (
      <div className="min-h-screen bg-canvas-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-round-1-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-cream font-body-md text-body-md text-ink-primary">
      {/* SIDEBAR NAVIGATION (64 / 256px) */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-card border-r-2 border-ink-primary z-50 flex flex-col justify-between py-space-md shadow-xl">
        <div className="flex flex-col gap-space-md">
          {/* Window Controls Dot Header */}
          <div className="px-space-md flex items-center gap-space-xs">
            <div className="w-3 h-3 rounded-full bg-status-wrong border-2 border-ink-primary"></div>
            <div className="w-3 h-3 rounded-full bg-currency-gold border-2 border-ink-primary"></div>
            <div className="w-3 h-3 rounded-full bg-status-correct border-2 border-ink-primary"></div>
            <span className="ml-2 font-label-sticker text-label-sticker text-ink-secondary">ADMIN CONSOLE</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-space-xs px-space-sm">
            {NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center px-space-md py-space-sm uppercase transition-all rounded-lg cursor-pointer ${
                      isActive
                        ? 'bg-ink-primary text-canvas-cream shadow-[3px_3px_0px_#2563EB] font-bold'
                        : 'text-on-surface-variant font-label-ticker text-label-ticker hover:bg-surface-muted hover:text-ink-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-space-sm text-[20px]">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.hasLive && (
                      <span className="flex h-2 w-2 relative ml-auto">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-round-2-orange opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-round-2-orange" />
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Root Status Card */}
        <div className="px-space-md flex flex-col gap-space-sm">
          <div className="p-space-sm bg-surface-muted border-2 border-ink-primary rounded-lg text-center rotate-1 shadow-sm">
            <span className="font-label-sticker text-label-sticker text-ink-primary uppercase block font-black">ROOT PRIVILEGES ACTIVE</span>
            <span className="font-body-sm text-[10px] text-ink-secondary block truncate">{adminEmail || 'admin@codingclub.com'}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-1 text-center font-label-sticker text-label-sticker text-status-wrong hover:underline cursor-pointer uppercase"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="pl-64">
        {/* FIXED TOP HEADER */}
        <header className="fixed top-0 left-64 right-0 h-20 bg-canvas-cream/95 backdrop-blur-md border-b-2 border-ink-primary z-40 px-space-md flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <div className="w-8 h-8 rounded-lg bg-round-1-blue text-on-primary flex items-center justify-center font-headline-sm font-black border border-ink-primary">
              CC
            </div>
            <span className="font-headline-sm text-headline-sm text-ink-primary tracking-tight font-black">
              MASTER CONTROL ROOM
            </span>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="px-space-sm py-1 bg-round-2-amber/20 border-2 border-ink-primary rounded-full shadow-[2px_2px_0px_#0F172A]">
              <span className="font-label-ticker text-label-ticker text-on-secondary-container uppercase font-extrabold">LIVE BROADCAST</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border border-ink-primary">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="relative pt-20 bg-canvas-cream w-full min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
