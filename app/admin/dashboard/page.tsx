'use client';

// app/admin/dashboard/page.tsx — Stitch Design Admin Master Dashboard & Controls

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { CompetitionSettings, ViolationCount } from '@/types';

interface Stats {
  totalTeams: number;
  round1Completed: number;
  round2Active: number;
  currentQuestion: number;
  flaggedTeams: number;
  loggedInTeams: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadData = async () => {
    const supabase = createClient();
    const [
      { count: teams },
      { count: r1Done },
      { count: r2Active },
      { data: settingsData },
      { data: violations },
      { count: loggedIn },
    ] = await Promise.all([
      supabase.from('teams').select('*', { count: 'exact', head: true }),
      supabase.from('round1_attempts').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'auto_submitted']),
      supabase.from('round2_team_state').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('competition_settings').select('*').limit(1).maybeSingle(),
      supabase.rpc('get_violation_counts'),
      supabase.from('teams').select('*', { count: 'exact', head: true }).eq('login_status', true),
    ]);

    const flaggedCount = (violations as ViolationCount[])?.filter(v => v.is_flagged).length ?? 0;

    let currentSettings = settingsData;
    if (!currentSettings) {
      const { data: newSettings } = await supabase
        .from('competition_settings')
        .insert([{ round1_active: true, round2_active: false, current_round2_question: 1 }])
        .select('*')
        .single();
      currentSettings = newSettings;
    }

    setStats({
      totalTeams: teams ?? 0,
      round1Completed: r1Done ?? 0,
      round2Active: r2Active ?? 0,
      currentQuestion: currentSettings?.current_round2_question ?? 1,
      flaggedTeams: flaggedCount,
      loggedInTeams: loggedIn ?? 0,
    });
    setSettings(currentSettings);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel('public:admin:dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round1_attempts' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round2_team_state' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anti_cheat_violations' }, (payload) => {
        loadData();
        if (payload.eventType === 'INSERT') {
          const v = payload.new as any;
          toast.warning(`Violation — ${v.violation_type}`, {
            description: `Team flagged in ${v.round_name || 'exam'}`,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateSetting = async (key: string, value: boolean | number) => {
    setSettingsLoading(true);
    const supabase = createClient();
    if (settings?.id) {
      const { error } = await supabase
        .from('competition_settings')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('id', settings.id);

      if (error) { toast.error('Failed to update setting: ' + error.message); }
      else {
        toast.success(`Toggle [${key}] updated to ${value ? 'ON' : 'OFF'}!`);
        loadData();
      }
    } else {
      const { error } = await supabase
        .from('competition_settings')
        .insert([{ [key]: value }]);
      if (error) { toast.error('Failed to update setting: ' + error.message); }
      else {
        toast.success(`Toggle [${key}] updated to ${value ? 'ON' : 'OFF'}!`);
        loadData();
      }
    }
    setSettingsLoading(false);
  };

  const initRound2 = async () => {
    setSettingsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('initialize_round2_states');
    if (error) toast.error('Failed to initialize Round 2: ' + error.message);
    else { toast.success('🎉 Round 2 states initialized with 100 coins for all teams!'); loadData(); }
    setSettingsLoading(false);
  };

  const initRound3 = async () => {
    setSettingsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('init_round3_team_states');
    if (error) toast.error('Failed to initialize Round 3: ' + error.message);
    else { toast.success('🎉 Round 3 states initialized for all teams!'); loadData(); }
    setSettingsLoading(false);
  };

  const fullReset = async () => {
    if (!window.confirm('🔥 DANGER: Reset everything?\n\nThis will wipe all team accounts, login stats, scores, and round attempts to start a fresh test!\n\nAll 30 R1 questions, 6 R2 questions, and 5 R3 missions will be preserved intact.')) {
      return;
    }
    setSettingsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('reset_all_rounds');
    if (error) {
      toast.error('Reset failed: ' + error.message);
    } else {
      if (typeof window !== 'undefined') localStorage.clear();
      toast.success(data?.message ?? '🔥 Platform reset completely! All user accounts wiped. Ready for fresh test.');
      loadData();
    }
    setSettingsLoading(false);
  };

  const STAT_CARDS = stats ? [
    { label: 'Registered Teams', value: stats.totalTeams, icon: '👥', color: 'text-round-1-blue', bg: 'bg-round-1-blue/10' },
    { label: 'Logged In Teams', value: stats.loggedInTeams, icon: '✅', color: 'text-status-correct', bg: 'bg-status-correct/10' },
    { label: 'R1 Completed', value: stats.round1Completed, icon: '📝', color: 'text-round-3-purple', bg: 'bg-round-3-purple/10' },
    { label: 'R2 Active', value: stats.round2Active, icon: '🎯', color: 'text-round-2-orange', bg: 'bg-round-2-orange/10' },
    { label: 'Current Question', value: `Q${stats.currentQuestion}`, icon: '❓', color: 'text-currency-gold', bg: 'bg-currency-gold/10' },
    { label: 'Flagged Teams', value: stats.flaggedTeams, icon: '⚠️', color: 'text-status-wrong', bg: 'bg-status-wrong/10' },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-space-lg font-body-md text-ink-primary">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md bg-surface-card p-space-lg rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A]">
        <div>
          <span className="font-label-sticker text-label-sticker text-round-1-blue uppercase tracking-widest block mb-1">STITCH ARENA SYSTEM</span>
          <h1 className="font-headline-lg text-headline-lg font-black tracking-tight text-ink-primary">
            STAGE MASTER CONTROLS 🎛️
          </h1>
          <p className="font-body-md text-body-md text-ink-secondary">
            Manage live round states, answer visibility, and round initialization.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-space-md py-space-sm bg-surface-muted hover:bg-surface-card text-ink-primary rounded-lg font-label-ticker text-label-ticker border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex items-center gap-space-xs cursor-pointer transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">sync</span>
          <span>REFRESH STATE</span>
        </button>
      </div>

      {/* Stats Cards Grid (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-space-md">
        {loading
          ? Array(6).fill(0).map((_, i) => <div key={i} className="h-28 rounded-xl bg-surface-muted animate-pulse border-2 border-ink-primary" />)
          : STAT_CARDS.map((card) => (
            <div
              key={card.label}
              className="p-space-md rounded-xl bg-surface-card border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex flex-col justify-between transition-transform hover:-translate-y-0.5"
            >
              <div className={`w-9 h-9 rounded-lg ${card.bg} ${card.color} flex items-center justify-center text-lg mb-2 font-bold border border-ink-primary`}>
                {card.icon}
              </div>
              <p className="font-display-xl-mobile text-display-xl-mobile font-black text-ink-primary leading-none mb-1">{card.value}</p>
              <p className="font-label-sticker text-label-sticker text-ink-secondary uppercase">{card.label}</p>
            </div>
          ))
        }
      </div>

      {/* Competition Controls Card */}
      {settings && (
        <div className="p-space-lg rounded-xl border-2 border-ink-primary bg-surface-card shadow-[4px_4px_0px_#0F172A] flex flex-col gap-space-lg">
          <div className="border-b-2 border-surface-muted pb-space-md flex items-center justify-between flex-wrap gap-space-sm">
            <div>
              <span className="font-label-sticker text-label-sticker text-round-2-orange uppercase font-black tracking-wider block">REALTIME SYSTEM SETTINGS</span>
              <h2 className="font-headline-md text-headline-md font-black text-ink-primary">Live Competition Round Toggles</h2>
              <p className="font-body-sm text-body-sm text-ink-secondary">Toggle active round status for all participant screens live</p>
            </div>
            <span className="font-label-sticker text-label-sticker bg-round-2-amber/20 text-on-secondary-container border border-ink-primary px-space-sm py-1 rounded-full font-bold">
              ROOT HOST PRIVILEGES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            {/* Round 1 Toggle */}
            <div className="flex items-center justify-between p-space-md bg-surface-muted rounded-xl border-2 border-ink-primary shadow-sm">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-extrabold text-ink-primary">Round 1</span>
                <span className="font-body-sm text-body-sm text-ink-secondary">MCQ Sprint</span>
                <span className={`font-label-sticker text-[10px] font-bold uppercase mt-1 ${settings.round1_active ? 'text-status-correct' : 'text-status-wrong'}`}>
                  ● {settings.round1_active ? 'STATE: ACTIVE' : 'STATE: DISABLED'}
                </span>
              </div>
              <button
                onClick={() => updateSetting('round1_active', !settings.round1_active)}
                disabled={settingsLoading}
                className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer border-2 border-ink-primary shadow-inner ${
                  settings.round1_active ? 'bg-status-correct' : 'bg-surface-card'
                }`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-ink-primary transition-transform ${settings.round1_active ? 'translate-x-6 bg-white' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Round 2 Toggle */}
            <div className="flex items-center justify-between p-space-md bg-surface-muted rounded-xl border-2 border-ink-primary shadow-sm">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-extrabold text-ink-primary">Round 2</span>
                <span className="font-body-sm text-body-sm text-ink-secondary">Code Auction Bidding</span>
                <span className={`font-label-sticker text-[10px] font-bold uppercase mt-1 ${settings.round2_active ? 'text-round-2-orange' : 'text-status-wrong'}`}>
                  ● {settings.round2_active ? 'STATE: ACTIVE' : 'STATE: DISABLED'}
                </span>
              </div>
              <button
                onClick={() => updateSetting('round2_active', !settings.round2_active)}
                disabled={settingsLoading}
                className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer border-2 border-ink-primary shadow-inner ${
                  settings.round2_active ? 'bg-round-2-orange' : 'bg-surface-card'
                }`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-ink-primary transition-transform ${settings.round2_active ? 'translate-x-6 bg-white' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Round 3 Toggle */}
            <div className="flex items-center justify-between p-space-md bg-surface-muted rounded-xl border-2 border-ink-primary shadow-sm">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-extrabold text-ink-primary">Round 3</span>
                <span className="font-body-sm text-body-sm text-ink-secondary">Operation Tech Heist</span>
                <span className={`font-label-sticker text-[10px] font-bold uppercase mt-1 ${settings.round3_active ? 'text-round-3-purple' : 'text-status-wrong'}`}>
                  ● {settings.round3_active ? 'STATE: ACTIVE' : 'STATE: DISABLED'}
                </span>
              </div>
              <button
                onClick={() => updateSetting('round3_active', !settings.round3_active)}
                disabled={settingsLoading}
                className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer border-2 border-ink-primary shadow-inner ${
                  settings.round3_active ? 'bg-round-3-purple' : 'bg-surface-card'
                }`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-ink-primary transition-transform ${settings.round3_active ? 'translate-x-6 bg-white' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Show R1 Explanations Toggle */}
            <div className="flex items-center justify-between p-space-md bg-surface-muted rounded-xl border-2 border-ink-primary shadow-sm">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-extrabold text-ink-primary">Show R1 Answers</span>
                <span className="font-body-sm text-body-sm text-ink-secondary">Reveal after round ends</span>
                <span className={`font-label-sticker text-[10px] font-bold uppercase mt-1 ${settings.show_round1_explanations ? 'text-round-1-blue' : 'text-ink-secondary'}`}>
                  ● {settings.show_round1_explanations ? 'VISIBLE' : 'HIDDEN'}
                </span>
              </div>
              <button
                onClick={() => updateSetting('show_round1_explanations', !settings.show_round1_explanations)}
                disabled={settingsLoading}
                className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer border-2 border-ink-primary shadow-inner ${
                  settings.show_round1_explanations ? 'bg-round-1-blue' : 'bg-surface-card'
                }`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-ink-primary transition-transform ${settings.show_round1_explanations ? 'translate-x-6 bg-white' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Initialize Actions */}
          <div className="pt-space-md border-t-2 border-surface-muted flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <div>
              <span className="font-label-sticker text-label-sticker text-currency-gold uppercase font-black block">INITIALIZE COMPETITION STAGES</span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-ink-primary">Initialize Round 2 &amp; Round 3 States</h3>
              <p className="font-body-sm text-body-sm text-ink-secondary">Provision initial status and data for all registered teams before starting rounds.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={initRound2}
                disabled={settingsLoading}
                className="px-space-md py-space-sm bg-currency-gold hover:bg-currency-gold/90 text-ink-primary font-headline-sm text-body-md font-black rounded-xl border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] disabled:opacity-60 transition-all cursor-pointer whitespace-nowrap flex items-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[18px]">toll</span>
                <span>INIT R2 PURSES</span>
              </button>
              <button
                onClick={initRound3}
                disabled={settingsLoading}
                className="px-space-md py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary font-headline-sm text-body-md font-black rounded-xl border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] disabled:opacity-60 transition-all cursor-pointer whitespace-nowrap flex items-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[18px]">terminal</span>
                <span>INIT R3 HEIST</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Full Platform Reset */}
          <div className="pt-space-md border-t-2 border-status-wrong/30 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md bg-status-wrong/5 p-space-md rounded-xl border border-status-wrong/20">
            <div>
              <span className="font-label-sticker text-label-sticker text-status-wrong uppercase font-black block">DANGER ZONE // RESET PLATFORM</span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-ink-primary">Fresh Test Start (Wipe Accounts &amp; Stats)</h3>
              <p className="font-body-sm text-body-sm text-ink-secondary">Deletes all team accounts, logins, attempts, and scores. Preserves all questions and missions.</p>
            </div>
            <button
              onClick={fullReset}
              disabled={settingsLoading}
              className="px-space-md py-space-sm bg-status-wrong hover:bg-status-wrong/90 text-white font-headline-sm text-body-md font-black rounded-xl border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] disabled:opacity-60 transition-all cursor-pointer whitespace-nowrap flex items-center gap-space-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              <span>RESET EVERYTHING (FRESH START) 🔥</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
