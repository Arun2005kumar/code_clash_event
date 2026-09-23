'use client';

// app/admin/round2/auction/page.tsx — Admin Live Auction Control Room matching Stitch UI
import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Round2Bid, Round2QuestionAdmin, CompetitionSettings } from '@/types';

export default function AdminAuctionPage() {
  const [bids, setBids] = useState<(Round2Bid & { team_name?: string })[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Round2QuestionAdmin | null>(null);
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [hammering, setHammering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(44);
  const [hammerDropped, setHammerDropped] = useState(false);
  const [statusToastMsg, setStatusToastMsg] = useState('');

  // Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectData, setInspectData] = useState<{ team: string; wager: string; answer: string }>({
    team: '', wager: '', answer: ''
  });

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused && timeLeft > 0) {
        setTimeLeft(prev => prev - 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, timeLeft]);

  const answerNames: Record<string, string> = { A: 'Stack', B: 'Queue', C: 'Tree', D: 'Graph' };

  const loadData = useCallback(async () => {
    const supabase = getSupabase();
    
    // Settings
    const { data: s } = await supabase.from('competition_settings').select('*').single();
    setSettings(s);

    if (!s?.current_round2_question) {
      setLoading(false);
      return;
    }

    // Question
    const { data: q } = await supabase
      .from('round2_questions')
      .select('*')
      .eq('question_number', s.current_round2_question)
      .single();

    setCurrentQuestion(q);

    if (q) {
      const { data: bidData } = await supabase
        .from('round2_bids')
        .select('*, teams(team_name)')
        .eq('question_id', q.id)
        .order('bid_amount', { ascending: false })
        .order('bid_timestamp', { ascending: true });

      const mapped = (bidData ?? []).map((b: any) => ({ ...b, team_name: b.teams?.team_name }));
      setBids(mapped);

      // Auto-select highest bidder if not manually selected
      if (mapped.length > 0 && !selectedWinnerId) {
        setSelectedWinnerId(mapped[0].team_id);
      }
    }
    setLoading(false);
  }, [getSupabase, selectedWinnerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase.channel('admin-auction-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round2_bids' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round2_questions' }, () => { loadData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [getSupabase, loadData]);

  const triggerHammerDrop = async () => {
    if (!currentQuestion || !selectedWinnerId) {
      toast.error('No target bidder selected for hammer lock.');
      return;
    }
    setHammering(true);
    setHammerDropped(true);
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('lock_hammer', {
      p_question_id: currentQuestion.id,
      p_winning_team_id: selectedWinnerId,
    });

    if (error || !data?.[0]?.success) {
      toast.error(data?.[0]?.message || 'Hammer adjudication failed!');
      setHammering(false);
      setHammerDropped(false);
      return;
    }

    const result = data[0];
    const targetTeam = bids.find(b => b.team_id === selectedWinnerId);
    const teamLabel = targetTeam?.team_name || 'Team Alpha';

    if (result.winner_correct) {
      setStatusToastMsg(`🎉 Score awarded: ${teamLabel} awarded +10 Points to club tally!`);
      toast.success(`🔨 HAMMER DROPPED! ${teamLabel} answered CORRECTLY! +10 Points awarded!`);
    } else {
      setStatusToastMsg(`❌ Penalty recorded: ${teamLabel} lost ${Math.abs(result.coin_change)} wager coins from pool balance.`);
      toast.error(`🔨 HAMMER DROPPED! ${teamLabel} answered WRONG! Deducted ${Math.abs(result.coin_change)} coins!`);
    }

    loadData();
    setHammering(false);
  };

  const handleVerdict = async (verdictCorrect: boolean) => {
    const targetTeam = bids.find(b => b.team_id === selectedWinnerId) || bids[0];
    if (!targetTeam) return;

    const teamLabel = targetTeam.team_name || 'Team Alpha';
    if (verdictCorrect) {
      setStatusToastMsg(`🎉 Score awarded: ${teamLabel} awarded +10 Points to club tally!`);
      toast.success(`🎉 ${teamLabel} VERIFIED CORRECT (+10 PTS)`);
    } else {
      setStatusToastMsg(`❌ Penalty recorded: ${teamLabel} lost ${targetTeam.bid_amount} wager coins from pool balance.`);
      toast.error(`❌ ${teamLabel} VERIFIED WRONG (-${targetTeam.bid_amount} COINS)`);
    }
  };

  const openInspectModal = (team: string, wager: string, answer: string) => {
    setInspectData({ team, wager, answer });
    setInspectModalOpen(true);
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-round-2-orange border-t-transparent rounded-full animate-spin mb-4" />
        <span className="font-label-code text-round-2-orange font-bold">LOADING MASTER CONTROL ROOM...</span>
      </div>
    );
  }

  const leadingBid = bids.find(b => b.team_id === selectedWinnerId) || bids[0];

  // Distribution counts
  const optionCounts = { A: 0, B: 0, C: 0, D: 0 };
  bids.forEach(b => {
    if (b.selected_option && optionCounts[b.selected_option as keyof typeof optionCounts] !== undefined) {
      optionCounts[b.selected_option as keyof typeof optionCounts]++;
    }
  });
  const totalBids = bids.length || 1;

  return (
    <div className="flex flex-col w-full p-space-md lg:p-space-lg gap-space-lg max-w-7xl mx-auto font-body-md text-body-md text-ink-primary">
      
      {/* Top Announcer Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md p-space-md bg-surface-card rounded-xl shadow-md border-2 border-ink-primary">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="px-space-sm py-0.5 rounded-full bg-round-2-orange text-canvas-cream font-label-sticker text-label-sticker uppercase tracking-wider flex items-center gap-1 shadow-sm border border-ink-primary">
              <span className="w-2 h-2 rounded-full bg-canvas-cream animate-pulse"></span>
              Live Now
            </span>
            <span className="px-space-sm py-0.5 rounded-full bg-surface-muted text-ink-primary font-label-sticker text-label-sticker flex items-center gap-1 shadow-sm border border-ink-primary">
              <span className="material-symbols-outlined text-[15px] text-round-1-blue">groups</span>
              {bids.length > 0 ? bids.length : 18} Teams Connected
            </span>
            <span className="px-space-sm py-0.5 rounded-full bg-tertiary-fixed text-tertiary font-label-sticker text-label-sticker shadow-sm border border-ink-primary">
              Question {String(currentQuestion?.question_number || 3).padStart(2, '0')} / 06
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-ink-primary tracking-tight">ROUND 2 — LIVE AUCTION ROOM</h1>
          <p className="font-body-md text-body-md text-ink-secondary">Real-time bids are locked on hammer drop. Wagers in play for Question {String(currentQuestion?.question_number || 3).padStart(2, '0')}.</p>
        </div>

        {/* Quick Host Controls / Timer Widget */}
        <div className="flex items-center gap-space-sm bg-surface-muted p-space-sm rounded-xl w-full lg:w-auto justify-between lg:justify-end shadow-sm border-2 border-ink-primary">
          <div className="flex flex-col px-space-sm">
            <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase">Auction Timer</span>
            <span className="font-display-xl-mobile text-display-xl-mobile text-round-2-orange font-black tracking-tight" id="auctionTimer">
              00:{String(timeLeft).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              className="px-space-md py-space-sm bg-surface-card hover:bg-canvas-cream text-ink-primary rounded-lg font-label-ticker text-label-ticker shadow-sm flex items-center gap-1 active:scale-95 transition-all border border-ink-primary cursor-pointer"
              id="pauseTimerBtn"
              onClick={() => setIsPaused(!isPaused)}
            >
              <span className="material-symbols-outlined text-[18px]">{isPaused ? 'play_arrow' : 'pause'}</span>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              className="px-space-md py-space-sm bg-surface-card hover:bg-canvas-cream text-ink-primary rounded-lg font-label-ticker text-label-ticker shadow-sm flex items-center gap-1 active:scale-95 transition-all border border-ink-primary cursor-pointer"
              id="plusTenBtn"
              onClick={() => setTimeLeft(prev => prev + 10)}
            >
              +10s
            </button>
          </div>
        </div>
      </div>

      {/* Primary Split Grid (Question + Centerpiece Hammer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
        
        {/* Question & Live Pick Breakdown (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-surface-card rounded-xl p-space-lg shadow-md justify-between gap-space-md border-2 border-ink-primary">
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="px-space-sm py-1 rounded-md bg-round-1-blue/15 text-round-1-blue font-label-ticker text-label-ticker uppercase border border-ink-primary">
                Data Structures 101
              </span>
              <span className="font-label-code text-label-code text-ink-secondary bg-surface-muted px-2 py-0.5 rounded border border-ink-primary">
                BASE REWARD: 10 PTS
              </span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-ink-primary mt-1">
              Q{String(currentQuestion?.question_number || 3).padStart(2, '0')}: {currentQuestion?.question_text || 'Which data structure strictly follows First-In, First-Out (FIFO)?'}
            </h2>
            <div className="p-space-sm bg-surface-muted rounded-lg font-label-code text-body-sm text-ink-primary flex items-center gap-2 border border-ink-primary">
              <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
              <code>collection.enqueue(item); item = collection.dequeue();</code>
            </div>
          </div>

          {/* Live Participant Answer Bars */}
          <div className="flex flex-col gap-space-sm bg-canvas-cream p-space-md rounded-xl border-2 border-ink-primary">
            <div className="flex items-center justify-between">
              <span className="font-label-ticker text-label-ticker text-ink-primary uppercase">Current Team Submissions</span>
              <span className="font-label-sticker text-label-sticker text-ink-secondary">{bids.length} / {bids.length || 18} RESPONSES</span>
            </div>

            {/* Option B (Majority) */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center font-label-code text-body-sm">
                <span className="font-bold text-ink-primary flex items-center gap-1">
                  <span className="w-5 h-5 rounded-md bg-status-correct text-canvas-cream flex items-center justify-center text-[12px] font-black border border-ink-primary">B</span>
                  Queue
                </span>
                <span className="text-ink-secondary font-bold">{optionCounts.B} teams ({Math.round((optionCounts.B / totalBids) * 100)}%)</span>
              </div>
              <div className="w-full h-3 bg-surface-muted rounded-full overflow-hidden border border-ink-primary">
                <div className="h-full bg-status-correct rounded-full transition-all duration-500" style={{ width: `${Math.max(5, Math.round((optionCounts.B / totalBids) * 100))}%` }}></div>
              </div>
            </div>

            {/* Option A */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center font-label-code text-body-sm">
                <span className="font-bold text-ink-primary flex items-center gap-1">
                  <span className="w-5 h-5 rounded-md bg-surface-muted text-ink-secondary flex items-center justify-center text-[12px] font-black border border-ink-primary">A</span>
                  Stack
                </span>
                <span className="text-ink-secondary">{optionCounts.A} teams ({Math.round((optionCounts.A / totalBids) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-surface-muted rounded-full overflow-hidden border border-ink-primary">
                <div className="h-full bg-ink-secondary/50 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, Math.round((optionCounts.A / totalBids) * 100))}%` }}></div>
              </div>
            </div>

            {/* Option C */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center font-label-code text-body-sm">
                <span className="font-bold text-ink-primary flex items-center gap-1">
                  <span className="w-5 h-5 rounded-md bg-surface-muted text-ink-secondary flex items-center justify-center text-[12px] font-black border border-ink-primary">C</span>
                  Tree
                </span>
                <span className="text-ink-secondary">{optionCounts.C} teams ({Math.round((optionCounts.C / totalBids) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-surface-muted rounded-full overflow-hidden border border-ink-primary">
                <div className="h-full bg-ink-secondary/30 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, Math.round((optionCounts.C / totalBids) * 100))}%` }}></div>
              </div>
            </div>

            {/* Option D */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center font-label-code text-body-sm">
                <span className="font-bold text-ink-primary flex items-center gap-1">
                  <span className="w-5 h-5 rounded-md bg-surface-muted text-ink-secondary flex items-center justify-center text-[12px] font-black border border-ink-primary">D</span>
                  Graph
                </span>
                <span className="text-ink-secondary">{optionCounts.D} teams ({Math.round((optionCounts.D / totalBids) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-surface-muted rounded-full overflow-hidden border border-ink-primary">
                <div className="h-full bg-ink-secondary/30 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, Math.round((optionCounts.D / totalBids) * 100))}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Centerpiece: Hammer & Winner Box (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-surface-card rounded-xl p-space-lg shadow-md justify-between gap-space-lg relative overflow-hidden border-2 border-ink-primary">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-round-2-orange/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Top Auction Winner Spotlight */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sticker text-label-sticker text-round-2-orange uppercase tracking-wider font-extrabold flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
                AUCTION CLIMAX
              </span>
              <span className="px-space-sm py-0.5 rounded-full bg-currency-gold/20 text-ink-primary font-label-sticker text-label-sticker font-bold border border-ink-primary">
                POT: {bids.reduce((acc, b) => acc + (b.bid_amount || 0), 0) || 13} 🪙 TOKENS POOLED
              </span>
            </div>

            {/* Winner Card Highlight */}
            <div className="p-space-lg bg-surface-muted rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md shadow-sm border-2 border-ink-primary">
              <div className="flex items-center gap-space-md">
                <div className="w-14 h-14 rounded-2xl bg-round-2-orange text-canvas-cream flex items-center justify-center text-3xl shadow-sm border border-ink-primary">
                  👑
                </div>
                <div className="flex flex-col">
                  <span className="font-label-ticker text-label-ticker text-ink-secondary uppercase">CURRENT HIGHEST BIDDER</span>
                  <span className="font-headline-lg text-headline-lg text-ink-primary font-extrabold leading-none">
                    {leadingBid?.team_name || 'TEAM ALPHA'}
                  </span>
                  <span className="font-body-sm text-body-sm text-ink-secondary mt-1 flex items-center gap-1">
                    Selected Option <strong className="text-ink-primary">{leadingBid?.selected_option || 'B'} (Queue)</strong> • Locked timestamp 12:31:04
                  </span>
                </div>
              </div>

              {/* Wager Stamp */}
              <div className="flex flex-col items-end bg-surface-card px-space-md py-space-sm rounded-lg shadow-sm border border-ink-primary">
                <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase">Active Wager</span>
                <div className="flex items-center gap-1 font-headline-md text-headline-md text-round-2-orange font-black">
                  <span>{leadingBid?.bid_amount || 5}</span>
                  <span className="text-xl">🪙</span>
                </div>
                <span className="font-label-sticker text-[10px] text-status-correct font-bold">TIED BREAKER BY TIME</span>
              </div>
            </div>
          </div>

          {/* Primary Action: Drop The Hammer */}
          <div className="flex flex-col gap-space-sm">
            <button
              className={`w-full py-space-lg active:scale-[0.98] text-canvas-cream font-headline-md text-headline-md uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-space-sm transition-all duration-150 border-2 border-ink-primary cursor-pointer ${
                hammerDropped ? 'bg-ink-primary' : 'bg-round-2-orange hover:bg-round-2-orange/90'
              }`}
              id="hammerButton"
              onClick={triggerHammerDrop}
              disabled={hammering}
            >
              <span className="text-3xl" id="hammerIcon">{hammerDropped ? '🔒' : '🔨'}</span>
              <span id="hammerText">
                {hammerDropped ? `HAMMER DROPPED (${leadingBid?.team_name || 'TEAM ALPHA'} LOCKED)` : 'DROP THE HAMMER (LOCK WINNER)'}
              </span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm pt-space-xs">
              {/* Quick Verdict Buttons */}
              <button
                className="py-space-md px-space-md bg-status-correct/15 hover:bg-status-correct/25 text-status-correct rounded-lg font-label-ticker text-label-ticker flex items-center justify-center gap-2 shadow-sm transition-all border border-ink-primary cursor-pointer font-bold"
                id="verdictCorrectBtn"
                onClick={() => handleVerdict(true)}
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                [ ✓ CORRECT (+10 PTS) ]
              </button>
              <button
                className="py-space-md px-space-md bg-status-wrong/15 hover:bg-status-wrong/25 text-status-wrong rounded-lg font-label-ticker text-label-ticker flex items-center justify-center gap-2 shadow-sm transition-all border border-ink-primary cursor-pointer font-bold"
                id="verdictWrongBtn"
                onClick={() => handleVerdict(false)}
              >
                <span className="material-symbols-outlined text-[20px]">cancel</span>
                [ ✕ WRONG (-5 COINS) ]
              </button>
            </div>

            {statusToastMsg && (
              <div className="p-space-sm rounded-lg bg-surface-muted text-ink-primary font-label-code text-body-sm text-center border border-ink-primary" id="statusToast">
                {statusToastMsg}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Bidders Table Panel */}
      <div className="flex flex-col bg-surface-card rounded-xl p-space-lg shadow-md gap-space-md border-2 border-ink-primary">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[28px]">format_list_numbered</span>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-ink-primary">Live Auction Submissions &amp; Bids</h3>
              <p className="font-body-sm text-body-sm text-ink-secondary">Highest wager placed earliest holds precedence under club tournament rules.</p>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              className="px-space-sm py-1 bg-surface-muted hover:bg-surface-card text-ink-primary rounded-lg font-label-ticker text-body-sm flex items-center gap-1 shadow-sm border border-ink-primary cursor-pointer"
              id="refreshBidsBtn"
              onClick={loadData}
            >
              <span className="material-symbols-outlined text-[16px]">sync</span> Refresh Stream
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto w-full rounded-lg border-2 border-ink-primary">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-muted text-ink-secondary font-label-ticker text-label-ticker uppercase border-b-2 border-ink-primary">
                <th className="py-space-sm px-space-md">Rank</th>
                <th className="py-space-sm px-space-md">Team</th>
                <th className="py-space-sm px-space-md">Wager</th>
                <th className="py-space-sm px-space-md">Answer Choice</th>
                <th className="py-space-sm px-space-md">Timestamp</th>
                <th className="py-space-sm px-space-md">Status</th>
                <th className="py-space-sm px-space-md text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-muted font-body-md text-body-md text-ink-primary">
              {bids.map((bid, index) => {
                const isLeading = index === 0;
                const isTied = index === 1;

                return (
                  <tr
                    key={bid.id}
                    className={`transition-colors ${
                      isLeading ? 'bg-round-2-orange/5 hover:bg-round-2-orange/10' : 'hover:bg-surface-muted/50'
                    }`}
                  >
                    <td className="py-space-md px-space-md">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-label-ticker text-body-sm border border-ink-primary ${
                        isLeading ? 'bg-round-2-orange text-canvas-cream' : 'bg-surface-muted'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md font-bold text-ink-primary">
                      <div className="flex items-center gap-2">
                        <span>{bid.team_name || `Team ${index + 1}`}</span>
                        {isLeading && (
                          <span className="px-1.5 py-0.5 bg-round-2-orange/20 text-round-2-orange rounded text-[11px] font-label-sticker border border-ink-primary">
                            CAPTAIN CHRIS
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`py-space-md px-space-md font-label-code text-body-md font-extrabold ${isLeading ? 'text-round-2-orange' : 'text-ink-primary'}`}>
                      {bid.bid_amount} 🪙
                    </td>
                    <td className="py-space-md px-space-md">
                      <span className="px-space-sm py-1 bg-surface-card rounded-md font-label-code font-bold text-ink-primary shadow-sm inline-flex items-center gap-1 border border-ink-primary">
                        <span className="text-status-correct font-extrabold">{bid.selected_option}</span> • {answerNames[bid.selected_option] || 'Queue'}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md font-label-code text-body-sm text-ink-secondary">
                      {new Date(bid.bid_timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-space-md px-space-md">
                      {isLeading ? (
                        <span className="px-space-sm py-0.5 bg-status-correct/15 text-status-correct rounded-full font-label-sticker text-label-sticker font-bold uppercase inline-flex items-center gap-1 border border-ink-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-correct"></span>
                          Leading Bid
                        </span>
                      ) : isTied ? (
                        <span className="px-space-sm py-0.5 bg-currency-gold/20 text-currency-gold rounded-full font-label-sticker text-label-sticker font-bold uppercase border border-ink-primary">
                          Tied (Late)
                        </span>
                      ) : (
                        <span className="px-space-sm py-0.5 bg-surface-muted text-ink-secondary rounded-full font-label-sticker text-label-sticker uppercase border border-ink-primary">
                          Outbid
                        </span>
                      )}
                    </td>
                    <td className="py-space-md px-space-md text-right">
                      {isLeading ? (
                        <button
                          className="px-space-md py-1 bg-round-2-orange text-canvas-cream hover:bg-round-2-orange/90 rounded-lg font-label-ticker text-body-sm shadow-sm active:scale-95 transition-all border border-ink-primary cursor-pointer"
                          onClick={() => {
                            setSelectedWinnerId(bid.team_id);
                            triggerHammerDrop();
                          }}
                        >
                          Lock Hammer
                        </button>
                      ) : (
                        <button
                          className="px-space-md py-1 bg-surface-muted text-ink-primary hover:bg-canvas-cream rounded-lg font-label-ticker text-body-sm shadow-sm active:scale-95 transition-all border border-ink-primary cursor-pointer"
                          onClick={() => openInspectModal(bid.team_name || 'Team', `${bid.bid_amount} Coins`, `${bid.selected_option} (${answerNames[bid.selected_option]})`)}
                        >
                          Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {bids.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-ink-secondary font-body-md">
                    No team bids submitted for this lot yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Footer Host Advice */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-space-sm bg-surface-muted rounded-lg text-ink-secondary font-label-code text-body-sm gap-2 border border-ink-primary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">info</span>
            <span>Host Tip: If two teams wager equal coins, the earlier server timestamp takes the round hammer.</span>
          </div>
          <div className="flex items-center gap-2 text-ink-primary font-bold">
            <span>Broadcast Stream: <span className="text-status-correct">SYNCED (0.12s lag)</span></span>
          </div>
        </div>
      </div>

      {/* Modal / Drawer Container for Inspecting Bids */}
      {inspectModalOpen && (
        <div className="fixed inset-0 bg-ink-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-space-md" id="inspectModal">
          <div className="bg-surface-card rounded-xl p-space-lg max-w-md w-full shadow-2xl flex flex-col gap-space-md border-2 border-ink-primary">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-ink-primary">{inspectData.team} Bid Audit</span>
              <button
                className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-ink-primary border border-ink-primary cursor-pointer"
                onClick={() => setInspectModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-space-md bg-surface-muted rounded-lg flex flex-col gap-2 border border-ink-primary">
              <div className="flex justify-between font-body-sm"><span className="text-ink-secondary">Wager Amount:</span> <span className="font-bold text-ink-primary">{inspectData.wager}</span></div>
              <div className="flex justify-between font-body-sm"><span className="text-ink-secondary">Selected Answer:</span> <span className="font-bold text-ink-primary">{inspectData.answer}</span></div>
              <div className="flex justify-between font-body-sm"><span className="text-ink-secondary">Client Handshake:</span> <span className="font-bold text-status-correct">Verified (No lag)</span></div>
            </div>
            <div className="flex justify-end gap-space-sm">
              <button
                className="px-space-md py-space-sm bg-surface-muted text-ink-primary rounded-lg font-label-ticker text-body-sm border border-ink-primary cursor-pointer"
                onClick={() => setInspectModalOpen(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
