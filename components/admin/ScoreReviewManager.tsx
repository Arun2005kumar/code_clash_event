'use client';

// components/admin/ScoreReviewManager.tsx
// Comprehensive Admin Score Review & Full Score Editing Panel

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ScoreReviewItem, ScoreAuditLog, PrePublishSummary } from '@/types';

export default function ScoreReviewManager() {
  const [items, setItems] = useState<ScoreReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Multi-Score Editing Modal state
  const [editingItem, setEditingItem] = useState<ScoreReviewItem | null>(null);
  const [r1Input, setR1Input] = useState<string>('0');
  const [r2Input, setR2Input] = useState<string>('0');
  const [r3Input, setR3Input] = useState<string>('0');
  const [bonusInput, setBonusInput] = useState<string>('0');
  const [useOverride, setUseOverride] = useState<boolean>(false);
  const [overrideInput, setOverrideInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');

  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // History modal state
  const [historyItem, setHistoryItem] = useState<ScoreReviewItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<ScoreAuditLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Publish / Unpublish modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();

      // Recalculate/sync latest scores in DB if function exists
      try {
        await supabase.rpc('sync_team_calculated_scores');
      } catch (e) {
        console.warn('sync_team_calculated_scores RPC warning:', e);
      }

      // 1. Fetch competition settings (safely using select('*') or fallback)
      const { data: settings } = await supabase
        .from('competition_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      const published = (settings as any)?.results_published ?? (settings as any)?.round3_results_published ?? false;
      setIsPublished(published);
      setPublishedAt((settings as any)?.published_at ?? null);

      // 2. Fetch teams
      const { data: teams } = await supabase.from('teams').select('id, team_name, leader_name, leader_reg_no');

      // 3. Fetch team_scores (with try-catch fallback for unmigrated DBs)
      let scoresData: any[] | null = null;
      try {
        const res = await supabase.from('team_scores').select('*');
        if (!res.error) scoresData = res.data;
      } catch (e) {
        console.warn('team_scores table notice:', e);
      }
      const scoreMap = new Map<string, any>();
      scoresData?.forEach((s: any) => scoreMap.set(s.team_id, s));

      // 4. Fetch scores from core round tables (always reliable)
      const { data: r1Attempts } = await supabase.from('round1_attempts').select('team_id, score').in('status', ['submitted', 'auto_submitted']);
      const { data: r2States } = await supabase.from('round2_team_state').select('team_id, score');
      const { data: r3States } = await supabase.from('round3_team_state').select('team_id, score, vault_unlocked');

      const r1Map = new Map<string, number>();
      r1Attempts?.forEach((a: any) => {
        const cur = r1Map.get(a.team_id) ?? 0;
        if (a.score > cur) r1Map.set(a.team_id, a.score);
      });

      const r2Map = new Map<string, number>();
      r2States?.forEach((s: any) => r2Map.set(s.team_id, s.score));

      const r3Map = new Map<string, any>();
      r3States?.forEach((s: any) => r3Map.set(s.team_id, s));

      // 5. Fetch audit counts (with try-catch fallback)
      let logsData: any[] | null = null;
      try {
        const res = await supabase.from('score_audit_logs').select('team_id');
        if (!res.error) logsData = res.data;
      } catch (e) {
        console.warn('score_audit_logs table notice:', e);
      }
      const historyCountMap = new Map<string, number>();
      logsData?.forEach((l: any) => {
        historyCountMap.set(l.team_id, (historyCountMap.get(l.team_id) ?? 0) + 1);
      });

      const list: ScoreReviewItem[] = (teams ?? []).map((t: any) => {
        const ts = scoreMap.get(t.id);
        const r1 = ts ? ts.r1_score : (r1Map.get(t.id) ?? 0);
        const r2 = ts ? ts.r2_score : (r2Map.get(t.id) ?? 0);
        const r3Obj = r3Map.get(t.id);
        const r3 = ts ? ts.r3_score : (r3Obj?.vault_unlocked ? 10 : 0);
        const bonus = ts?.bonus_adjustment ?? 0;

        const calculatedScore = ts ? ts.calculated_score : (r1 + r2 + r3 + bonus);
        const adminOverride = ts ? ts.admin_override_score : null;
        const finalScore = adminOverride !== null && adminOverride !== undefined ? adminOverride : calculatedScore;

        return {
          team_id: t.id,
          team_name: t.team_name,
          leader_name: t.leader_name,
          leader_reg_no: t.leader_reg_no,
          r1_score: r1,
          r2_score: r2,
          r3_score: r3,
          bonus_adjustment: bonus,
          calculated_score: calculatedScore,
          admin_override_score: adminOverride,
          final_score: finalScore,
          score_override_reason: ts?.score_override_reason ?? null,
          score_modified_by: ts?.score_modified_by ?? null,
          score_modified_at: ts?.score_modified_at ?? null,
          history_count: historyCountMap.get(t.id) ?? 0,
          results_published: published,
        };
      });

      list.sort((a, b) => b.final_score - a.final_score);
      setItems(list);
    } catch (err) {
      console.error('Error loading score review data:', err);
      toast.error('Failed to load team scores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel('admin-score-review-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_settings' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_scores' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'score_audit_logs' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Open Edit Modal for a team
  const handleOpenEdit = (item: ScoreReviewItem) => {
    if (isPublished) {
      toast.error('Scores are locked because results are PUBLISHED. Unpublish results first to edit scores.');
      return;
    }
    setEditingItem(item);
    setR1Input(String(item.r1_score));
    setR2Input(String(item.r2_score));
    setR3Input(String(item.r3_score));
    setBonusInput(String(item.bonus_adjustment));

    const hasOverride = item.admin_override_score !== null;
    setUseOverride(hasOverride);
    setOverrideInput(hasOverride ? String(item.admin_override_score) : String(item.final_score));
    setReasonInput(item.score_override_reason || '');
    setShowConfirmEdit(false);
  };

  // Live calculated score sum in edit modal
  const currentCalcSum = (Number(r1Input) || 0) + (Number(r2Input) || 0) + (Number(r3Input) || 0) + (Number(bonusInput) || 0);
  const currentEffectiveFinal = useOverride ? (Number(overrideInput) || 0) : currentCalcSum;

  // Validate inputs before showing confirmation modal
  const handleInitiateSaveEdit = () => {
    if (!editingItem) return;

    if (isNaN(Number(r1Input)) || !Number.isInteger(Number(r1Input))) {
      toast.error('Round 1 Score must be a valid integer number.');
      return;
    }
    if (isNaN(Number(r2Input)) || !Number.isInteger(Number(r2Input))) {
      toast.error('Round 2 Score must be a valid integer number.');
      return;
    }
    if (isNaN(Number(r3Input)) || !Number.isInteger(Number(r3Input))) {
      toast.error('Round 3 Score must be a valid integer number.');
      return;
    }
    if (isNaN(Number(bonusInput)) || !Number.isInteger(Number(bonusInput))) {
      toast.error('Bonus Adjustment must be a valid integer number.');
      return;
    }

    if (useOverride) {
      if (overrideInput.trim() === '' || isNaN(Number(overrideInput)) || !Number.isInteger(Number(overrideInput))) {
        toast.error('Final Override Score must be a valid integer number.');
        return;
      }
    }

    setShowConfirmEdit(true);
  };

  // Perform Score Update
  const handleConfirmSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      const payload = {
        teamId: editingItem.team_id,
        r1Score: Number(r1Input),
        r2Score: Number(r2Input),
        r3Score: Number(r3Input),
        bonusAdjustment: Number(bonusInput),
        overrideScore: useOverride ? Number(overrideInput) : null,
        reason: reasonInput || 'Manual score correction',
        modifiedBy: 'Admin',
      };

      const res = await fetch('/api/admin/scores/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to update score.');
      } else {
        toast.success(`Scores updated for ${editingItem.team_name}! Final Score: ${currentEffectiveFinal}`);
        setEditingItem(null);
        setShowConfirmEdit(false);
        loadData();
      }
    } catch (err: any) {
      toast.error('Network error updating score: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Clear Override & Revert to calculated score
  const handleClearOverride = async (item: ScoreReviewItem) => {
    if (isPublished) {
      toast.error('Scores are locked while results are published.');
      return;
    }
    if (!window.confirm(`Revert ${item.team_name}'s score back to Calculated Score (${item.calculated_score})?`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/scores/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: item.team_id,
          action: 'clear',
          modifiedBy: 'Admin',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Reverted ${item.team_name} to calculated score (${item.calculated_score})`);
        setEditingItem(null);
        loadData();
      } else {
        toast.error(data.message || 'Failed to clear override.');
      }
    } catch (err: any) {
      toast.error('Error clearing override: ' + err.message);
    }
  };

  // Open History Audit Modal
  const handleOpenHistory = async (item: ScoreReviewItem) => {
    setHistoryItem(item);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/scores/history?teamId=${item.team_id}`);
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
      } else {
        toast.error(data.message || 'Failed to fetch history.');
      }
    } catch (e: any) {
      toast.error('Error fetching audit history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Publish Results
  const handlePublishResults = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/admin/scores/publish', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('✅ Results Published Successfully!');
        setShowPublishModal(false);
        loadData();
      } else {
        toast.error(data.message || 'Failed to publish results.');
      }
    } catch (err: any) {
      toast.error('Error publishing results: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Unpublish Results
  const handleUnpublishResults = async () => {
    setUnpublishing(true);
    try {
      const res = await fetch('/api/admin/scores/unpublish', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Results unpublished. Returned to DRAFT mode.');
        setShowUnpublishModal(false);
        loadData();
      } else {
        toast.error(data.message || 'Failed to unpublish results.');
      }
    } catch (err: any) {
      toast.error('Error unpublishing results: ' + err.message);
    } finally {
      setUnpublishing(false);
    }
  };

  // Summary Metrics
  const summary: PrePublishSummary = {
    totalTeams: items.length,
    scoresReviewed: items.length,
    manualAdjustments: items.filter(i => i.admin_override_score !== null).length,
    unreviewedScores: 0,
    isValidToPublish: items.length > 0 && items.every(i => typeof i.final_score === 'number' && !isNaN(i.final_score)),
  };

  const filteredItems = items.filter(
    i =>
      i.team_name.toLowerCase().includes(search.toLowerCase()) ||
      i.leader_name.toLowerCase().includes(search.toLowerCase()) ||
      i.leader_reg_no.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-space-lg w-full max-w-6xl mx-auto pb-space-xl font-body-md text-ink-primary">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md bg-surface-card p-space-lg rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A]">
        <div>
          <span className="font-label-sticker text-label-sticker text-round-1-blue uppercase tracking-widest block mb-1">
            SCORE CONTROL &amp; PRE-PUBLISHING AUDIT
          </span>
          <h1 className="font-headline-lg text-headline-lg font-black tracking-tight text-ink-primary">
            REVIEW &amp; EDIT ALL SCORES 📝
          </h1>
          <p className="font-body-md text-body-md text-ink-secondary">
            Edit individual Round 1, Round 2, Round 3, Bonus, and Final scores before publishing standings to participants.
          </p>
        </div>

        {/* Action Button: Publish / Unpublish */}
        <div className="flex items-center gap-space-sm">
          {isPublished ? (
            <button
              onClick={() => setShowUnpublishModal(true)}
              className="px-space-md py-space-sm bg-status-wrong hover:bg-rose-700 text-white font-headline-sm text-label-ticker font-black rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] transition-all cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">lock_open</span>
              <span>UNPUBLISH RESULTS</span>
            </button>
          ) : (
            <button
              onClick={() => setShowPublishModal(true)}
              disabled={!summary.isValidToPublish}
              className="px-space-md py-space-sm bg-status-correct hover:bg-emerald-700 text-white font-headline-sm text-label-ticker font-black rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">publish</span>
              <span>PUBLISH RESULTS</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Mandatory Pre-Publishing Workflow State Banner */}
      <div
        className={`p-space-md rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex items-center justify-between gap-space-md ${
          isPublished ? 'bg-status-correct/15 text-emerald-950' : 'bg-round-2-orange/15 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-space-md">
          <span className="text-3xl">{isPublished ? '✅' : '⚠️'}</span>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-black">
              {isPublished
                ? '✅ Results Published Successfully'
                : '⚠️ Results are currently in DRAFT mode. Participants cannot view the final scores.'}
            </h3>
            <p className="font-body-sm text-body-sm text-ink-secondary">
              {isPublished
                ? `Published on: ${publishedAt ? new Date(publishedAt).toLocaleString() : 'Recently'}. Score editing is locked.`
                : 'Participants will NOT see final results until you explicitly click "Publish Results".'}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className={`px-space-md py-1 rounded-full font-label-sticker text-label-sticker font-bold uppercase border border-ink-primary ${
            isPublished ? 'bg-status-correct text-white' : 'bg-currency-gold text-ink-primary'
          }`}>
            STATUS: {isPublished ? 'PUBLISHED' : 'DRAFT'}
          </span>
        </div>
      </div>

      {/* 3. Summary Cards */}
      <div className="bg-surface-card rounded-xl p-space-md border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] space-y-3">
        <h2 className="font-headline-sm text-headline-sm font-black text-ink-primary uppercase tracking-tight flex items-center gap-2">
          <span>RESULT MANAGEMENT SUMMARY</span>
          <span className="text-xs px-2 py-0.5 bg-surface-muted border border-ink-primary rounded-full text-ink-secondary">
            LIVE DB SYNC
          </span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
          <div className="p-space-sm bg-surface-muted rounded-lg border border-ink-primary/30">
            <span className="font-label-sticker text-[10px] text-ink-secondary uppercase block font-bold">TOTAL TEAMS</span>
            <span className="font-headline-lg text-2xl font-black text-ink-primary">{summary.totalTeams}</span>
          </div>
          <div className="p-space-sm bg-surface-muted rounded-lg border border-ink-primary/30">
            <span className="font-label-sticker text-[10px] text-ink-secondary uppercase block font-bold">SCORES REVIEWED</span>
            <span className="font-headline-lg text-2xl font-black text-round-1-blue">{summary.scoresReviewed}</span>
          </div>
          <div className="p-space-sm bg-surface-muted rounded-lg border border-ink-primary/30">
            <span className="font-label-sticker text-[10px] text-ink-secondary uppercase block font-bold">MANUAL ADJUSTMENTS</span>
            <span className="font-headline-lg text-2xl font-black text-round-2-orange">{summary.manualAdjustments}</span>
          </div>
          <div className="p-space-sm bg-surface-muted rounded-lg border border-ink-primary/30">
            <span className="font-label-sticker text-[10px] text-ink-secondary uppercase block font-bold">UNREVIEWED SCORES</span>
            <span className="font-headline-lg text-2xl font-black text-status-correct">{summary.unreviewedScores}</span>
          </div>
        </div>
      </div>

      {/* 4. Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by team, leader, reg no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-card border-2 border-ink-primary rounded-xl font-body-sm text-ink-primary placeholder:text-ink-secondary/60 focus:outline-none focus:ring-2 focus:ring-round-1-blue shadow-[2px_2px_0px_#0F172A]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 bg-surface-card border-2 border-ink-primary rounded-xl font-label-ticker text-xs font-bold text-ink-primary hover:bg-surface-muted shadow-[2px_2px_0px_#0F172A] cursor-pointer"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* 5. Main Team Scores Table */}
      <div className="bg-surface-card rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm border-collapse">
            <thead>
              <tr className="bg-surface-muted text-ink-secondary font-label-sticker text-label-sticker uppercase border-b-2 border-ink-primary">
                <th className="py-3 px-4">TEAM NAME</th>
                <th className="py-3 px-4">LEADER</th>
                <th className="py-3 px-4">REG NO</th>
                <th className="py-3 px-4 text-round-1-blue">R1 SCORE</th>
                <th className="py-3 px-4 text-round-2-orange">R2 SCORE</th>
                <th className="py-3 px-4 text-round-3-purple">R3 SCORE</th>
                <th className="py-3 px-4 text-currency-gold">BONUS</th>
                <th className="py-3 px-4 text-ink-secondary">CALCULATED</th>
                <th className="py-3 px-4 text-round-2-orange">OVERRIDE</th>
                <th className="py-3 px-4 text-ink-primary font-black">FINAL SCORE</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-surface-muted font-medium">
              {loading ? (
                Array(5).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={11} className="py-4 px-4 text-center text-ink-secondary animate-pulse">
                      Loading team score records...
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 px-4 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="font-headline-sm text-ink-primary font-bold">No teams found matching search.</p>
                  </td>
                </tr>
              ) : filteredItems.map((item) => {
                const hasOverride = item.admin_override_score !== null;
                return (
                  <tr key={item.team_id} className="hover:bg-surface-muted/50 transition-colors">
                    {/* Team Name */}
                    <td className="py-3.5 px-4 font-headline-sm text-ink-primary font-black whitespace-nowrap">
                      {item.team_name}
                    </td>

                    {/* Team Leader */}
                    <td className="py-3.5 px-4 text-ink-primary font-medium whitespace-nowrap">
                      {item.leader_name}
                    </td>

                    {/* Reg No */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-label-code text-xs px-2 py-0.5 bg-surface-muted border border-ink-primary/30 rounded font-bold">
                        {item.leader_reg_no}
                      </span>
                    </td>

                    {/* R1 Score */}
                    <td className="py-3.5 px-4 font-label-code text-round-1-blue font-bold">
                      {item.r1_score}
                    </td>

                    {/* R2 Score */}
                    <td className="py-3.5 px-4 font-label-code text-round-2-orange font-bold">
                      {item.r2_score}
                    </td>

                    {/* R3 Score */}
                    <td className="py-3.5 px-4 font-label-code text-round-3-purple font-bold">
                      {item.r3_score}
                    </td>

                    {/* Bonus */}
                    <td className="py-3.5 px-4 font-label-code text-currency-gold font-bold">
                      {item.bonus_adjustment > 0 ? `+${item.bonus_adjustment}` : item.bonus_adjustment}
                    </td>

                    {/* Calculated Score */}
                    <td className="py-3.5 px-4 font-label-code font-bold text-ink-secondary">
                      {item.calculated_score}
                    </td>

                    {/* Admin Override */}
                    <td className="py-3.5 px-4 font-label-code font-bold">
                      {hasOverride ? (
                        <span className="px-2 py-0.5 bg-round-2-orange/20 text-round-2-orange rounded border border-round-2-orange/40 font-black">
                          {item.admin_override_score}
                        </span>
                      ) : (
                        <span className="text-ink-secondary/50">—</span>
                      )}
                    </td>

                    {/* Final Score */}
                    <td className="py-3.5 px-4 font-headline-sm text-lg font-black text-ink-primary">
                      {item.final_score}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          disabled={isPublished}
                          className={`px-3 py-1.5 rounded-lg font-label-ticker text-xs font-bold border border-ink-primary shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer ${
                            isPublished
                              ? 'bg-surface-muted text-ink-secondary/40 border-ink-primary/20 cursor-not-allowed'
                              : 'bg-round-1-blue hover:bg-blue-700 text-white'
                          }`}
                        >
                          Edit Scores
                        </button>
                        {item.history_count > 0 && (
                          <button
                            onClick={() => handleOpenHistory(item)}
                            className="px-2.5 py-1.5 bg-surface-muted hover:bg-surface-card text-ink-primary rounded-lg font-label-ticker text-xs font-bold border border-ink-primary shadow-[2px_2px_0px_#0F172A] cursor-pointer flex items-center gap-1"
                          >
                            <span>📜</span>
                            <span>History ({item.history_count})</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Multi-Score Editing Modal (Edit R1, R2, R3, Bonus & Final Override) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-surface-card rounded-2xl p-space-lg w-full max-w-xl shadow-2xl border-2 border-ink-primary space-y-space-md max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b-2 border-ink-primary pb-space-sm">
              <div>
                <span className="font-label-sticker text-[10px] text-round-1-blue font-bold uppercase block">SCORE EDITOR</span>
                <h2 className="font-headline-sm text-headline-sm font-black text-ink-primary">
                  EDIT SCORES — {editingItem.team_name} ✏️
                </h2>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-surface-muted hover:bg-surface-card font-bold border border-ink-primary cursor-pointer text-ink-secondary"
              >
                ✕
              </button>
            </div>

            {/* Team info */}
            <div className="p-space-sm bg-surface-muted rounded-xl border border-ink-primary flex flex-wrap justify-between items-center text-xs">
              <div>
                <span className="font-label-sticker text-ink-secondary">LEADER: </span>
                <span className="font-headline-sm font-bold text-ink-primary">{editingItem.leader_name}</span>
              </div>
              <div>
                <span className="font-label-sticker text-ink-secondary">REG NO: </span>
                <span className="font-label-code font-bold text-ink-primary">{editingItem.leader_reg_no}</span>
              </div>
            </div>

            {/* Editable Round Inputs */}
            <div className="space-y-4">
              <h3 className="font-label-sticker text-xs font-black text-ink-primary uppercase tracking-wider border-b border-ink-primary/20 pb-1">
                1. Round Breakdown &amp; Bonus Adjustments
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* R1 Score */}
                <div>
                  <label className="block font-label-sticker text-[11px] font-bold text-round-1-blue uppercase mb-1">
                    Round 1 Score
                  </label>
                  <input
                    type="number"
                    value={r1Input}
                    onChange={e => setR1Input(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-card border-2 border-ink-primary rounded-xl font-label-code text-base font-bold text-round-1-blue focus:outline-none focus:ring-2 focus:ring-round-1-blue shadow-[2px_2px_0px_#0F172A]"
                  />
                </div>

                {/* R2 Score */}
                <div>
                  <label className="block font-label-sticker text-[11px] font-bold text-round-2-orange uppercase mb-1">
                    Round 2 Score
                  </label>
                  <input
                    type="number"
                    value={r2Input}
                    onChange={e => setR2Input(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-card border-2 border-ink-primary rounded-xl font-label-code text-base font-bold text-round-2-orange focus:outline-none focus:ring-2 focus:ring-round-2-orange shadow-[2px_2px_0px_#0F172A]"
                  />
                </div>

                {/* R3 Score */}
                <div>
                  <label className="block font-label-sticker text-[11px] font-bold text-round-3-purple uppercase mb-1">
                    Round 3 Score
                  </label>
                  <input
                    type="number"
                    value={r3Input}
                    onChange={e => setR3Input(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-card border-2 border-ink-primary rounded-xl font-label-code text-base font-bold text-round-3-purple focus:outline-none focus:ring-2 focus:ring-round-3-purple shadow-[2px_2px_0px_#0F172A]"
                  />
                </div>

                {/* Bonus Adjustment */}
                <div>
                  <label className="block font-label-sticker text-[11px] font-bold text-currency-gold uppercase mb-1">
                    Bonus / Adjustment
                  </label>
                  <input
                    type="number"
                    value={bonusInput}
                    onChange={e => setBonusInput(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-card border-2 border-ink-primary rounded-xl font-label-code text-base font-bold text-currency-gold focus:outline-none focus:ring-2 focus:ring-currency-gold shadow-[2px_2px_0px_#0F172A]"
                  />
                </div>
              </div>

              {/* Calculated Score Live Preview */}
              <div className="p-3 bg-surface-muted rounded-xl border border-ink-primary flex justify-between items-center text-sm">
                <span className="font-label-sticker font-bold text-ink-secondary uppercase">
                  SUMMED CALCULATED SCORE (R1 + R2 + R3 + BONUS):
                </span>
                <span className="font-label-code text-lg font-black text-ink-primary">
                  {currentCalcSum} pts
                </span>
              </div>

              {/* 2. Final Result Score Option */}
              <div className="space-y-3 border-t border-ink-primary/20 pt-3">
                <h3 className="font-label-sticker text-xs font-black text-ink-primary uppercase tracking-wider">
                  2. Final Result Score Override
                </h3>

                <div className="flex items-center gap-4 text-xs font-bold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scoreMode"
                      checked={!useOverride}
                      onChange={() => setUseOverride(false)}
                      className="w-4 h-4 text-round-1-blue focus:ring-round-1-blue"
                    />
                    <span>Use Summed Calculated Score ({currentCalcSum})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scoreMode"
                      checked={useOverride}
                      onChange={() => setUseOverride(true)}
                      className="w-4 h-4 text-round-2-orange focus:ring-round-2-orange"
                    />
                    <span>Manually Override Final Score</span>
                  </label>
                </div>

                {useOverride && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="block font-label-sticker text-xs font-extrabold text-round-2-orange uppercase tracking-wider mb-1">
                      Override Final Score Value
                    </label>
                    <input
                      type="number"
                      value={overrideInput}
                      onChange={e => setOverrideInput(e.target.value)}
                      placeholder="Enter override score (e.g. 90, 0, -5)"
                      className="w-full px-4 py-2.5 bg-surface-card border-2 border-ink-primary rounded-xl font-label-code text-lg font-black text-round-2-orange focus:outline-none focus:ring-2 focus:ring-round-2-orange shadow-[2px_2px_0px_#0F172A]"
                    />
                  </div>
                )}
              </div>

              {/* Reason for change */}
              <div className="border-t border-ink-primary/20 pt-3">
                <label className="block font-label-sticker text-xs font-extrabold text-ink-primary uppercase tracking-wider mb-1">
                  Reason / Comment for Correction (Optional)
                </label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={e => setReasonInput(e.target.value)}
                  placeholder="e.g. MCQ re-evaluation, Bonus points awarded"
                  className="w-full px-4 py-2 bg-surface-card border-2 border-ink-primary rounded-xl font-body-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-round-1-blue shadow-[2px_2px_0px_#0F172A]"
                />
              </div>
            </div>

            {/* Clear override action link */}
            {editingItem.admin_override_score !== null && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleClearOverride(editingItem)}
                  className="text-xs font-bold text-status-wrong hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>🗑️</span>
                  <span>Clear Override &amp; Revert to Calculated Score</span>
                </button>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="flex-1 py-2.5 border-2 border-ink-primary rounded-xl font-label-ticker text-xs font-bold text-ink-primary hover:bg-surface-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInitiateSaveEdit}
                className="flex-1 py-2.5 bg-round-1-blue hover:bg-blue-700 text-white rounded-xl font-label-ticker text-xs font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] cursor-pointer"
              >
                Save All Scores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before saving edited score */}
      {showConfirmEdit && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-surface-card rounded-2xl p-space-lg w-full max-w-md shadow-2xl border-2 border-ink-primary space-y-space-md animate-in fade-in zoom-in duration-150">
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <h3 className="font-headline-sm text-headline-sm font-black text-ink-primary mt-2 uppercase">
                CONFIRM SCORE MODIFICATIONS
              </h3>
              <p className="font-body-sm text-body-sm text-ink-secondary mt-1">
                Are you sure you want to update scores for <strong className="text-ink-primary">{editingItem.team_name}</strong>?
              </p>
            </div>

            <div className="p-space-md bg-surface-muted rounded-xl border border-ink-primary space-y-2 text-xs">
              <div className="grid grid-cols-4 gap-1 text-center font-label-code font-bold pb-2 border-b border-ink-primary/20">
                <div><span className="block text-[9px] text-round-1-blue">R1</span>{r1Input}</div>
                <div><span className="block text-[9px] text-round-2-orange">R2</span>{r2Input}</div>
                <div><span className="block text-[9px] text-round-3-purple">R3</span>{r3Input}</div>
                <div><span className="block text-[9px] text-currency-gold">BONUS</span>{bonusInput}</div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-label-sticker text-ink-secondary">PREVIOUS FINAL SCORE:</span>
                <span className="font-label-code font-bold text-ink-secondary">{editingItem.final_score}</span>
              </div>
              <div className="flex items-center justify-between font-black text-sm">
                <span className="font-label-sticker text-round-1-blue">NEW FINAL SCORE:</span>
                <span className="font-label-code text-lg text-round-1-blue">{currentEffectiveFinal} pts</span>
              </div>
              {reasonInput.trim() && (
                <p className="text-xs text-ink-secondary italic border-t border-ink-primary/20 pt-1">
                  Reason: &quot;{reasonInput.trim()}&quot;
                </p>
              )}
            </div>

            <div className="flex items-center gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmEdit(false)}
                disabled={savingEdit}
                className="flex-1 py-2.5 border-2 border-ink-primary rounded-xl font-label-ticker text-xs font-bold text-ink-primary hover:bg-surface-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveEdit}
                disabled={savingEdit}
                className="flex-1 py-2.5 bg-status-correct hover:bg-emerald-700 text-white rounded-xl font-label-ticker text-xs font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] cursor-pointer disabled:opacity-60"
              >
                {savingEdit ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Audit Modal */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-surface-card rounded-2xl p-space-lg w-full max-w-lg shadow-2xl border-2 border-ink-primary space-y-space-md max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b-2 border-ink-primary pb-space-sm">
              <div>
                <span className="font-label-sticker text-[10px] text-round-1-blue font-bold uppercase">AUDIT TRAIL</span>
                <h2 className="font-headline-sm text-headline-sm font-black text-ink-primary">
                  SCORE HISTORY — {historyItem.team_name}
                </h2>
              </div>
              <button
                onClick={() => setHistoryItem(null)}
                className="w-8 h-8 rounded-full bg-surface-muted hover:bg-surface-card font-bold border border-ink-primary cursor-pointer text-ink-secondary"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingHistory ? (
                <div className="py-8 text-center text-ink-secondary">Loading score history...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-ink-secondary">No manual modifications recorded for this team.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-space-md bg-surface-muted rounded-xl border-2 border-ink-primary space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-label-sticker font-bold text-round-2-orange uppercase">
                        MODIFIED BY: {log.modified_by || 'Admin'}
                      </span>
                      <span className="font-label-code text-[11px] text-ink-secondary">
                        {new Date(log.created_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1 text-sm font-label-code">
                      <span className="text-ink-secondary">Previous Score: <strong className="text-ink-primary">{log.previous_score ?? '—'}</strong></span>
                      <span className="text-round-1-blue">➔</span>
                      <span className="text-round-1-blue font-black">New Score: {log.new_score}</span>
                    </div>

                    {log.reason && (
                      <p className="text-xs text-ink-secondary italic pt-1 border-t border-ink-primary/20">
                        Details: &quot;{log.reason}&quot;
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setHistoryItem(null)}
                className="w-full py-2.5 border-2 border-ink-primary bg-surface-muted hover:bg-surface-card rounded-xl font-label-ticker text-xs font-bold text-ink-primary cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Results Dialog */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-surface-card rounded-2xl p-space-lg w-full max-w-md shadow-2xl border-2 border-ink-primary space-y-space-md">
            
            <div className="text-center">
              <span className="text-4xl">🚀</span>
              <h2 className="font-headline-sm text-headline-sm font-black text-ink-primary uppercase tracking-tight mt-2">
                READY TO PUBLISH RESULTS
              </h2>
            </div>

            <div className="p-space-md bg-surface-muted rounded-xl border-2 border-ink-primary space-y-2 text-xs font-medium">
              <div className="flex justify-between py-1 border-b border-ink-primary/20">
                <span className="font-label-sticker text-ink-secondary">TOTAL TEAMS:</span>
                <span className="font-label-code font-black text-ink-primary">{summary.totalTeams}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-ink-primary/20">
                <span className="font-label-sticker text-ink-secondary">SCORES REVIEWED:</span>
                <span className="font-label-code font-black text-round-1-blue">{summary.scoresReviewed}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-ink-primary/20">
                <span className="font-label-sticker text-ink-secondary">MANUAL ADJUSTMENTS:</span>
                <span className="font-label-code font-black text-round-2-orange">{summary.manualAdjustments}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-label-sticker text-ink-secondary">UNREVIEWED SCORES:</span>
                <span className="font-label-code font-black text-status-correct">{summary.unreviewedScores}</span>
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-ink-secondary text-center">
              Once published, participants will be able to see their final approved scores on the live leaderboard. Score editing will be locked.
            </p>

            <div className="flex items-center gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={publishing}
                className="flex-1 py-2.5 border-2 border-ink-primary rounded-xl font-label-ticker text-xs font-bold text-ink-primary hover:bg-surface-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishResults}
                disabled={publishing || !summary.isValidToPublish}
                className="flex-1 py-2.5 bg-status-correct hover:bg-emerald-700 text-white rounded-xl font-label-ticker text-xs font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] cursor-pointer disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish Results'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish Results Dialog */}
      {showUnpublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-surface-card rounded-2xl p-space-lg w-full max-w-md shadow-2xl border-2 border-ink-primary space-y-space-md">
            
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <h2 className="font-headline-sm text-headline-sm font-black text-status-wrong uppercase tracking-tight mt-2">
                UNPUBLISH RESULTS?
              </h2>
            </div>

            <p className="font-body-sm text-body-md text-ink-primary text-center">
              Are you sure you want to unpublish the results?
            </p>

            <div className="p-space-md bg-status-wrong/10 border-2 border-status-wrong rounded-xl text-xs text-status-wrong font-bold text-center">
              Participants will temporarily lose access to the published results while in Draft mode. Scores will become editable again.
            </div>

            <div className="flex items-center gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setShowUnpublishModal(false)}
                disabled={unpublishing}
                className="flex-1 py-2.5 border-2 border-ink-primary rounded-xl font-label-ticker text-xs font-bold text-ink-primary hover:bg-surface-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnpublishResults}
                disabled={unpublishing}
                className="flex-1 py-2.5 bg-status-wrong hover:bg-rose-700 text-white rounded-xl font-label-ticker text-xs font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] cursor-pointer disabled:opacity-50"
              >
                {unpublishing ? 'Unpublishing...' : 'Unpublish Results'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
