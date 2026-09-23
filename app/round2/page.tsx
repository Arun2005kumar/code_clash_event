'use client';

// app/round2/page.tsx — Round 2 Code Auction Arena matching Stitch UI design

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getTeamSession } from '@/lib/auth/session';
import AntiCheatGuard from '@/components/anti-cheat/AntiCheatGuard';
import ScorePopup from '@/components/animations/ScorePopup';
import Header from '@/components/layout/Header';
import { Round2Question, Round2TeamState, Round2Bid, Option, BidAmount } from '@/types';

type BidStatus = 'idle' | 'placing' | 'placed' | 'resolved';

export default function Round2Page() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getTeamSession>>(null);
  const [teamState, setTeamState] = useState<Round2TeamState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Round2Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<Option>('B');
  const [selectedBid, setSelectedBid] = useState<BidAmount>(5);
  const [bidStatus, setBidStatus] = useState<BidStatus>('idle');
  const [myBid, setMyBid] = useState<Round2Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [scorePop, setScorePop] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(38);
  const prevScore = useRef(0);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }, []);

  useEffect(() => {
    const s = getTeamSession();
    if (!s) { router.replace('/'); return; }
    setSession(s);
  }, [router]);

  const loadState = useCallback(async () => {
    if (!session) return;
    const supabase = getSupabase();

    // Fetch competition settings
    const { data: settings } = await supabase
      .from('competition_settings')
      .select('round2_active, current_round2_question')
      .limit(1)
      .maybeSingle();

    if (!settings?.round2_active) {
      setLoading(false);
      return;
    }

    // Get team state
    const { data: state } = await supabase
      .from('round2_team_state')
      .select('*')
      .eq('team_id', session.teamId)
      .single();

    if (state) {
      if (state.score > prevScore.current) {
        setScorePop(true);
        setTimeout(() => setScorePop(false), 2000);
      }
      prevScore.current = state.score;
      setTeamState(state);
    }

    // Get current question
    const { data: q } = await supabase
      .from('round2_questions_public')
      .select('*')
      .eq('question_number', settings.current_round2_question)
      .single();

    if (q) {
      setCurrentQuestion(q);

      // Check existing bid for team
      const { data: existingBid } = await supabase
        .from('round2_bids')
        .select('*')
        .eq('team_id', session.teamId)
        .eq('question_id', q.id)
        .single();

      if (existingBid) {
        setMyBid(existingBid);
        setSelectedOption(existingBid.selected_option);
        setSelectedBid(existingBid.bid_amount as BidAmount);
        setBidStatus('placed');
      } else {
        setMyBid(null);
        setSelectedOption('B');
        setSelectedBid(5);
        setBidStatus('idle');
      }
    }

    setLoading(false);
  }, [session, getSupabase]);

  useEffect(() => {
    if (!session) return;
    loadState();
  }, [session, loadState]);

  // Realtime subscriptions
  useEffect(() => {
    if (!session) return;
    const supabase = getSupabase();

    const channel = supabase
      .channel('round2-team-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round2_team_state', filter: `team_id=eq.${session.teamId}` }, () => { loadState(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => { loadState(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round2_questions' }, () => { loadState(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, loadState, getSupabase]);

  // Countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePlaceBid = async () => {
    if (!session || !currentQuestion || !selectedOption || !selectedBid) {
      toast.error('Please select an answer option AND a bid amount!');
      return;
    }
    if (bidStatus !== 'idle') return;

    setBidStatus('placing');
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('place_bid', {
      p_team_id: session.teamId,
      p_question_id: currentQuestion.id,
      p_selected_option: selectedOption,
      p_bid_amount: selectedBid,
    });

    if (error || !data?.[0]?.success) {
      toast.error(data?.[0]?.message || 'Failed to place bid. Please try again.');
      setBidStatus('idle');
      return;
    }

    setBidStatus('placed');
    toast.success('BID LOCKED! 🔒 Your wager is sealed in the contract.');
    loadState();
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-round-2-orange border-t-transparent rounded-full animate-spin" />
          <span className="font-label-code text-round-2-orange font-bold">CONNECTING TO AUCTION ARENA...</span>
        </div>
      </div>
    );
  }

  if (!teamState) {
    return (
      <div className="min-h-screen bg-canvas-cream font-body-md text-ink-primary flex flex-col">
        <Header />
        <main className="w-full pt-28 max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex-grow flex items-center justify-center">
          <div className="bg-surface-card p-space-lg rounded-2xl shadow-xl text-center max-w-md border-2 border-ink-primary">
            <div className="text-5xl mb-4">🔨</div>
            <h2 className="font-headline-lg text-headline-lg font-black text-ink-primary mb-2">Round 2 Auction Standby</h2>
            <p className="font-body-md text-body-md text-ink-secondary mb-6">
              The auction master hasn&apos;t opened Round 2 yet. Grab some coffee and wait for signal.
            </p>
            <button 
              onClick={loadState} 
              className="px-space-md py-space-sm bg-round-2-orange text-canvas-cream font-label-ticker text-label-ticker uppercase rounded-lg shadow-md hover:translate-x-0.5 hover:translate-y-0.5 transition-all border-2 border-ink-primary cursor-pointer"
            >
              REFRESH AUCTION FLOOR
            </button>
          </div>
        </main>
      </div>
    );
  }

  const answerNames: Record<Option, string> = { A: 'Stack', B: 'Queue', C: 'Tree', D: 'Graph' };

  return (
    <AntiCheatGuard teamId={session.teamId}>
      <div className="bg-canvas-cream font-body-md text-body-md text-ink-primary min-h-screen flex flex-col">
        <Header />

        <main className="w-full pt-20 bg-canvas-cream flex-grow">
          <div className="flex flex-col w-full">
            <div className="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-md flex flex-col gap-space-lg">
              
              {/* TOP ARENA STATUS COCKPIT */}
              <section className="w-full bg-surface-card rounded-xl p-space-md lg:p-space-lg shadow-xl relative overflow-hidden border-2 border-ink-primary">
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-round-2-orange/10 blur-3xl pointer-events-none"></div>
                <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-round-2-amber/10 blur-2xl pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md relative z-10">
                  
                  {/* Round Title & Live Beacon */}
                  <div className="flex flex-wrap items-center gap-space-sm sm:gap-space-md">
                    <div className="inline-flex items-center gap-space-xs bg-round-2-orange text-on-primary px-space-md py-1.5 rounded-lg shadow-md border border-ink-primary">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
                      <span className="font-headline-sm text-headline-sm uppercase tracking-wider">ROUND 02 — THE CODE AUCTION</span>
                    </div>
                    <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-muted rounded-full border border-ink-primary">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-round-2-orange opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-round-2-orange"></span>
                      </span>
                      <span className="font-label-sticker text-label-sticker text-round-2-orange uppercase tracking-wide">LIVE BIDDING PHASE</span>
                    </div>
                    <div className="hidden sm:inline-block -rotate-2 px-space-xs py-0.5 bg-round-2-amber/20 text-on-surface rounded border border-ink-primary">
                      <span className="font-label-sticker text-label-sticker uppercase text-round-2-orange font-bold">⚡ STAKES DOUBLED</span>
                    </div>
                  </div>

                  {/* Vital Statistics HUD: Purse, Score, Timer */}
                  <div className="flex flex-wrap items-center gap-space-sm sm:gap-space-md">
                    {/* Team Purse */}
                    <div className="flex items-center gap-space-xs bg-surface-muted px-space-md py-2 rounded-xl shadow-sm border border-ink-primary">
                      <div className="w-8 h-8 rounded-full bg-currency-gold flex items-center justify-center text-on-surface shadow-inner animate-bounce border border-ink-primary">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase leading-none">TEAM PURSE</span>
                        <span className="font-headline-sm text-headline-sm text-ink-primary font-black" id="purse-display">
                          {teamState.coins} Coins
                        </span>
                      </div>
                    </div>

                    {/* Current Score */}
                    <div className="flex items-center gap-space-xs bg-surface-muted px-space-md py-2 rounded-xl shadow-sm border border-ink-primary">
                      <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary border border-ink-primary">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase leading-none">TEAM SCORE</span>
                        <span className="font-headline-sm text-headline-sm text-primary font-black">{teamState.score} pts</span>
                      </div>
                    </div>

                    {/* Lot Index & Live Clock */}
                    <div className="flex items-center gap-space-xs bg-round-2-orange text-on-primary px-space-md py-2 rounded-xl shadow-lg border border-ink-primary">
                      <span className="material-symbols-outlined text-[24px]">timer</span>
                      <div className="flex flex-col">
                        <span className="font-label-sticker text-label-sticker text-on-primary/80 uppercase leading-none">
                          LOT #{String(currentQuestion?.question_number || 3).padStart(2, '0')} / 06
                        </span>
                        <span className={`font-label-code text-label-code text-on-primary font-extrabold tracking-wider ${timeRemaining <= 10 ? 'text-status-wrong animate-pulse' : ''}`}>
                          ⏳ 00:{String(timeRemaining).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </section>

              {/* MAIN INTERACTIVE ARENA (SPLIT 7:5 GRID) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                
                {/* LEFT STAGE (7 COLS): THE AUCTION LOT & OPTIONS */}
                <section className="lg:col-span-7 flex flex-col gap-space-lg">
                  
                  {/* Primary Question Lot Card */}
                  <div className="bg-surface-card rounded-xl p-space-md lg:p-space-lg shadow-xl relative border-2 border-ink-primary">
                    
                    {/* Terminal-style top status bar */}
                    <div className="flex items-center justify-between pb-space-sm mb-space-md bg-surface-muted px-space-md py-space-xs rounded-lg border border-ink-primary">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-status-wrong inline-block border border-ink-primary"></span>
                        <span className="w-3 h-3 rounded-full bg-currency-gold inline-block border border-ink-primary"></span>
                        <span className="w-3 h-3 rounded-full bg-status-correct inline-block border border-ink-primary"></span>
                        <span className="font-label-sticker text-label-sticker text-ink-secondary ml-space-xs">AUCTION_ENGINE_V2.0</span>
                      </div>
                      <span className="font-label-sticker text-label-sticker uppercase px-space-sm py-0.5 rounded bg-round-2-orange/20 text-round-2-orange font-bold border border-ink-primary">
                        AUCTION LOT #{String(currentQuestion?.question_number || 3).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-space-sm mb-space-lg">
                      <div className="inline-block px-space-sm py-0.5 bg-round-2-amber/20 text-on-secondary-container rounded font-label-sticker text-label-sticker border border-ink-primary">
                        CATEGORY: CORE DATA STRUCTURES
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-ink-primary font-black leading-tight">
                        {currentQuestion?.question_text || 'Which data structure strictly follows the First-In, First-Out (FIFO) principle?'}
                      </h2>
                      <p className="font-body-md text-body-md text-ink-secondary">
                        Inspect the operational models. Lock in your answer and match it with a wager on the auction pad.
                      </p>
                    </div>

                    {/* Answer Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md" id="answer-matrix">
                      {(['A', 'B', 'C', 'D'] as Option[]).map((opt) => {
                        const isSelected = selectedOption === opt;
                        const optionText = currentQuestion ? (currentQuestion[`option_${opt.toLowerCase()}` as keyof Round2Question] as string) : answerNames[opt];

                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={bidStatus !== 'idle'}
                            onClick={() => setSelectedOption(opt)}
                            className={`answer-card text-left p-space-md rounded-xl transition-all flex items-center justify-between group cursor-pointer border-2 border-ink-primary ${
                              isSelected
                                ? 'bg-round-1-blue/10 ring-2 ring-round-1-blue shadow-md'
                                : 'bg-surface-muted hover:bg-surface-container shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-space-sm">
                              <span className={`opt-badge w-9 h-9 rounded-lg flex items-center justify-center font-label-code text-label-code font-black shadow-sm border border-ink-primary ${
                                isSelected ? 'bg-round-1-blue text-on-primary' : 'bg-surface-card text-ink-primary'
                              }`}>
                                {opt}
                              </span>
                              <div>
                                <span className="font-headline-sm text-headline-sm text-ink-primary font-bold">{optionText}</span>
                                {isSelected && (
                                  <span className="block font-label-sticker text-label-sticker text-round-1-blue font-bold">SELECTED TARGET</span>
                                )}
                              </div>
                            </div>
                            <span className={`check-icon material-symbols-outlined text-status-correct text-[28px] ${isSelected ? 'opacity-100' : 'opacity-0'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                              check_circle
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Micro-sticker footers */}
                    <div className="mt-space-lg pt-space-md flex flex-wrap items-center justify-between gap-space-sm bg-surface-muted/50 p-space-sm rounded-lg border border-ink-primary">
                      <div className="flex items-center gap-space-xs text-ink-secondary">
                        <span className="material-symbols-outlined text-[18px]">verified_user</span>
                        <span className="font-body-sm text-body-sm">Strict single submission per active lot</span>
                      </div>
                      <div className="inline-block px-space-xs py-0.5 bg-currency-gold/20 text-on-surface rounded -rotate-1 border border-ink-primary">
                        <span className="font-label-sticker text-label-sticker font-bold uppercase">💡 FIFO = First In First Out</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Live Feed Activity Log */}
                  <div className="bg-surface-card rounded-xl p-space-md shadow-lg flex flex-col gap-space-sm border-2 border-ink-primary">
                    <div className="flex items-center justify-between">
                      <span className="font-label-ticker text-label-ticker text-ink-primary uppercase tracking-wider flex items-center gap-space-xs">
                        <span className="w-2 h-2 rounded-full bg-status-correct animate-pulse"></span> ARENA LIVE BID ACTIVITY
                      </span>
                      <span className="font-label-sticker text-label-sticker text-ink-secondary">CONNECTED TEAMS: 16</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                      <div className="p-space-xs px-space-sm rounded-lg bg-surface-muted flex items-center justify-between text-body-sm border border-ink-primary">
                        <span className="font-bold text-ink-primary">#TEAM-NULL</span>
                        <span className="text-round-2-orange font-label-sticker text-label-sticker font-bold">BID 5 🪙 🔥</span>
                      </div>
                      <div className="p-space-xs px-space-sm rounded-lg bg-surface-muted flex items-center justify-between text-body-sm border border-ink-primary">
                        <span className="font-bold text-ink-primary">#BYTE-BANDITS</span>
                        <span className="text-currency-gold font-label-sticker text-label-sticker font-bold">BID 2 🪙</span>
                      </div>
                      <div className="p-space-xs px-space-sm rounded-lg bg-surface-muted flex items-center justify-between text-body-sm border border-ink-primary">
                        <span className="font-bold text-ink-primary">#STACK-OVERFLOW</span>
                        <span className="text-ink-secondary font-label-sticker text-label-sticker font-bold">BID 1 🪙</span>
                      </div>
                    </div>
                  </div>

                </section>

                {/* RIGHT STAGE (5 COLS): WAGER PAD & HAMMER CONSOLE */}
                <section className="lg:col-span-5 flex flex-col gap-space-lg">
                  
                  {/* Wager / Bid Selection Box */}
                  <div className="bg-surface-card rounded-xl p-space-md lg:p-space-lg shadow-xl relative overflow-hidden border-2 border-ink-primary">
                    <div className="flex flex-col gap-space-xs mb-space-md">
                      <div className="flex items-center justify-between">
                        <h3 className="font-headline-md text-headline-md text-ink-primary uppercase font-black tracking-tight">
                          CHOOSE YOUR BID
                        </h3>
                        <span className="px-space-xs py-0.5 rounded bg-round-2-orange text-on-primary font-label-sticker text-label-sticker font-bold uppercase animate-pulse border border-ink-primary">
                          HIGH VOLATILITY
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-ink-secondary">
                        Spend wisely. Your coins are not renewable energy. Correct bids multiply rewards; failed bids vaporize the coins.
                      </p>
                    </div>

                    {/* Bidding Cards Tier Selector */}
                    <div className="flex flex-col gap-space-md mb-space-lg" id="bid-selector-group">
                      {/* Tier 1: 1 Coin */}
                      <div
                        onClick={() => bidStatus === 'idle' && setSelectedBid(1)}
                        className={`bid-card cursor-pointer p-space-md rounded-xl transition-all flex items-center justify-between shadow-sm border-2 border-ink-primary ${
                          selectedBid === 1 ? 'selected-bid bg-round-2-orange/15 ring-2 ring-round-2-orange shadow-lg' : 'bg-surface-muted hover:bg-surface-container'
                        }`}
                      >
                        <div className="flex items-center gap-space-md">
                          <div className="w-12 h-12 rounded-xl bg-surface-card flex items-center justify-center font-headline-md text-headline-md text-ink-primary font-black shadow-sm border border-ink-primary">
                            1🪙
                          </div>
                          <div>
                            <h4 className="font-headline-sm text-headline-sm text-ink-primary">Low Risk</h4>
                            <p className="font-body-sm text-body-sm text-ink-secondary">Safe play, steady climb</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-label-ticker text-label-ticker text-status-correct font-extrabold px-space-sm py-1 bg-status-correct/10 rounded-lg inline-block border border-ink-primary">+2 pts</span>
                        </div>
                      </div>

                      {/* Tier 2: 2 Coins */}
                      <div
                        onClick={() => bidStatus === 'idle' && setSelectedBid(2)}
                        className={`bid-card cursor-pointer p-space-md rounded-xl transition-all flex items-center justify-between shadow-sm border-2 border-ink-primary ${
                          selectedBid === 2 ? 'selected-bid bg-round-2-orange/15 ring-2 ring-round-2-orange shadow-lg' : 'bg-surface-muted hover:bg-surface-container'
                        }`}
                      >
                        <div className="flex items-center gap-space-md">
                          <div className="w-12 h-12 rounded-xl bg-surface-card flex items-center justify-center font-headline-md text-headline-md text-ink-primary font-black shadow-sm border border-ink-primary">
                            2🪙
                          </div>
                          <div>
                            <h4 className="font-headline-sm text-headline-sm text-ink-primary">Balanced</h4>
                            <p className="font-body-sm text-body-sm text-ink-secondary">Solid competitive standard</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-label-ticker text-label-ticker text-status-correct font-extrabold px-space-sm py-1 bg-status-correct/10 rounded-lg inline-block border border-ink-primary">+5 pts</span>
                        </div>
                      </div>

                      {/* Tier 3: 5 Coins (Selected Max Bid) */}
                      <div
                        onClick={() => bidStatus === 'idle' && setSelectedBid(5)}
                        className={`bid-card cursor-pointer p-space-md rounded-xl transition-all flex items-center justify-between shadow-lg relative overflow-hidden border-2 border-ink-primary ${
                          selectedBid === 5 ? 'selected-bid bg-round-2-orange/15 ring-2 ring-round-2-orange shadow-lg' : 'bg-surface-muted hover:bg-surface-container'
                        }`}
                      >
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-round-2-orange/20 rounded-full blur-xl pointer-events-none"></div>
                        <div className="flex items-center gap-space-md relative z-10">
                          <div className="w-12 h-12 rounded-xl bg-round-2-orange text-on-primary flex items-center justify-center font-headline-md text-headline-md font-black shadow-md border border-ink-primary">
                            5🪙
                          </div>
                          <div>
                            <div className="flex items-center gap-space-xs">
                              <h4 className="font-headline-sm text-headline-sm text-ink-primary font-black">MAX BID</h4>
                              <span className="px-space-xs py-0.5 rounded-full bg-round-2-orange text-on-primary font-label-sticker text-label-sticker font-bold animate-bounce border border-ink-primary">🔥 HIGH ROLLER</span>
                            </div>
                            <p className="font-body-sm text-body-sm text-round-2-orange font-bold">All-in tactical dominance</p>
                          </div>
                        </div>
                        <div className="text-right relative z-10">
                          <span className="font-label-ticker text-label-ticker text-on-primary bg-round-2-orange font-extrabold px-space-sm py-1 rounded-lg inline-block shadow-sm border border-ink-primary">+10 pts</span>
                        </div>
                      </div>
                    </div>

                    {/* Big Tactile CTA Lock Button */}
                    <button
                      className={`w-full py-space-md px-space-lg rounded-xl font-headline-sm text-headline-sm font-black tracking-wide transition-all flex items-center justify-center gap-space-sm shadow-xl group border-2 border-ink-primary cursor-pointer ${
                        bidStatus === 'placed'
                          ? 'bg-status-correct text-on-primary cursor-not-allowed'
                          : 'bg-round-2-orange hover:bg-round-2-orange/90 active:scale-[0.98] text-on-primary'
                      }`}
                      id="lock-bid-cta"
                      onClick={handlePlaceBid}
                      type="button"
                      disabled={bidStatus !== 'idle'}
                    >
                      <span className="material-symbols-outlined text-[26px] group-hover:-rotate-45 transition-transform">
                        {bidStatus === 'placed' ? 'task_alt' : 'gavel'}
                      </span>
                      <span id="cta-label">
                        {bidStatus === 'placed' ? 'BID LOCKED IN CONSOLE' : `LOCK MY BID (${selectedBid} 🪙)`}
                      </span>
                    </button>

                    {/* Warning strip */}
                    <div className="mt-space-md flex items-center gap-space-xs text-ink-secondary text-body-sm justify-center">
                      <span className="material-symbols-outlined text-[16px] text-round-2-orange">lock</span>
                      <span>Once the hammer drops, locks are strictly non-refundable.</span>
                    </div>
                  </div>

                  {/* WAITING & HAMMER STATE FEEDBACK COMPONENT */}
                  <div className="bg-surface-card rounded-xl p-space-md lg:p-space-lg shadow-xl relative overflow-hidden transition-all duration-300 border-2 border-ink-primary" id="hammer-state-card">
                    <div className="flex items-center justify-between border-b pb-space-sm border-surface-muted mb-space-md">
                      <div className="flex items-center gap-space-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-round-2-orange animate-ping"></span>
                        <span className="font-label-ticker text-label-ticker text-round-2-orange uppercase font-extrabold tracking-wider">AUCTIONEER CONSOLE</span>
                      </div>
                      <span className="font-label-sticker text-label-sticker text-ink-secondary">STAGE_SYNC_ACTIVE</span>
                    </div>

                    {/* Bid Locked Badge */}
                    <div className="bg-status-correct/10 p-space-sm rounded-xl flex items-center justify-between mb-space-md shadow-sm border border-ink-primary">
                      <div className="flex items-center gap-space-sm">
                        <span className="material-symbols-outlined text-status-correct text-[24px]">verified</span>
                        <span className="font-headline-sm text-headline-sm text-ink-primary font-bold" id="locked-summary">
                          {bidStatus === 'placed' ? '🔒 BID LOCKED:' : '🔒 BID READY:'} {selectedBid} 🪙 on Option {selectedOption} ({answerNames[selectedOption]})
                        </span>
                      </div>
                      <span className="px-space-xs py-0.5 rounded bg-status-correct text-on-primary font-label-sticker text-label-sticker font-bold uppercase border border-ink-primary">
                        {bidStatus === 'placed' ? 'LOCKED' : 'STAGED'}
                      </span>
                    </div>

                    {/* Animated Hammer Doodle & Fun Commentary */}
                    <div className="flex flex-col items-center text-center p-space-md rounded-xl bg-surface-muted/60 relative border border-ink-primary">
                      <div className="w-20 h-20 mb-space-sm flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-round-2-amber/20 rounded-full blur-md"></div>
                        <svg className="w-16 h-16 text-round-2-orange origin-bottom-right transition-transform duration-300 hover:rotate-12" fill="none" id="hammer-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                          <rect fill="currentColor" height="18" rx="4" width="30" x="24" y="6"></rect>
                          <rect fill="#0F172A" height="10" rx="2" width="6" x="20" y="10"></rect>
                          <rect fill="#0F172A" height="10" rx="2" width="6" x="52" y="10"></rect>
                          <path d="M36 24L14 54C13 55.5 10.5 56 9 54.5L7.5 53C6 51.5 6.5 49 8 48L30 24" stroke="#0F172A" strokeLinecap="round" strokeWidth="4"></path>
                          <path d="M50 32L58 36" stroke="#F59E0B" strokeLinecap="round" strokeWidth="3"></path>
                          <path d="M46 42L52 48" stroke="#F59E0B" strokeLinecap="round" strokeWidth="3"></path>
                          <circle cx="56" cy="46" fill="#F97316" r="2"></circle>
                        </svg>
                      </div>
                      <p className="font-headline-sm text-headline-sm text-ink-primary font-black mb-1">
                        Waiting for the admin hammer...
                      </p>
                      <p className="font-body-md text-body-md text-ink-secondary italic max-w-sm mb-space-md">
                        “Now we wait and pretend this was a calculated decision.”
                      </p>
                      <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-card rounded-full shadow-sm -rotate-1 border border-ink-primary">
                        <span className="font-label-code text-label-code text-round-2-orange font-black uppercase tracking-wider">
                          GOING ONCE... GOING TWICE... BONK! 🔨
                        </span>
                      </div>
                    </div>

                    {/* Micro Quick Action: Emergency Switch */}
                    <div className="mt-space-md flex items-center justify-between pt-space-xs">
                      <span className="font-label-sticker text-label-sticker text-ink-secondary">DESPERATE MOVE?</span>
                      <button
                        className="font-label-sticker text-label-sticker uppercase px-space-sm py-1 bg-surface-muted hover:bg-surface-container text-ink-primary rounded font-bold transition-all border border-ink-primary cursor-pointer"
                        onClick={() => toast.info('Double down bonus locked in! Stay sharp.')}
                        type="button"
                      >
                        ⚡ CALL FOR HINT (-1 COIN)
                      </button>
                    </div>
                  </div>

                </section>
              </div>

            </div>
          </div>
        </main>

        <footer className="w-full bg-surface-muted border-t-2 border-ink-primary py-space-lg">
          <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex flex-col sm:flex-row items-center gap-space-sm text-center sm:text-left">
              <p className="font-headline-sm text-headline-sm text-ink-primary">Think Fast. Code Smart. Bid Smarter.</p>
              <span className="hidden sm:inline text-ink-secondary">•</span>
              <span className="font-body-sm text-body-sm text-ink-secondary">College Coding Club Platform</span>
            </div>
            <div className="inline-block px-space-sm py-1 bg-surface-card border-2 border-ink-primary rounded-full shadow-[2px_2px_0px_#0F172A] -rotate-2">
              <span className="font-label-sticker text-label-sticker text-ink-primary uppercase">Built with ⚡ &amp; caffeine</span>
            </div>
          </div>
        </footer>
      </div>
    </AntiCheatGuard>
  );
}
