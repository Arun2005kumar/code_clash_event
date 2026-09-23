'use client';

// app/admin/round2/page.tsx — Stitch Design Round 2 Question Management & Status Controls

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Round2QuestionAdmin, Round2QuestionStatus } from '@/types';

const STATUS_FLOW: Round2QuestionStatus[] = ['waiting', 'live', 'bidding_open', 'bidding_closed', 'resolved'];

export default function AdminRound2Page() {
  const [questions, setQuestions] = useState<Round2QuestionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Round2QuestionAdmin> & { isNew?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('round2_questions').select('*').order('question_number');
    setQuestions(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const advanceStatus = async (q: Round2QuestionAdmin) => {
    const currentIdx = STATUS_FLOW.indexOf(q.status);
    if (currentIdx === STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIdx + 1];

    const supabase = createClient();
    const { error } = await supabase.from('round2_questions').update({ status: nextStatus }).eq('id', q.id);

    if (error) toast.error(error.message);
    else {
      toast.success(`Q${q.question_number} status updated → ${nextStatus.toUpperCase()}`);
      // Update current question in settings if going live
      if (nextStatus === 'live' || nextStatus === 'bidding_open') {
        await supabase.from('competition_settings').update({ current_round2_question: q.question_number, round2_active: true }).neq('id', '00000000-0000-0000-0000-000000000000');
      }
      load();
    }
  };

  const saveQuestion = async () => {
    if (!editing) return;
    const required = ['question_number', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option'];
    if (required.some(k => !(editing as any)[k])) { toast.error('All fields required.'); return; }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      question_number: editing.question_number,
      question_text: editing.question_text,
      option_a: editing.option_a,
      option_b: editing.option_b,
      option_c: editing.option_c,
      option_d: editing.option_d,
      correct_option: editing.correct_option,
      status: editing.status ?? 'waiting',
    };

    let error;
    if (editing.isNew) ({ error } = await supabase.from('round2_questions').insert(payload));
    else ({ error } = await supabase.from('round2_questions').update(payload).eq('id', editing.id));

    if (error) toast.error(error.message);
    else { toast.success('Question Saved!'); setEditing(null); load(); }
    setSaving(false);
  };

  const deleteQ = async (id: string) => {
    if (!confirm('Delete this question lot?')) return;
    const supabase = createClient();
    await supabase.from('round2_questions').delete().eq('id', id);
    load();
  };

  const STATUS_COLORS: Record<string, string> = {
    waiting: 'bg-surface-muted text-ink-secondary',
    live: 'bg-round-1-blue/20 text-round-1-blue font-black',
    bidding_open: 'bg-status-correct/20 text-status-correct font-black animate-pulse',
    bidding_closed: 'bg-currency-gold/20 text-currency-gold font-black',
    resolved: 'bg-round-3-purple/20 text-round-3-purple font-black',
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-space-lg font-body-md text-ink-primary">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md bg-surface-card p-space-lg rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A]">
        <div>
          <span className="font-label-sticker text-label-sticker text-round-2-orange uppercase tracking-widest block mb-1">STAGE 02 AUCTION LOTS</span>
          <h1 className="font-headline-lg text-headline-lg font-black tracking-tight text-ink-primary">
            ROUND 2 AUCTION LOT MANAGER 🔨
          </h1>
          <p className="font-body-md text-body-md text-ink-secondary">
            {questions.length} / 6 Auction lots configured in database.
          </p>
        </div>
        <button
          onClick={() => setEditing({ isNew: true, status: 'waiting', question_number: questions.length + 1 })}
          className="px-space-md py-space-sm bg-round-2-orange text-on-primary font-headline-sm text-headline-sm rounded-xl border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] hover:bg-round-2-orange/90 transition-all cursor-pointer font-black"
        >
          + Add Auction Lot
        </button>
      </div>

      {/* Questions List */}
      <div className="flex flex-col gap-space-sm">
        {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-24 rounded-xl bg-surface-muted animate-pulse border-2 border-ink-primary" />) :
          questions.map((q) => (
            <div
              key={q.id}
              className="bg-surface-card p-space-md rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex flex-col md:flex-row md:items-center justify-between gap-space-md hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-space-xs mb-1 flex-wrap">
                  <span className="font-label-code text-label-code font-bold text-round-2-orange bg-round-2-orange/15 px-2 py-0.5 rounded border border-ink-primary">
                    LOT #{String(q.question_number).padStart(2, '0')}
                  </span>
                  <span className={`font-label-sticker text-label-sticker px-2.5 py-0.5 rounded border border-ink-primary font-bold ${STATUS_COLORS[q.status]}`}>
                    {q.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="font-label-code text-label-code bg-currency-gold/20 text-ink-primary px-2 py-0.5 rounded border border-ink-primary font-black">
                    CORRECT: {q.correct_option}
                  </span>
                </div>
                <p className="font-headline-sm text-body-md text-ink-primary font-bold">{q.question_text}</p>
              </div>

              <div className="flex items-center gap-space-xs shrink-0 self-end md:self-auto">
                {q.status !== 'resolved' && (
                  <button
                    onClick={() => advanceStatus(q)}
                    className="px-space-md py-1.5 text-label-ticker font-black bg-ink-primary text-canvas-cream rounded-lg shadow-[2px_2px_0px_#2563EB] hover:bg-ink-primary/90 transition-all cursor-pointer border border-ink-primary"
                  >
                    → Advance Status
                  </button>
                )}
                <button
                  onClick={() => setEditing(q)}
                  className="px-space-md py-1.5 text-label-ticker font-bold bg-surface-muted hover:bg-surface-card text-ink-primary border border-ink-primary rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteQ(q.id)}
                  className="px-space-md py-1.5 text-label-ticker font-bold bg-status-wrong/15 text-status-wrong hover:bg-status-wrong/25 border border-ink-primary rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Del
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-primary/60 backdrop-blur-sm p-margin-mobile">
          <div className="bg-surface-card rounded-xl p-space-lg w-full max-w-xl border-2 border-ink-primary shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-space-md">
            <h2 className="font-headline-lg text-headline-lg font-black text-ink-primary">
              {editing.isNew ? 'Add R2 Question Lot' : `Edit Lot #${editing.question_number}`}
            </h2>
            <div className="flex flex-col gap-space-sm">
              <div className="grid grid-cols-2 gap-space-sm">
                <div>
                  <label className="block font-label-sticker text-label-sticker text-ink-secondary uppercase mb-1">Lot Number</label>
                  <input
                    type="number"
                    value={editing.question_number ?? ''}
                    onChange={e => setEditing(p => ({ ...p!, question_number: +e.target.value }))}
                    className="w-full px-space-md py-space-sm bg-surface-muted text-ink-primary rounded-lg border-2 border-ink-primary font-body-md"
                    min={1}
                    max={6}
                  />
                </div>
                <div>
                  <label className="block font-label-sticker text-label-sticker text-ink-secondary uppercase mb-1">Correct Answer</label>
                  <select
                    value={editing.correct_option ?? ''}
                    onChange={e => setEditing(p => ({ ...p!, correct_option: e.target.value as any }))}
                    className="w-full px-space-md py-space-sm bg-surface-muted text-ink-primary rounded-lg border-2 border-ink-primary font-body-md font-bold"
                  >
                    <option value="">Select</option>
                    {['A','B','C','D'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-label-sticker text-label-sticker text-ink-secondary uppercase mb-1">Question Prompt</label>
                <textarea
                  value={editing.question_text ?? ''}
                  onChange={e => setEditing(p => ({ ...p!, question_text: e.target.value }))}
                  rows={3}
                  className="w-full px-space-md py-space-sm bg-surface-muted text-ink-primary rounded-lg border-2 border-ink-primary font-body-md"
                />
              </div>
              {['a','b','c','d'].map(opt => (
                <div key={opt}>
                  <label className="block font-label-sticker text-label-sticker text-ink-secondary uppercase mb-1">Option {opt.toUpperCase()}</label>
                  <input
                    value={(editing as any)[`option_${opt}`] ?? ''}
                    onChange={e => setEditing(p => ({ ...p!, [`option_${opt}`]: e.target.value }))}
                    className="w-full px-space-md py-space-sm bg-surface-muted text-ink-primary rounded-lg border-2 border-ink-primary font-body-md"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-space-sm mt-space-sm">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-space-sm bg-surface-muted text-ink-primary border-2 border-ink-primary rounded-lg font-label-ticker text-body-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveQuestion}
                disabled={saving}
                className="flex-1 py-space-sm bg-round-2-orange text-on-primary border-2 border-ink-primary rounded-lg font-label-ticker text-body-sm font-black shadow-md disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Lot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
