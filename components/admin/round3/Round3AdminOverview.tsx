'use client';

// components/admin/round3/Round3AdminOverview.tsx
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Round3TeamState, Round3MissionAttempt, Team } from '@/types';
import { toast } from 'sonner';

interface TeamWithR3 {
  id: string;
  team_name: string;
  leader_name: string;
  r3_state?: Round3TeamState;
  r3_attempts?: Round3MissionAttempt[];
}

export default function Round3AdminOverview() {
  const [teams, setTeams] = useState<TeamWithR3[]>([]);
  const [round3Active, setRound3Active] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(28 * 60 + 45);
  const [timerRunning, setTimerRunning] = useState(true);
  const [logs, setLogs] = useState<Array<{ id: string; time: string; tag: string; message: string }>>([
    { id: '1', time: '28:44', tag: 'VAULT_CRACK', message: 'Team Alpha (#TEAM-404) entered final passphrase [CA45] successfully.' },
    { id: '2', time: '28:30', tag: 'CLUE_DISCOVERED', message: 'Team Beta found Clue #4 in Caesar Cipher matrix. Moving to Vault Door Terminal.' },
    { id: '3', time: '28:15', tag: 'HINT_PURCHASED', message: 'Team Delta used Hint #3 on Logical Thinking Puzzle (+30s penalty).' },
  ]);

  const loadData = async () => {
    const supabase = createClient();
    
    // Fetch competition settings
    const { data: settings } = await supabase
      .from('competition_settings')
      .select('round3_active')
      .limit(1)
      .maybeSingle();

    setRound3Active(settings?.round3_active ?? false);

    // Fetch all teams with r3 state & attempts
    const { data: teamsData } = await supabase.from('teams').select('*').order('team_name');
    const { data: r3StateData } = await supabase.from('round3_team_state').select('*');
    const { data: r3AttemptsData } = await supabase.from('round3_mission_attempts').select('*');

    const stateMap = new Map<string, Round3TeamState>();
    r3StateData?.forEach(s => stateMap.set(s.team_id, s));

    const attemptsMap = new Map<string, Round3MissionAttempt[]>();
    r3AttemptsData?.forEach(a => {
      const list = attemptsMap.get(a.team_id) ?? [];
      list.push(a);
      attemptsMap.set(a.team_id, list);
    });

    const combined: TeamWithR3[] = (teamsData ?? []).map(t => ({
      id: t.id,
      team_name: t.team_name,
      leader_name: t.leader_name,
      r3_state: stateMap.get(t.id),
      r3_attempts: attemptsMap.get(t.id) ?? [],
    }));

    setTeams(combined);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime subscriptions
    const supabase = createClient();
    const channel = supabase
      .channel('round3-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round3_team_state' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'round3_mission_attempts' }, (payload) => {
        loadData();
        const newAttempt = payload.new as Round3MissionAttempt;
        if (newAttempt.is_correct) {
          appendLog('MISSION_CLEAR', `Team completed Mission 0${newAttempt.mission_number}! Clue revealed.`);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'competition_settings' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Timer countdown interval
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const appendLog = (tag: string, message: string) => {
    const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const secs = (timerSeconds % 60).toString().padStart(2, '0');
    setLogs(prev => [
      { id: Date.now().toString(), time: `${mins}:${secs}`, tag, message },
      ...prev,
    ]);
  };

  const toggleRound3Active = async () => {
    const supabase = createClient();
    const nextState = !round3Active;
    const { error } = await supabase
      .from('competition_settings')
      .update({ round3_active: nextState })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) toast.error(error.message);
    else {
      setRound3Active(nextState);
      toast.success(`Round 3 toggled ${nextState ? 'ACTIVE ⚡' : 'DISABLED 🔒'}`);
      appendLog('SETTINGS_CHANGE', `Round 3 status changed to ${nextState ? 'ACTIVE' : 'DISABLED'}`);
    }
  };

  const initRound3States = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('init_round3_team_states');
    if (error) toast.error(error.message);
    else {
      toast.success(`🎉 Round 3 states initialized for all registered teams!`);
      appendLog('INIT_STATES', `Provisioned Round 3 team states for competition.`);
      loadData();
    }
  };

  const adjustTimer = (seconds: number) => {
    setTimerSeconds(prev => prev + seconds);
    appendLog('TIME_MOD', `Timer adjusted by ${seconds > 0 ? '+' : ''}${seconds}s`);
  };

  const triggerBroadcastHint = () => {
    if (confirm('Broadcast global hint for Mission 05 to all teams? (+30s penalty flag applied)')) {
      appendLog('GLOBAL_HINT', 'Admin broadcasted Global Hint for Mission 05.');
      toast.info('Global hint broadcasted!');
    }
  };

  const triggerFiveMinCountdown = () => {
    setTimerSeconds(5 * 60);
    appendLog('ALERT_TRIGGER', '5-Minute Vault Final Rush Countdown triggered!');
    toast.warning('5-Minute Vault Countdown initiated!');
  };

  const finalizeRound3 = () => {
    if (confirm('Are you sure you want to finalize Round 3 and lock tournament results?')) {
      setTimerRunning(false);
      appendLog('TOURNAMENT_LOCK', 'ROUND 3 TERMINATED. Final tournament scores frozen.');
      toast.success('Round 3 successfully finalized!');
    }
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Stats calculation
  const totalTeams = teams.length;
  const crackedTeams = teams.filter(t => t.r3_state?.vault_unlocked).length;
  const atVaultTeams = teams.filter(t => {
    const solved = t.r3_attempts?.filter(a => a.is_correct).length ?? 0;
    return solved >= 5 && !t.r3_state?.vault_unlocked;
  }).length;

  return (
    <div className="flex flex-col w-full gap-space-lg pb-space-xl">
      {/* Top Cockpit Status Ribbon */}
      <div className="w-full bg-surface-card border-2 border-ink-primary rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm sm:gap-space-md">
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-round-3-purple text-on-tertiary rounded-full font-label-ticker text-label-ticker border border-ink-primary font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-surface-bright animate-ping" />
            <span>MASTER CONTROL ROOM</span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-status-correct text-surface-card rounded-full font-label-sticker text-label-sticker shadow-sm border border-ink-primary font-bold">
            <span>● {round3Active ? 'LIVE NOW' : 'DISABLED'}</span>
          </div>
          <div className="flex items-center gap-space-xs text-ink-primary font-headline-sm text-headline-sm font-black">
            <span>{totalTeams} Teams In Arena</span>
            <span className="text-ink-secondary text-body-sm font-body-sm px-space-xs">
              • STAGE: ROUND 03 HEIST
            </span>
          </div>
        </div>

        {/* Controls: Active toggle & Init */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            onClick={toggleRound3Active}
            className={`px-space-md py-space-xs rounded-xl font-headline-sm text-label-ticker font-black shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary transition-all cursor-pointer ${
              round3Active ? 'bg-status-correct text-on-primary' : 'bg-surface-muted text-ink-primary'
            }`}
          >
            {round3Active ? 'DISABLE ROUND 3' : 'ACTIVATE ROUND 3 ⚡'}
          </button>
          <button
            onClick={initRound3States}
            className="px-space-md py-space-xs bg-currency-gold text-ink-primary font-headline-sm text-label-ticker font-black rounded-xl shadow-[2px_2px_0px_#0F172A] border-2 border-ink-primary hover:bg-currency-gold/90 transition-all cursor-pointer"
          >
            INITIALIZE TEAM STATES
          </button>
        </div>

        {/* Live Heist Master Clock */}
        <div className="flex flex-wrap items-center gap-space-sm bg-canvas-cream px-space-md py-space-xs rounded-xl border-2 border-ink-primary shadow-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-round-3-purple text-[22px]">timer</span>
            <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">HEIST TIMER:</span>
            <span className="font-label-code text-headline-sm text-round-3-purple tracking-widest font-bold">
              {formatTimer(timerSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="px-space-sm py-space-xs bg-surface-card hover:bg-surface-container rounded-lg font-label-sticker text-label-sticker text-ink-primary border border-ink-primary transition-all flex items-center gap-1 shadow-sm active:translate-y-0.5 cursor-pointer font-bold"
            >
              <span className="material-symbols-outlined text-[16px]">
                {timerRunning ? 'pause' : 'play_arrow'}
              </span>
              <span>{timerRunning ? 'PAUSE' : 'RESUME'}</span>
            </button>
            <button
              onClick={() => adjustTimer(10)}
              className="px-space-sm py-space-xs bg-surface-card hover:bg-surface-container rounded-lg font-label-sticker text-label-sticker text-ink-primary border border-ink-primary transition-all flex items-center gap-1 shadow-sm active:translate-y-0.5 cursor-pointer font-bold"
            >
              <span>+10s</span>
            </button>
            <button
              onClick={() => adjustTimer(60)}
              className="px-space-sm py-space-xs bg-surface-card hover:bg-surface-container rounded-lg font-label-sticker text-label-sticker text-ink-primary border border-ink-primary transition-all flex items-center gap-1 shadow-sm active:translate-y-0.5 cursor-pointer font-bold"
            >
              <span>+1m</span>
            </button>
          </div>
        </div>
      </div>

      {/* TELEMETRY METRIC CARDS (4 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Vault Solvers */}
        <div className="bg-surface-card rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col justify-between gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">TEAMS CRACKED VAULT</span>
            <span className="p-1.5 rounded-lg bg-round-3-purple/10 text-round-3-purple border border-round-3-purple/30">
              <span className="material-symbols-outlined text-[18px]">key</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-xl text-headline-lg text-ink-primary font-black">{crackedTeams}</span>
              <span className="font-headline-sm text-headline-sm text-ink-secondary font-bold">/ {totalTeams}</span>
            </div>
            <span className="font-label-sticker text-label-sticker text-status-correct font-bold">
              {totalTeams > 0 ? Math.round((crackedTeams / totalTeams) * 100) : 0}% Complete
            </span>
          </div>
          <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden border border-ink-primary">
            <div
              className="h-full bg-round-3-purple rounded-full"
              style={{ width: `${totalTeams > 0 ? (crackedTeams / totalTeams) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Card 2: At Vault */}
        <div className="bg-surface-card rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col justify-between gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">TEAMS AT VAULT</span>
            <span className="p-1.5 rounded-lg bg-currency-gold/15 text-currency-gold border border-currency-gold/30">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </span>
          </div>
          <div>
            <span className="font-display-xl text-headline-lg text-ink-primary font-black">{atVaultTeams}</span>
            <p className="font-body-sm text-body-sm text-round-1-blue font-bold">Ready to enter password</p>
          </div>
          <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">ALL 5 MISSIONS CLEAR</span>
        </div>

        {/* Card 3: Hints Used */}
        <div className="bg-surface-card rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col justify-between gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">TOTAL HINTS USED</span>
            <span className="p-1.5 rounded-lg bg-round-2-orange/15 text-round-2-orange border border-round-2-orange/30">
              <span className="material-symbols-outlined text-[18px]">lightbulb</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-xl text-headline-lg text-ink-primary font-black">
                {teams.reduce((acc, t) => acc + (t.r3_state?.hints_used ?? 0), 0)}
              </span>
              <span className="font-headline-sm text-headline-sm text-ink-secondary font-bold">Hints</span>
            </div>
            <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">+30s per hint penalty</span>
          </div>
          <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden border border-ink-primary">
            <div className="h-full bg-round-2-orange rounded-full" style={{ width: '45%' }} />
          </div>
        </div>

        {/* Card 4: Active Bottleneck */}
        <div className="bg-surface-card rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col justify-between gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">ACTIVE BOTTLENECK</span>
            <span className="p-1.5 rounded-lg bg-status-wrong/15 text-status-wrong border border-status-wrong/30">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </span>
          </div>
          <div>
            <span className="font-headline-md text-headline-md text-ink-primary block font-bold leading-tight">Mission 05</span>
            <p className="font-body-sm text-body-sm text-status-wrong font-bold">Fix The Puzzle</p>
          </div>
          <span className="font-label-sticker text-label-sticker text-status-wrong bg-status-wrong/10 px-2 py-0.5 rounded-md inline-block font-bold border border-status-wrong/30">
            Parson&apos;s Reordering Stage
          </span>
        </div>
      </div>

      {/* LIVE TEAMS HEIST LEADERBOARD & PROGRESS MATRIX */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
          <div>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-round-1-blue text-[22px]">table_rows</span>
              <h3 className="font-headline-sm text-headline-sm text-ink-primary font-black uppercase">
                LIVE TEAMS HEIST LEADERBOARD &amp; PROGRESS MATRIX
              </h3>
            </div>
            <p className="font-body-sm text-body-sm text-ink-secondary">
              Real-time mission tracking, clue locks, and vault breach verification.
            </p>
          </div>
        </div>

        {/* Interactive Responsive Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left font-body-sm text-body-sm border-collapse">
            <thead>
              <tr className="bg-surface-muted text-ink-secondary font-label-sticker text-label-sticker uppercase border-b-2 border-ink-primary">
                <th className="py-space-sm px-space-md">RANK</th>
                <th className="py-space-sm px-space-md">TEAM</th>
                <th className="py-space-sm px-space-md">MISSION PROGRESS</th>
                <th className="py-space-sm px-space-md">CLUES</th>
                <th className="py-space-sm px-space-md">HINTS</th>
                <th className="py-space-sm px-space-md">VAULT STATUS</th>
                <th className="py-space-sm px-space-md text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-surface-muted">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py- space-md text-center text-ink-secondary">
                    No teams initialized yet. Click &quot;INITIALIZE TEAM STATES&quot; above.
                  </td>
                </tr>
              ) : (
                teams.map((t, idx) => {
                  const solvedAttempts = t.r3_attempts?.filter(a => a.is_correct) ?? [];
                  const solvedCount = solvedAttempts.length;
                  const isCracked = t.r3_state?.vault_unlocked ?? false;
                  const isAtVault = solvedCount >= 5 && !isCracked;

                  return (
                    <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-md">
                        <span className="w-7 h-7 rounded-full bg-currency-gold text-surface-card flex items-center justify-center font-headline-sm text-body-sm font-black shadow-sm border border-ink-primary">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-body-md text-ink-primary font-bold">
                            {t.team_name}
                          </span>
                          <span className="font-label-code text-label-sticker text-round-1-blue font-bold">
                            Leader: {t.leader_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map(mNum => {
                            const isDone = solvedAttempts.some(a => a.mission_number === mNum);
                            return (
                              <span
                                key={mNum}
                                className={`w-3.5 h-3.5 rounded-full border border-ink-primary ${
                                  isDone ? 'bg-status-correct' : 'bg-surface-muted'
                                }`}
                                title={`M${mNum} ${isDone ? 'Cleared' : 'Pending'}`}
                              />
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <span className="px-space-sm py-space-xs bg-round-3-purple/15 text-round-3-purple rounded-md font-label-code text-label-sticker font-bold border border-round-3-purple/30">
                          {solvedCount} / 5 Clues
                        </span>
                      </td>
                      <td className="py-space-md px-space-md font-label-code text-label-code text-ink-secondary font-bold">
                        {t.r3_state?.hints_used ?? 0} Hints
                      </td>
                      <td className="py-space-md px-space-md">
                        {isCracked ? (
                          <span className="px-space-sm py-space-xs bg-status-correct text-surface-card rounded-md font-label-sticker text-label-sticker font-bold flex items-center gap-1 w-fit shadow-sm border border-ink-primary">
                            <span className="material-symbols-outlined text-[14px]">lock_open</span>
                            <span>CRACKED ({t.r3_state?.finish_time_seconds ? formatTimer(t.r3_state.finish_time_seconds) : 'DONE'})</span>
                          </span>
                        ) : isAtVault ? (
                          <span className="px-space-sm py-space-xs bg-round-3-purple text-surface-card rounded-md font-label-sticker text-label-sticker font-bold flex items-center gap-1 w-fit shadow-sm border border-ink-primary animate-pulse">
                            <span className="material-symbols-outlined text-[14px]">pin</span>
                            <span>AT THE VAULT</span>
                          </span>
                        ) : (
                          <span className="px-space-sm py-space-xs bg-surface-muted text-ink-primary rounded-md font-label-sticker text-label-sticker font-bold flex items-center gap-1 w-fit border border-ink-primary">
                            <span className="material-symbols-outlined text-[14px]">terminal</span>
                            <span>SOLVING (M{solvedCount + 1})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-space-md px-space-md text-right">
                        <button
                          onClick={() => toast.info(`Viewing telemetry for ${t.team_name}`)}
                          className="px-space-sm py-space-xs bg-surface-muted hover:bg-surface-container rounded-lg font-label-sticker text-label-sticker text-ink-primary border border-ink-primary shadow-sm transition-all cursor-pointer font-bold"
                        >
                          Inspect Log
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN QUICK ACTION CONTROLS */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-round-2-orange text-[22px]">bolt</span>
            <h3 className="font-headline-sm text-headline-sm text-ink-primary font-black uppercase">
              ADMIN QUICK ACTION CONTROLS
            </h3>
          </div>
          <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">
            BROADCAST INSTANT TRIPPERS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {/* Action 1 */}
          <button
            onClick={triggerBroadcastHint}
            className="p-space-md rounded-xl bg-surface-muted hover:bg-round-2-orange/10 hover:text-round-2-orange text-ink-primary shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between gap-space-sm border-2 border-ink-primary cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-8 h-8 rounded-lg bg-currency-gold/20 text-currency-gold flex items-center justify-center border border-currency-gold/40">
                <span className="material-symbols-outlined text-[20px]">campaign</span>
              </span>
              <span className="px-1.5 py-0.5 bg-status-wrong/10 text-status-wrong rounded font-label-sticker text-label-sticker font-bold">
                GLOBAL HINT
              </span>
            </div>
            <div>
              <span className="font-headline-sm text-body-md font-black block">BROADCAST GLOBAL HINT</span>
              <p className="font-body-sm text-body-sm text-ink-secondary">Pushes clue reveal alert to all active arena pods.</p>
            </div>
          </button>

          {/* Action 2 */}
          <button
            onClick={triggerFiveMinCountdown}
            className="p-space-md rounded-xl bg-surface-muted hover:bg-round-3-purple/15 text-ink-primary shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between gap-space-sm border-2 border-ink-primary cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-8 h-8 rounded-lg bg-round-3-purple/20 text-round-3-purple flex items-center justify-center border border-round-3-purple/40">
                <span className="material-symbols-outlined text-[20px]">alarm</span>
              </span>
              <span className="px-1.5 py-0.5 bg-round-3-purple text-surface-card rounded font-label-sticker text-label-sticker font-bold">
                SYNCHRONIZED
              </span>
            </div>
            <div>
              <span className="font-headline-sm text-body-md font-black block">TRIGGER 5-MIN COUNTDOWN ⏰</span>
              <p className="font-body-sm text-body-sm text-ink-secondary">Initiates 5-minute final rush timer across arena monitors.</p>
            </div>
          </button>

          {/* Action 3 */}
          <button
            onClick={finalizeRound3}
            className="p-space-md rounded-xl bg-round-3-purple text-on-tertiary shadow-md hover:opacity-95 transition-all text-left flex flex-col justify-between gap-space-sm border-2 border-ink-primary cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-8 h-8 rounded-lg bg-surface-card/20 text-surface-card flex items-center justify-center border border-white/40">
                <span className="material-symbols-outlined text-[20px]">military_tech</span>
              </span>
              <span className="px-1.5 py-0.5 bg-currency-gold text-ink-primary rounded font-label-sticker text-label-sticker font-bold">
                MASTER FINISH
              </span>
            </div>
            <div>
              <span className="font-headline-sm text-body-md font-black block">FINALIZE ROUND 3 🏆</span>
              <p className="font-body-sm text-body-sm text-on-tertiary/80">Stops overall timer and locks scoreboard for podium reveal.</p>
            </div>
          </button>
        </div>
      </div>

      {/* Live Server Log Stream Console */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-ink-secondary text-[18px]">terminal</span>
            <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">
              LIVE ARENA EVENT FEED (WEBSOCKET STREAM)
            </span>
          </div>
          <span className="font-label-code text-label-sticker text-status-correct font-bold">
            ● STREAM CONNECTED
          </span>
        </div>

        <div className="bg-surface-muted rounded-lg p-space-sm flex flex-col gap-space-xs font-label-code text-label-code text-ink-primary max-h-36 overflow-y-auto border border-ink-primary">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-space-sm">
              <span className="text-ink-secondary font-bold">{log.time}</span>
              <span className="text-round-3-purple font-bold">[{log.tag}]</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
