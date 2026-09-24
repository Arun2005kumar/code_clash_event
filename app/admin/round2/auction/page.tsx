'use client';

// app/admin/round2/auction/page.tsx — Reworked Admin Auction Control Room
import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Round2Bid, Round2QuestionAdmin, CompetitionSettings } from '@/types';

export default function AdminAuctionPage() {
  const [bids, setBids] = useState<(Round2Bid & { team_name?: string })[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Round2QuestionAdmin | null>(null);
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [hammering, setHammering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hammerDropped, setHammerDropped] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [pendingWinnerId, setPendingWinnerId] = useState<string | null>(null);
  const [awaitingVerdict, setAwaitingVerdict] = useState(false);

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }, []);

  const getOptionLabel = (opt: string) => {
    if (!currentQuestion) return opt;
    const map: Record<string, string> = {
      A: (currentQuestion as any).option_a || 'Option A',
      B: (currentQuestion as any).option_b || 'Option B',
      C: (currentQuestion as any).option_c || 'Option C',
      D: (currentQuestion as any).option_d || 'Option D',
    };
    return map[opt] || opt;
  };

  const loadData = useCallback(async () => {
    const supabase = getSupabase();
    const { data: s } = await supabase.from('competition_settings').select('*').single();
    setSettings(s);
    if (!s?.current_round2_question) { setLoading(false); return; }

    const { data: q } = await supabase
      .from('round2_questions')
      .select('*')
      .eq('question_number', s.current_round2_question)
      .single();

    setCurrentQuestion(q);
    if (q?.status === 'resolved') {
      setHammerDropped(true);
    } else {
      setHammerDropped(false);
      setAwaitingVerdict(false);
      setPendingWinnerId(null);
    }

    if (q) {
      const { data: bidData } = await supabase
        .from('round2_bids')
        .select('*, teams(team_name)')
        .eq('question_id', q.id)
        .order('bid_amount', { ascending: false })
        .order('bid_timestamp', { ascending: true });
      const mapped = (bidData ?? []).map((b: any) => ({ ...b, team_name: b.teams?.team_name }));
      setBids(mapped);
    }
    setLoading(false);
  }, [getSupabase]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase.channel('admin-auction-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round2_bids' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round2_questions' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [getSupabase, loadData]);

  const dropHammer = (teamId: string) => {
    if (hammerDropped) { toast.error('Hammer already dropped.'); return; }
    setPendingWinnerId(teamId);
    setAwaitingVerdict(true);
    const winner = bids.find(b => b.team_id === teamId);
    toast.info(`Winner selected: ${winner?.team_name}. Now choose CORRECT or WRONG.`);
  };

  const submitVerdict = async (isCorrect: boolean) => {
    if (!currentQuestion || !pendingWinnerId) {
      toast.error('No winner selected. Click Lock Hammer on a team first.'); return;
    }
    setHammering(true);
    const supabase = getSupabase();
    const currentWinner = bids.find(b => b.team_id === pendingWinnerId);
    const currentWinnerIdx = bids.findIndex(b => b.team_id === pendingWinnerId);
    const teamLabel = currentWinner?.team_name || 'Team';

    if (isCorrect) {
      const { data, error } = await supabase.rpc('lock_hammer_with_verdict', {
        p_question_id: currentQuestion.id,
        p_winning_team_id: pendingWinnerId,
        p_is_correct: true,
      });

      if (error || !data?.[0]?.success) {
        toast.error(data?.[0]?.message || 'Failed: ' + (error?.message || 'unknown'));
        setHammering(false); return;
      }

      const pts = data[0].score_change;
      setHammerDropped(true);
      setAwaitingVerdict(false);
      setStatusMsg(`CORRECT: ${teamLabel} +${pts} pts. Coins reset to 100.`);
      toast.success(`HAMMER! ${teamLabel} CORRECT! +${pts} pts | Coins reset to 100`);
    } else {
      // Wrong bid: check top 3 sequential chance rule!
      // Only top 3 highest bids have a chance (indices 0, 1, 2)
      if (currentWinnerIdx >= 0 && currentWinnerIdx < 2 && bids.length > currentWinnerIdx + 1) {
        const nextTeam = bids[currentWinnerIdx + 1];
        setPendingWinnerId(nextTeam.team_id);
        setStatusMsg(`WRONG: ${teamLabel} failed. Chance #${currentWinnerIdx + 2} passed to ${nextTeam.team_name} (${currentWinnerIdx + 2}${currentWinnerIdx + 1 === 1 ? 'nd' : 'rd'} highest bid)!`);
        toast.warning(`WRONG: ${teamLabel}! Chance passed to #${currentWinnerIdx + 2} (${nextTeam.team_name})`);
      } else {
        // No more chances in top 3! Finalize lot as resolved with no correct answer
        const { data, error } = await supabase.rpc('lock_hammer_with_verdict', {
          p_question_id: currentQuestion.id,
          p_winning_team_id: pendingWinnerId,
          p_is_correct: false,
        });

        if (error || !data?.[0]?.success) {
          toast.error(data?.[0]?.message || 'Failed: ' + (error?.message || 'unknown'));
          setHammering(false); return;
        }

        setHammerDropped(true);
        setAwaitingVerdict(false);
        setStatusMsg(`WRONG: Top 3 chances exhausted for this lot. No score awarded.`);
        toast.error(`HAMMER! Top 3 attempts exhausted. Lot closed.`);
      }
    }
    loadData();
    setHammering(false);
  };

  const handleAdvanceQuestion = async (nextQNum: number) => {
    const supabase = getSupabase();
    const { error } = await supabase.rpc('next_round2_question', { p_target_question: nextQNum });
    if (error) { toast.error('Failed: ' + error.message); return; }
    setHammerDropped(false); setAwaitingVerdict(false); setPendingWinnerId(null); setStatusMsg('');
    toast.success(`Switched to Q${nextQNum}`);
    loadData();
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-round-2-orange border-t-transparent rounded-full animate-spin mb-4" />
        <span className="font-label-code text-round-2-orange font-bold">LOADING MASTER CONTROL ROOM...</span>
      </div>
    );
  }

  const highestBidder = bids[0] ?? null;
  const optionCounts = { A: 0, B: 0, C: 0, D: 0 };
  bids.forEach(b => { if (b.selected_option) optionCounts[b.selected_option as keyof typeof optionCounts]++; });
  const totalBids = bids.length || 1;
  const correctOption = (currentQuestion as any)?.correct_option as string | undefined;

  const getScorePreview = (wager: number) => {
    if (wager >= 8) return 15; if (wager >= 4) return 10; if (wager >= 2) return 5; return 2;
  };

  return (
    <div className="flex flex-col w-full p-space-md lg:p-space-lg gap-space-lg max-w-7xl mx-auto font-body-md text-body-md text-ink-primary">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md p-space-md bg-surface-card rounded-xl shadow-md border-2 border-ink-primary">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="px-space-sm py-0.5 rounded-full bg-round-2-orange text-canvas-cream font-label-sticker text-label-sticker uppercase tracking-wider flex items-center gap-1 shadow-sm border border-ink-primary">
              <span className="w-2 h-2 rounded-full bg-canvas-cream animate-pulse"></span>Live Now
            </span>
            <span className="px-space-sm py-0.5 rounded-full bg-surface-muted text-ink-primary font-label-sticker text-label-sticker flex items-center gap-1 shadow-sm border border-ink-primary">
              <span className="material-symbols-outlined text-[15px] text-round-1-blue">groups</span>
              {bids.length} Teams Submitted Bids
            </span>
            <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg border border-ink-primary">
              {[1, 2, 3, 4, 5, 6].map((qNum) => {
                const isActive = (currentQuestion?.question_number || 1) === qNum;
                return (
                  <button key={qNum} onClick={() => handleAdvanceQuestion(qNum)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer border ${
                      isActive ? 'bg-round-2-orange text-white border-ink-primary shadow-sm' : 'bg-surface-card text-ink-primary hover:bg-slate-200 border-slate-300'
                    }`}>Q{qNum}</button>
                );
              })}
            </div>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-ink-primary tracking-tight mt-1">ROUND 2 — LIVE AUCTION ROOM</h1>
          <p className="font-body-md text-body-md text-ink-secondary">Active lot: Q{String(currentQuestion?.question_number || 1).padStart(2,'0')} — lock winner then declare verdict.</p>
        </div>
        <div className="flex items-center gap-space-sm bg-surface-muted p-space-sm rounded-xl border-2 border-ink-primary">
          <span className={`px-space-md py-space-sm rounded-lg font-label-ticker text-label-ticker font-bold border border-ink-primary ${
            hammerDropped ? 'bg-ink-primary text-canvas-cream' : 'bg-status-correct/15 text-status-correct'
          }`}>
            {hammerDropped ? 'HAMMER DROPPED — LOT CLOSED' : 'BIDDING OPEN — AWAITING HAMMER'}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
        {/* Question + Distribution (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-surface-card rounded-xl p-space-lg shadow-md gap-space-md border-2 border-ink-primary">
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="px-space-sm py-1 rounded-md bg-round-1-blue/15 text-round-1-blue font-label-ticker text-label-ticker uppercase border border-ink-primary">
                Q{String(currentQuestion?.question_number || 1).padStart(2,'0')}
              </span>
              <span className="font-label-code text-label-code text-ink-secondary bg-surface-muted px-2 py-0.5 rounded border border-ink-primary">
                IF CORRECT: +{getScorePreview(highestBidder?.bid_amount || 0)} PTS
              </span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-ink-primary mt-1">
              {currentQuestion?.question_text || 'Waiting for question...'}
            </h2>
            {correctOption && (
              <div className="p-space-sm bg-status-correct/10 rounded-lg border-2 border-status-correct flex items-center gap-2">
                <span className="material-symbols-outlined text-status-correct text-[20px]">check_circle</span>
                <div>
                  <p className="font-label-ticker text-label-ticker text-status-correct uppercase font-bold">CORRECT ANSWER</p>
                  <p className="font-headline-sm text-headline-sm text-ink-primary font-black">
                    {correctOption} — {getOptionLabel(correctOption)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-space-sm bg-canvas-cream p-space-md rounded-xl border-2 border-ink-primary">
            <div className="flex items-center justify-between">
              <span className="font-label-ticker text-label-ticker text-ink-primary uppercase">Team Submissions</span>
              <span className="font-label-sticker text-label-sticker text-ink-secondary">{bids.length} RESPONSES</span>
            </div>
            {(['A','B','C','D'] as const).map(opt => {
              const count = optionCounts[opt];
              const pct = Math.round((count / totalBids) * 100);
              const isCor = opt === correctOption;
              return (
                <div key={opt} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center font-label-code text-body-sm">
                    <span className="font-bold text-ink-primary flex items-center gap-1">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[12px] font-black border border-ink-primary ${isCor ? 'bg-status-correct text-canvas-cream' : 'bg-surface-muted text-ink-secondary'}`}>{opt}</span>
                      {getOptionLabel(opt)}{isCor && <span className="text-status-correct text-[11px] font-bold ml-1">CORRECT</span>}
                    </span>
                    <span className="text-ink-secondary font-bold">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-surface-muted rounded-full overflow-hidden border border-ink-primary">
                    <div className={`h-full rounded-full transition-all duration-500 ${isCor ? 'bg-status-correct' : 'bg-ink-secondary/40'}`} style={{width:`${Math.max(4,pct)}%`}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hammer Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-surface-card rounded-xl p-space-lg shadow-md justify-between gap-space-lg relative overflow-hidden border-2 border-ink-primary">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-round-2-orange/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Highest Bidder */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sticker text-label-sticker text-round-2-orange uppercase tracking-wider font-extrabold flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">local_fire_department</span>AUCTION CLIMAX
              </span>
              <span className="px-space-sm py-0.5 rounded-full bg-currency-gold/20 text-ink-primary font-label-sticker text-label-sticker font-bold border border-ink-primary">
                POT: {bids.reduce((acc,b) => acc+(b.bid_amount||0),0)} coins
              </span>
            </div>
            {highestBidder ? (
              <div className="p-space-lg bg-surface-muted rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md shadow-sm border-2 border-ink-primary">
                <div className="flex items-center gap-space-md">
                  <div className="w-14 h-14 rounded-2xl bg-round-2-orange text-canvas-cream flex items-center justify-center text-3xl shadow-sm border border-ink-primary">
                    {highestBidder.is_winner ? '🏆' : '👑'}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-ticker text-label-ticker text-ink-secondary uppercase">HIGHEST BIDDER</span>
                    <span className="font-headline-lg text-headline-lg text-ink-primary font-extrabold leading-none">{highestBidder.team_name || 'Team'}</span>
                    <span className="font-body-sm text-body-sm text-ink-secondary mt-1">
                      Answer: <strong className={highestBidder.selected_option === correctOption ? 'text-status-correct' : 'text-ink-primary'}>
                        {highestBidder.selected_option} — {getOptionLabel(highestBidder.selected_option || 'A')}
                        {highestBidder.selected_option === correctOption && ' (CORRECT)'}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end bg-surface-card px-space-md py-space-sm rounded-lg shadow-sm border border-ink-primary">
                  <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase">Total Wager</span>
                  <div className="flex items-center gap-1 font-headline-md text-headline-md text-round-2-orange font-black">
                    <span>{highestBidder.bid_amount}</span><span className="text-xl">coins</span>
                  </div>
                  <span className="font-label-sticker text-[10px] text-ink-secondary font-bold">IF CORRECT: +{getScorePreview(highestBidder.bid_amount||0)} PTS</span>
                </div>
              </div>
            ) : (
              <div className="p-space-lg bg-surface-muted rounded-xl text-center text-ink-secondary border-2 border-ink-primary">No bids yet.</div>
            )}
          </div>

          {/* Verdict */}
          <div className="flex flex-col gap-space-sm">
            {awaitingVerdict && pendingWinnerId ? (
              <>
                <div className="p-space-md bg-round-2-amber/10 rounded-xl border-2 border-round-2-amber text-center">
                  <p className="font-label-ticker text-label-ticker text-round-2-amber uppercase font-bold">
                    Hammer Ready — {bids.find(b=>b.team_id===pendingWinnerId)?.team_name}
                  </p>
                  {correctOption && (
                    <p className="font-body-sm text-ink-secondary mt-1">
                      Correct answer: <strong className="text-status-correct">{correctOption} — {getOptionLabel(correctOption)}</strong>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-space-sm">
                  <button className="py-space-md px-space-md bg-status-correct text-canvas-cream hover:bg-status-correct/90 rounded-lg font-label-ticker text-label-ticker flex items-center justify-center gap-2 shadow-sm transition-all border border-ink-primary cursor-pointer font-bold disabled:opacity-50"
                    onClick={() => submitVerdict(true)} disabled={hammering} id="verdictCorrectBtn">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>CORRECT — Drop Hammer
                  </button>
                  <button className="py-space-md px-space-md bg-status-wrong text-canvas-cream hover:bg-status-wrong/90 rounded-lg font-label-ticker text-label-ticker flex items-center justify-center gap-2 shadow-sm transition-all border border-ink-primary cursor-pointer font-bold disabled:opacity-50"
                    onClick={() => submitVerdict(false)} disabled={hammering} id="verdictWrongBtn">
                    <span className="material-symbols-outlined text-[20px]">cancel</span>WRONG — Drop Hammer
                  </button>
                </div>
                <button className="py-space-xs text-ink-secondary font-label-sticker text-sm underline cursor-pointer text-center"
                  onClick={() => { setAwaitingVerdict(false); setPendingWinnerId(null); }}>
                  Cancel — choose different winner
                </button>
              </>
            ) : hammerDropped ? (
              <div className="p-space-md bg-ink-primary/10 rounded-xl text-center border-2 border-ink-primary">
                <p className="font-headline-sm text-headline-sm text-ink-primary font-black">HAMMER DROPPED — LOT CLOSED</p>
                <p className="font-body-sm text-ink-secondary">Switch to next question using Q1-Q6 above.</p>
              </div>
            ) : (
              <div className="p-space-md bg-surface-muted rounded-xl text-center border border-ink-primary text-ink-secondary font-body-sm">
                Click <strong>Lock Hammer</strong> on any team in the table below to select winner.
              </div>
            )}
            {statusMsg && (
              <div className="p-space-sm rounded-lg bg-surface-muted text-ink-primary font-label-code text-body-sm text-center border border-ink-primary" id="statusToast">
                {statusMsg}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bids Table */}
      <div className="flex flex-col bg-surface-card rounded-xl p-space-lg shadow-md gap-space-md border-2 border-ink-primary">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[28px]">format_list_numbered</span>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-ink-primary">Live Auction Submissions</h3>
              <p className="font-body-sm text-body-sm text-ink-secondary">Sorted by total wager (highest first). Bids are cumulative — each click adds.</p>
            </div>
          </div>
          <button className="px-space-sm py-1 bg-surface-muted hover:bg-surface-card text-ink-primary rounded-lg font-label-ticker text-body-sm flex items-center gap-1 shadow-sm border border-ink-primary cursor-pointer" onClick={loadData} id="refreshBidsBtn">
            <span className="material-symbols-outlined text-[16px]">sync</span> Refresh
          </button>
        </div>
        <div className="overflow-x-auto w-full rounded-lg border-2 border-ink-primary">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-muted text-ink-secondary font-label-ticker text-label-ticker uppercase border-b-2 border-ink-primary">
                <th className="py-space-sm px-space-md">Rank</th>
                <th className="py-space-sm px-space-md">Team</th>
                <th className="py-space-sm px-space-md">Total Wager</th>
                <th className="py-space-sm px-space-md">Answer</th>
                <th className="py-space-sm px-space-md">Correct?</th>
                <th className="py-space-sm px-space-md">Last Bid</th>
                <th className="py-space-sm px-space-md text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-muted font-body-md text-body-md text-ink-primary">
              {bids.map((bid, index) => {
                const isHighest = index === 0;
                const isCorrectAnswer = bid.selected_option === correctOption;
                const isPending = bid.team_id === pendingWinnerId && awaitingVerdict;
                return (
                  <tr key={bid.id} className={`transition-colors ${isPending ? 'bg-round-2-amber/10' : isHighest ? 'bg-round-2-orange/5 hover:bg-round-2-orange/10' : 'hover:bg-surface-muted/50'}`}>
                    <td className="py-space-md px-space-md">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-label-ticker text-body-sm border border-ink-primary ${isHighest ? 'bg-round-2-orange text-canvas-cream' : 'bg-surface-muted'}`}>
                        {index+1}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md font-bold text-ink-primary">
                      <div className="flex items-center gap-2">
                        {bid.team_name || `Team ${index+1}`}
                        {index < 3 && <span className="px-1.5 py-0.5 bg-round-2-orange/20 text-round-2-orange rounded text-[11px] font-label-sticker border border-ink-primary font-bold">CHANCE #{index+1}</span>}
                        {index >= 3 && <span className="px-1.5 py-0.5 bg-surface-muted text-ink-secondary rounded text-[10px] font-label-sticker border border-slate-300">NO CHANCE</span>}
                        {bid.is_winner && <span className="px-1.5 py-0.5 bg-status-correct/20 text-status-correct rounded text-[11px] font-label-sticker border border-ink-primary">WINNER</span>}
                      </div>
                    </td>
                    <td className={`py-space-md px-space-md font-label-code text-body-md font-extrabold ${isHighest ? 'text-round-2-orange' : 'text-ink-primary'}`}>
                      {bid.bid_amount} coins
                    </td>
                    <td className="py-space-md px-space-md">
                      <span className={`px-space-sm py-1 rounded-md font-label-code font-bold shadow-sm inline-flex items-center gap-1 border ${isCorrectAnswer ? 'bg-status-correct/15 border-status-correct text-status-correct' : 'bg-surface-card border-ink-primary text-ink-primary'}`}>
                        {bid.selected_option} — {getOptionLabel(bid.selected_option || 'A')}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md">
                      {correctOption ? (isCorrectAnswer
                        ? <span className="text-status-correct font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span>YES</span>
                        : <span className="text-status-wrong font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">cancel</span>NO</span>
                      ) : <span className="text-ink-secondary">—</span>}
                    </td>
                    <td className="py-space-md px-space-md font-label-code text-body-sm text-ink-secondary">
                      {new Date(bid.bid_timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-space-md px-space-md text-right">
                      {!hammerDropped && (
                        <button
                          className={`px-space-md py-1 rounded-lg font-label-ticker text-body-sm shadow-sm active:scale-95 transition-all border border-ink-primary cursor-pointer ${isPending ? 'bg-round-2-amber text-canvas-cream border-round-2-amber' : 'bg-round-2-orange text-canvas-cream hover:bg-round-2-orange/90'}`}
                          onClick={() => dropHammer(bid.team_id)}>
                          {isPending ? 'Selected' : 'Lock Hammer'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {bids.length === 0 && (
                <tr><td colSpan={7} className="text-center py-6 text-ink-secondary font-body-md">No bids submitted yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-space-sm bg-surface-muted rounded-lg text-ink-secondary font-label-code text-body-sm border border-ink-primary">
          Scoring: 1 coin = +2pts | 2+ coins = +5pts | 4+ coins = +10pts | 8+ coins = +15pts. CORRECT = coins reset to 100.
        </div>
      </div>
    </div>
  );
}
