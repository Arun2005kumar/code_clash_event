'use client';

// app/page.tsx — Stitch Design Homepage & Real-time Team Entry

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { setTeamSession } from '@/lib/auth/session';
import BloomTransition from '@/components/animations/BloomTransition';

export default function HomePage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderRegNo, setLeaderRegNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [bloom, setBloom] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleEnterArena = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTeamName = teamName.trim();
    const cleanLeaderName = leaderName.trim();
    const cleanRegNo = leaderRegNo.trim().toUpperCase();

    if (!cleanTeamName || !cleanLeaderName || !cleanRegNo) {
      toast.error('Please fill in Team Name, Leader Name, and Register Number!');
      return;
    }

    setLoading(true);
    setFeedbackMsg(`Connecting ${cleanTeamName} to Stage 01 Sprint... 🚀`);

    try {
      const supabase = createClient();

      // 1. Check existing team by team_name or leader_reg_no
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('*')
        .or(`team_name.ilike.${cleanTeamName},leader_reg_no.ilike.${cleanRegNo}`)
        .maybeSingle();

      if (existingTeam) {
        await supabase
          .from('teams')
          .update({
            login_status: true,
            leader_name: cleanLeaderName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTeam.id);

        setTeamSession({
          teamId: existingTeam.id,
          teamName: existingTeam.team_name,
          leaderName: cleanLeaderName,
          leaderRegNo: cleanRegNo,
        });

        setFeedbackMsg(`Authenticated! Loading challenges... ⚡`);
        toast.success(`🎉 WELCOME BACK, ${existingTeam.team_name.toUpperCase()}!`);
        setTimeout(() => setBloom(true), 600);
        return;
      }

      // 2. Try RPC registration
      const { data: rpcData, error: rpcError } = await supabase.rpc('validate_team_login', {
        p_team_name: cleanTeamName,
        p_leader_name: cleanLeaderName,
        p_leader_reg_no: cleanRegNo,
      });

      if (!rpcError && rpcData?.[0]?.success) {
        const res = rpcData[0];
        setTeamSession({
          teamId: res.team_id,
          teamName: res.team_name,
          leaderName: res.leader_name,
          leaderRegNo: res.leader_reg_no,
        });
        setFeedbackMsg(`Authenticated! Loading challenges... ⚡`);
        toast.success(`🎉 WELCOME, ${res.team_name.toUpperCase()}!`);
        setTimeout(() => setBloom(true), 600);
        return;
      }

      // 3. Fallback insert new team
      const { data: newTeam, error: insertError } = await supabase
        .from('teams')
        .insert({
          team_name: cleanTeamName,
          leader_name: cleanLeaderName,
          leader_reg_no: cleanRegNo,
          login_status: true,
        })
        .select()
        .single();

      if (insertError) {
        toast.error("That team registration didn't work 😅 Check it once and try again.");
        setLoading(false);
        setFeedbackMsg('');
        return;
      }

      await supabase
        .from('round2_team_state')
        .upsert({
          team_id: newTeam.id,
          score: 0,
          coins: 100,
          status: 'waiting',
        }, { onConflict: 'team_id' });

      setTeamSession({
        teamId: newTeam.id,
        teamName: newTeam.team_name,
        leaderName: newTeam.leader_name,
        leaderRegNo: newTeam.leader_reg_no,
      });

      setFeedbackMsg(`Authenticated! Loading challenges... ⚡`);
      toast.success(`🎉 WELCOME, ${newTeam.team_name.toUpperCase()}!`);
      setTimeout(() => setBloom(true), 600);
    } catch (err: any) {
      toast.error("That team registration didn't work 😅 Check it once and try again.");
      setLoading(false);
      setFeedbackMsg('');
    }
  };

  const handleBloomComplete = () => {
    router.push('/round1');
  };

  return (
    <div className="bg-canvas-cream font-body-md text-body-md text-ink-primary min-h-screen flex flex-col">
      <Header />

      <main className="w-full pt-20 bg-canvas-cream flex-grow">
        <div className="flex flex-col w-full">
          
          {/* Main Hero Centered Section */}
          <div className="relative w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-lg lg:py-space-xl overflow-hidden">
            
            {/* Ambient Floating Neo-Brutalist Doodles / Particles */}
            <div className="absolute top-6 left-10 select-none pointer-events-none transform -rotate-12 hidden md:block z-0">
              <span className="inline-block px-space-sm py-1 bg-round-2-amber text-ink-primary font-label-sticker text-label-sticker rounded-lg shadow-md border-0">
                {'{ }'} syntax_valid
              </span>
            </div>
            <div className="absolute top-24 right-16 select-none pointer-events-none transform rotate-6 hidden md:block z-0">
              <span className="inline-block px-space-sm py-1 bg-round-3-pink text-surface-card font-label-sticker text-label-sticker rounded-lg shadow-md">
                {'</>'} 0101_READY
              </span>
            </div>
            <div className="absolute bottom-40 left-8 select-none pointer-events-none transform rotate-12 hidden lg:block z-0">
              <span className="inline-block px-space-sm py-1 bg-surface-container-highest text-round-1-blue font-label-sticker text-label-sticker rounded-lg shadow-sm">
                console.log(&quot;LETS GO!&quot;);
              </span>
            </div>
            <div className="absolute top-1/2 right-6 select-none pointer-events-none transform -rotate-6 hidden lg:block z-0">
              <span className="text-display-xl font-display-xl text-currency-gold opacity-90 drop-shadow-sm">★</span>
            </div>

            {/* Main Content Box */}
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto relative z-10">
              
              {/* Cheerful Badge */}
              <div className="inline-flex items-center gap-space-xs px-space-md py-1.5 bg-currency-gold/20 text-on-secondary-container rounded-full shadow-sm mb-space-md transform hover:scale-105 transition-transform duration-200">
                <span className="material-symbols-outlined text-currency-gold text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                <span className="font-label-ticker text-label-ticker uppercase tracking-wider text-ink-primary font-extrabold">CODING CLUB PRESENTS</span>
              </div>

              {/* Main Heading & Punchy Tagline */}
              <h1 className="font-display-xl text-display-xl text-ink-primary tracking-tight mb-space-sm">
                CODING CLUB{' '}
                <span className="relative inline-block text-primary-container">
                  CHALLENGE
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-secondary-container" fill="none" preserveAspectRatio="none" viewBox="0 0 200 12" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9C45 3 155 3 197 9" stroke="currentColor" strokeLinecap="round" strokeWidth="6"></path>
                  </svg>
                </span>
              </h1>
              <p className="font-headline-md text-headline-md text-ink-secondary mt-space-xs max-w-2xl">
                Three rounds. One team. Zero excuses.
              </p>

              {/* Visual Terminal & Sticker Pill Hero Element */}
              <div className="w-full max-w-xl mt-space-lg mb-space-xl relative">
                <div className="bg-surface-card rounded-xl p-space-md shadow-xl text-left transform -rotate-1 hover:rotate-0 transition-transform duration-300 border-2 border-ink-primary">
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-muted/60 px-space-sm py-1 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-status-wrong inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-currency-gold inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-status-correct inline-block"></span>
                    </div>
                    <span className="font-label-code text-label-code text-ink-secondary">terminal://arena_v2.5.sh</span>
                    <span className="material-symbols-outlined text-ink-secondary text-[16px]">terminal</span>
                  </div>
                  {/* Terminal Body */}
                  <div className="font-label-code text-label-code text-ink-primary space-y-1">
                    <p><span className="text-round-1-blue font-bold">visitor@hack-box</span>:<span className="text-round-3-purple">~</span>$ ./init_arena --squad-mode</p>
                    <p className="text-status-correct">✔ Loaded 3 High-Octane Coding Trials</p>
                    <p className="text-round-2-orange font-bold">⚡ Arena server: STABLE | 142 Teams in queue</p>
                    <p className="text-ink-secondary flex items-center gap-1">
                      <span>Ready for squad authentication</span>
                      <span className="w-2 h-4 bg-primary inline-block animate-pulse"></span>
                    </p>
                  </div>
                </div>

                {/* Quirky "NO BUGS ALLOWED*" Sticker */}
                <div className="absolute -bottom-5 -right-3 sm:-right-8 bg-round-2-amber text-ink-primary px-space-md py-1.5 rounded-lg shadow-lg transform rotate-3 hover:scale-105 transition-transform duration-200 border-2 border-ink-primary z-10">
                  <div className="flex items-center gap-1 font-label-sticker text-label-sticker font-extrabold uppercase">
                    <span className="material-symbols-outlined text-[16px]">pest_control</span>
                    <span>NO BUGS ALLOWED*</span>
                  </div>
                  <span className="block text-[9px] font-body-sm leading-tight text-ink-primary/80 italic font-semibold">*We can&apos;t actually guarantee that.</span>
                </div>
              </div>

              {/* Centered Squad Login Card */}
              <div className="w-full max-w-md bg-surface-card rounded-xl p-space-lg shadow-xl relative text-left border-2 border-ink-primary" id="loginForm">
                {/* Header with Sticker Badge */}
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-xs">
                    <span className="text-headline-md">🎮</span>
                    <h2 className="font-headline-md text-headline-md text-ink-primary font-black uppercase tracking-tight">WHO&apos;S READY?</h2>
                  </div>
                  <span className="bg-round-3-purple text-on-tertiary px-space-sm py-1 rounded-full font-label-sticker text-label-sticker uppercase tracking-wider shadow-sm transform -rotate-2">
                    NERD MODE ON
                  </span>
                </div>

                {/* Form Elements */}
                <form className="space-y-space-md" onSubmit={handleEnterArena}>
                  <div>
                    <label className="block font-label-ticker text-label-ticker text-ink-primary uppercase mb-space-xs font-bold" htmlFor="team-name">
                      Team Name
                    </label>
                    <div className="relative">
                      <input
                        className="w-full px-space-md py-space-sm bg-surface-muted text-ink-primary font-body-md rounded-lg shadow-sm border-2 border-ink-primary focus:outline-none focus:bg-surface-card transition-all duration-150"
                        id="team-name"
                        placeholder="e.g. SegFault Samurai"
                        required
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                      />
                      <span className="material-symbols-outlined absolute right-3 top-2.5 text-ink-secondary text-[20px]">groups</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-ticker text-label-ticker text-ink-primary uppercase mb-space-xs font-bold" htmlFor="leader-name">
                      Team Leader Name
                    </label>
                    <div className="relative">
                      <input
                        className="w-full px-space-md py-space-sm bg-surface-muted text-ink-primary font-body-md rounded-lg shadow-sm border-2 border-ink-primary focus:outline-none focus:bg-surface-card transition-all duration-150"
                        id="leader-name"
                        placeholder="e.g. Alex Rivera"
                        required
                        type="text"
                        value={leaderName}
                        onChange={(e) => setLeaderName(e.target.value)}
                      />
                      <span className="material-symbols-outlined absolute right-3 top-2.5 text-ink-secondary text-[20px]">person</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-ticker text-label-ticker text-ink-primary uppercase mb-space-xs font-bold" htmlFor="leader-reg-no">
                      Team Leader Register Number
                    </label>
                    <div className="relative">
                      <input
                        className="w-full px-space-md py-space-sm bg-surface-muted text-ink-primary font-label-code text-label-code rounded-lg shadow-sm border-2 border-ink-primary focus:outline-none focus:bg-surface-card transition-all duration-150 uppercase"
                        id="leader-reg-no"
                        placeholder="e.g. 24CS0892"
                        required
                        type="text"
                        value={leaderRegNo}
                        onChange={(e) => setLeaderRegNo(e.target.value)}
                      />
                      <span className="material-symbols-outlined absolute right-3 top-2.5 text-ink-secondary text-[20px]">badge</span>
                    </div>
                  </div>

                  {/* Big Tactile Bouncy Button */}
                  <div className="pt-space-xs">
                    <button
                      className="w-full py-space-md px-space-lg bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-headline-sm rounded-xl shadow-lg hover:shadow-xl active:translate-y-1 transition-all duration-150 flex items-center justify-center gap-space-sm group cursor-pointer border-2 border-ink-primary disabled:opacity-75"
                      id="submitBtn"
                      type="submit"
                      disabled={loading}
                    >
                      <span>{loading ? 'COMPILING IDENTITY...' : "LET'S CODE"}</span>
                      <span className="transform group-hover:translate-x-1 group-active:scale-95 transition-transform">→ 🚀</span>
                    </button>
                  </div>

                  {/* Funny Microcopy */}
                  <p className="text-center font-body-sm text-body-sm text-ink-secondary pt-1 flex items-center justify-center gap-1">
                    <span>🛡️</span>
                    <span>Don&apos;t worry. We won&apos;t judge your variable names.</span>
                  </p>
                </form>

                {feedbackMsg && (
                  <div className="mt-space-md p-space-sm bg-round-2-amber/20 text-on-secondary-container rounded-lg text-center font-label-ticker text-label-ticker border border-ink-primary" id="loginFeedback">
                    {feedbackMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Quick 3-Round Tournament Roadmap Preview */}
            <div className="mt-space-xl pt-space-lg max-w-5xl mx-auto relative z-10">
              <div className="flex items-center justify-between mb-space-md flex-wrap gap-space-sm">
                <div>
                  <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase tracking-widest block">CHALLENGE PROTOCOL</span>
                  <h3 className="font-headline-lg text-headline-lg text-ink-primary font-extrabold tracking-tight">TOURNAMENT ROADMAP</h3>
                </div>
                <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-card rounded-full shadow-sm text-ink-primary font-label-sticker text-label-sticker border border-ink-primary">
                  <span className="w-2 h-2 rounded-full bg-status-correct animate-pulse"></span>
                  <span>SYSTEM ONLINE • 3 PHASES</span>
                </div>
              </div>

              {/* Roadmap Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                
                {/* Round 1: MCQ Sprint */}
                <div className="bg-surface-card rounded-xl p-space-md shadow-md hover:shadow-xl transition-shadow flex flex-col justify-between group border-2 border-ink-primary">
                  <div>
                    <div className="flex items-center justify-between mb-space-sm">
                      <span className="px-space-sm py-0.5 bg-round-1-blue/15 text-round-1-blue rounded-md font-label-sticker text-label-sticker font-extrabold uppercase">STAGE 01</span>
                      <span className="inline-flex items-center gap-1 text-round-1-blue font-label-ticker text-label-ticker font-bold">
                        <span>Ready</span>
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-round-1-blue/10 flex items-center justify-center text-round-1-blue mb-space-sm group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[28px]">speed</span>
                    </div>
                    <h4 className="font-headline-md text-headline-md text-ink-primary mb-1">MCQ Sprint</h4>
                    <p className="font-body-sm text-body-sm text-ink-secondary mb-space-md">Rapid-fire algorithmic trivia, syntax spotting, and runtime complexity riddles.</p>
                  </div>
                  <div className="flex items-center justify-between pt-space-sm bg-surface-muted/50 -mx-space-md -mb-space-md px-space-md py-space-sm rounded-b-xl border-t border-ink-primary">
                    <span className="font-label-ticker text-label-ticker text-ink-primary flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-round-1-blue text-[18px]">quiz</span> 30 Questions
                    </span>
                    <span className="font-label-sticker text-label-sticker text-round-1-blue font-bold">25 MIN</span>
                  </div>
                </div>

                {/* Round 2: Code Auction */}
                <div className="bg-surface-card rounded-xl p-space-md shadow-md hover:shadow-xl transition-shadow flex flex-col justify-between relative group border-2 border-ink-primary">
                  <div className="absolute -top-3 right-4 bg-round-2-orange text-surface-card font-label-sticker text-label-sticker px-space-sm py-0.5 rounded-full shadow-md font-black animate-bounce border border-ink-primary">
                    LIVE NOW 🔥
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-space-sm">
                      <span className="px-space-sm py-0.5 bg-round-2-orange/15 text-round-2-orange rounded-md font-label-sticker text-label-sticker font-extrabold uppercase">STAGE 02</span>
                      <span className="inline-flex items-center gap-1 text-round-2-orange font-label-ticker text-label-ticker font-black">
                        <span>Auction Arena</span>
                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-round-2-orange/10 flex items-center justify-center text-round-2-orange mb-space-sm group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[28px]">toll</span>
                    </div>
                    <h4 className="font-headline-md text-headline-md text-ink-primary mb-1">Code Auction</h4>
                    <p className="font-body-sm text-body-sm text-ink-secondary mb-space-md">Bid your coins on buggy code snippets! Fix the bug to harvest massive returns or crash trying.</p>
                  </div>
                  <div className="flex items-center justify-between pt-space-sm bg-surface-muted/50 -mx-space-md -mb-space-md px-space-md py-space-sm rounded-b-xl border-t border-ink-primary">
                    <span className="font-label-ticker text-label-ticker text-round-2-orange flex items-center gap-1 font-extrabold">
                      <span>🪙</span> 100 Starting Coins
                    </span>
                    <span className="font-label-sticker text-label-sticker text-round-2-orange font-bold">BIDDING WAR</span>
                  </div>
                </div>

                {/* Round 3: The Final Boss */}
                <div className="bg-surface-card rounded-xl p-space-md shadow-md hover:shadow-xl transition-shadow flex flex-col justify-between opacity-90 hover:opacity-100 group border-2 border-ink-primary">
                  <div>
                    <div className="flex items-center justify-between mb-space-sm">
                      <span className="px-space-sm py-0.5 bg-round-3-purple/15 text-round-3-purple rounded-md font-label-sticker text-label-sticker font-extrabold uppercase">STAGE 03</span>
                      <span className="inline-flex items-center gap-1 text-ink-secondary font-label-ticker text-label-ticker">
                        <span>Locked</span>
                        <span className="material-symbols-outlined text-[16px]">lock</span>
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-round-3-purple/10 flex items-center justify-center text-round-3-purple mb-space-sm group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[28px]">smart_toy</span>
                    </div>
                    <h4 className="font-headline-md text-headline-md text-ink-primary mb-1">The Final Boss</h4>
                    <p className="font-body-sm text-body-sm text-ink-secondary mb-space-md">Top 8 teams unlock the monolith. Refactor live while coping with system outages and chaos mechanics.</p>
                  </div>
                  <div className="flex items-center justify-between pt-space-sm bg-surface-muted/50 -mx-space-md -mb-space-md px-space-md py-space-sm rounded-b-xl border-t border-ink-primary">
                    <span className="font-label-ticker text-label-ticker text-round-3-purple flex items-center gap-1 font-bold">
                      <span>👾</span> Mystery Boss
                    </span>
                    <span className="font-label-sticker text-label-sticker text-ink-secondary font-bold">TOP 8 ONLY</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Event Rules & Guidelines Section */}
            <div className="mt-space-xl pt-space-lg max-w-5xl mx-auto relative z-10" id="mission-rounds">
              <div className="flex items-center justify-between mb-space-md flex-wrap gap-space-sm">
                <div>
                  <span className="font-label-sticker text-label-sticker text-round-2-orange uppercase tracking-widest block font-bold">OFFICIAL TOURNAMENT CODE</span>
                  <h3 className="font-headline-lg text-headline-lg text-ink-primary font-black tracking-tight">RULES & REGULATIONS</h3>
                </div>
                <div className="flex items-center gap-space-xs px-space-sm py-1 bg-round-2-amber/20 rounded-full shadow-sm text-ink-primary font-label-sticker text-label-sticker border border-ink-primary">
                  <span className="material-symbols-outlined text-[16px] text-round-2-orange">gavel</span>
                  <span className="font-bold">FAIR PLAY ENFORCED</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                {/* Round 1 Rules */}
                <div className="bg-surface-card rounded-xl p-space-md shadow-md border-2 border-ink-primary flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-space-sm text-round-1-blue font-headline-sm font-black">
                      <span className="material-symbols-outlined text-[24px]">quiz</span>
                      <span>ROUND 1 — MCQ SPRINT</span>
                    </div>
                    <ul className="space-y-space-xs font-body-sm text-ink-secondary list-disc list-inside">
                      <li><strong className="text-ink-primary">30 Questions:</strong> Algorithmic trivia, Java syntax & DSA.</li>
                      <li><strong className="text-ink-primary">25 Minutes:</strong> Hard stop timer upon sprint initiation.</li>
                      <li><strong className="text-ink-primary">Anti-Cheat:</strong> Tab switches are logged and flagged automatically.</li>
                      <li><strong className="text-ink-primary">Scoring:</strong> Automated grading upon manual submit or timeout.</li>
                    </ul>
                  </div>
                </div>

                {/* Round 2 Rules */}
                <div className="bg-surface-card rounded-xl p-space-md shadow-md border-2 border-ink-primary flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-space-sm text-round-2-orange font-headline-sm font-black">
                      <span className="material-symbols-outlined text-[24px]">gavel</span>
                      <span>ROUND 2 — CODE AUCTION</span>
                    </div>
                    <ul className="space-y-space-xs font-body-sm text-ink-secondary list-disc list-inside">
                      <li><strong className="text-ink-primary">100 Starting Coins:</strong> Every team starts with a 100 coin purse.</li>
                      <li><strong className="text-ink-primary">Bidding War:</strong> Bid coins on buggy code lots across 6 questions.</li>
                      <li><strong className="text-ink-primary">Highest Bidders:</strong> Top 3 highest bidding teams get sequential chances if top bid is incorrect.</li>
                      <li><strong className="text-ink-primary">Official Answers:</strong> Revealed at the end of Round 2.</li>
                    </ul>
                  </div>
                </div>

                {/* Round 3 Rules */}
                <div className="bg-surface-card rounded-xl p-space-md shadow-md border-2 border-ink-primary flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-space-sm text-round-3-purple font-headline-sm font-black">
                      <span className="material-symbols-outlined text-[24px]">vpn_key</span>
                      <span>ROUND 3 — TECH HEIST</span>
                    </div>
                    <ul className="space-y-space-xs font-body-sm text-ink-secondary list-disc list-inside">
                      <li><strong className="text-ink-primary">Top Teams:</strong> Qualifying teams breach 5 infiltration targets.</li>
                      <li><strong className="text-ink-primary">Clue Collection:</strong> Recover 5 secret keys to unlock the central mainframe vault.</li>
                      <li><strong className="text-ink-primary">Live Chronometer:</strong> Continuous team timer active across all missions.</li>
                      <li><strong className="text-ink-primary">Vault Breach:</strong> Crack the final passcode to complete the challenge.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Hackathon Stats Strip */}
            <div className="mt-space-xl max-w-5xl mx-auto bg-surface-muted rounded-xl p-space-md shadow-sm flex flex-wrap items-center justify-between gap-space-md border-2 border-ink-primary">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-full bg-status-correct/20 flex items-center justify-center text-status-correct border border-ink-primary">
                  <span className="material-symbols-outlined text-[22px]">wifi</span>
                </div>
                <div>
                  <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase block">SERVER STATUS</span>
                  <span className="font-headline-sm text-headline-sm text-ink-primary font-bold">100% Operational</span>
                </div>
              </div>
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-full bg-currency-gold/20 flex items-center justify-center text-currency-gold border border-ink-primary">
                  <span className="material-symbols-outlined text-[22px]">trophy</span>
                </div>
                <div>
                  <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase block">PRIZE VAULT</span>
                  <span className="font-headline-sm text-headline-sm text-ink-primary font-bold">5,000 Arena Credits</span>
                </div>
              </div>
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-full bg-round-3-pink/20 flex items-center justify-center text-round-3-pink border border-ink-primary">
                  <span className="material-symbols-outlined text-[22px]">timer</span>
                </div>
                <div>
                  <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase block">NEXT LOCK-IN</span>
                  <span className="font-headline-sm text-headline-sm text-ink-primary font-bold">25 Min Sprint</span>
                </div>
              </div>
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

      <BloomTransition isActive={bloom} onComplete={handleBloomComplete} />
    </div>
  );
}
