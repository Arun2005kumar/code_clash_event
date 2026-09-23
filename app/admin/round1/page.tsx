'use client';

// app/admin/round1/page.tsx — Stitch Design Round 1 Question Management & Control

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Round1QuestionAdmin } from '@/types';

type EditingQuestion = Partial<Round1QuestionAdmin> & { isNew?: boolean };

export default function AdminRound1Page() {
  const [questions, setQuestions] = useState<Round1QuestionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [round1Active, setRound1Active] = useState<boolean>(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [togglingSettings, setTogglingSettings] = useState(false);

  const load = async () => {
    const supabase = createClient();
    const [{ data: qData }, { data: settings }] = await Promise.all([
      supabase.from('round1_questions').select('*').order('question_number'),
      supabase.from('competition_settings').select('*').limit(1).maybeSingle()
    ]);
    setQuestions(qData ?? []);
    if (settings) {
      setRound1Active(settings.round1_active ?? false);
      setSettingsId(settings.id);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleRound1 = async () => {
    setTogglingSettings(true);
    const supabase = createClient();
    const nextState = !round1Active;

    if (settingsId) {
      const { error } = await supabase
        .from('competition_settings')
        .update({ round1_active: nextState })
        .eq('id', settingsId);
      if (error) toast.error('Failed to update status: ' + error.message);
      else {
        setRound1Active(nextState);
        toast.success(nextState ? 'Round 1 is now ACTIVE! Teams can participate.' : 'Round 1 is now INACTIVE.');
      }
    } else {
      const { data, error } = await supabase
        .from('competition_settings')
        .insert([{ round1_active: nextState }])
        .select('*')
        .single();
      if (error) toast.error('Failed to update status: ' + error.message);
      else if (data) {
        setRound1Active(data.round1_active);
        setSettingsId(data.id);
        toast.success(nextState ? 'Round 1 is now ACTIVE!' : 'Round 1 is now INACTIVE.');
      }
    }
    setTogglingSettings(false);
  };

  const saveQuestion = async () => {
    if (!editing) return;
    if (!editing.question_text || !editing.option_a || !editing.option_b || !editing.option_c || !editing.option_d || !editing.correct_option || !editing.question_number) {
      toast.error('All fields are required.');
      return;
    }
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
      explanation: editing.explanation ?? null,
      is_active: editing.is_active ?? true,
    };

    let error;
    if (editing.isNew) {
      ({ error } = await supabase.from('round1_questions').insert(payload));
    } else {
      ({ error } = await supabase.from('round1_questions').update(payload).eq('id', editing.id));
    }

    if (error) { toast.error(error.message); }
    else { toast.success(editing.isNew ? 'Question added!' : 'Question updated!'); setEditing(null); load(); }
    setSaving(false);
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('round1_questions').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted.'); load(); }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-space-lg font-body-md text-ink-primary">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md bg-surface-card p-space-lg rounded-xl border-2 border-ink-primary shadow-[4px_4px_0px_#0F172A]">
        <div>
          <span className="font-label-sticker text-label-sticker text-round-1-blue uppercase tracking-widest block mb-1">STAGE 01 QUESTION BANK</span>
          <h1 className="font-headline-lg text-headline-lg font-black tracking-tight text-ink-primary">
            ROUND 1 MCQ MANAGER 📝
          </h1>
          <p className="font-body-md text-body-md text-ink-secondary">
            {questions.length} / 30 Questions loaded in database.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            onClick={async () => {
              toast.loading('Syncing 30 paper questions...');
              const res = await fetch('/api/seed-r1');
              const json = await res.json();
              toast.dismiss();
              if (json.success) {
                toast.success('Successfully loaded all 30 paper questions!');
                load();
              } else {
                toast.error(json.error || 'Failed to sync questions.');
              }
            }}
            className="px-space-md py-space-sm bg-status-correct text-on-primary font-headline-sm text-headline-sm rounded-xl border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] hover:bg-status-correct/90 transition-all cursor-pointer font-bold"
          >
            📄 Sync 30 Paper Questions
          </button>
          <button
            onClick={() => setEditing({ isNew: true, is_active: true, question_number: (questions.length + 1) })}
            className="px-space-md py-space-sm bg-round-1-blue text-on-primary font-headline-sm text-headline-sm rounded-xl border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] hover:bg-round-1-blue/90 transition-all cursor-pointer font-bold"
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* Round 1 Status Control Banner */}
      <div className={`p-space-lg rounded-xl border-2 border-ink-primary flex items-center justify-between flex-wrap gap-space-md transition-colors shadow-[3px_3px_0px_#0F172A] ${
        round1Active ? 'bg-status-correct/15' : 'bg-currency-gold/20'
      }`}>
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-surface-card border-2 border-ink-primary flex items-center justify-center text-2xl shadow-sm">
            {round1Active ? '🚀' : '⏳'}
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-black text-ink-primary">
              Round 1 Status: <span className={round1Active ? 'text-status-correct' : 'text-round-2-orange'}>{round1Active ? 'ACTIVE (Live for Students)' : 'INACTIVE (Locked)'}</span>
            </h3>
            <p className="font-body-sm text-body-sm text-ink-secondary">
              {round1Active ? 'Students can log in and take the 30-question sprint right now.' : 'Students currently see the standby screen.'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleRound1}
          disabled={togglingSettings}
          className={`px-space-lg py-space-md rounded-xl font-headline-sm text-headline-sm font-black shadow-[2px_2px_0px_#0F172A] transition-all border-2 border-ink-primary cursor-pointer ${
            round1Active
              ? 'bg-status-wrong text-white hover:bg-status-wrong/90'
              : 'bg-status-correct text-white hover:bg-status-correct/90'
          }`}
        >
          {togglingSettings ? 'Updating...' : round1Active ? '🛑 PAUSE / STOP ROUND 1' : '▶️ START ROUND 1 NOW'}
        </button>
      </div>

      {/* Questions list */}
      <div className="flex flex-col gap-space-sm">
        {loading ? Array(5).fill(0).map((_, i) => <div key={i} className="h-20 rounded-xl bg-surface-muted animate-pulse border-2 border-ink-primary" />) :
          questions.map((q) => (
            <div
              key={q.id}
              className="bg-surface-card p-space-md rounded-xl border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex flex-col md:flex-row md:items-center justify-between gap-space-md hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-space-xs mb-1 flex-wrap">
                  <span className="font-label-code text-label-code font-bold text-round-1-blue bg-round-1-blue/15 px-2 py-0.5 rounded border border-ink-primary">
                    Q{q.question_number}
                  </span>
                  <span className={`font-label-sticker text-label-sticker px-2 py-0.5 rounded border border-ink-primary font-bold ${
                    q.is_active ? 'bg-status-correct/20 text-status-correct' : 'bg-surface-muted text-ink-secondary'
                  }`}>
                    {q.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="font-label-code text-label-code bg-currency-gold/20 text-ink-primary px-2 py-0.5 rounded border border-ink-primary font-extrabold">
                    ANSWER: {q.correct_option}
                  </span>
                </div>
                <p className="font-headline-sm text-body-md text-ink-primary font-bold truncate">{q.question_text}</p>
                <p className="font-body-sm text-body-sm text-ink-secondary mt-0.5 truncate">
                  A: {q.option_a} | B: {q.option_b} | C: {q.option_c} | D: {q.option_d}
                </p>
              </div>
              <div className="flex items-center gap-space-xs shrink-0 self-end md:self-auto">
                <button
                  onClick={() => setEditing(q)}
                  className="px-space-md py-1 text-label-ticker font-bold bg-surface-muted hover:bg-surface-card text-ink-primary border border-ink-primary rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="px-space-md py-1 text-label-ticker font-bold bg-status-wrong/15 text-status-wrong hover:bg-status-wrong/25 border border-ink-primary rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Edit/Add Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-primary/60 backdrop-blur-sm p-margin-mobile">
          <div className="bg-surface-card rounded-xl p-space-lg w-full max-w-2xl border-2 border-ink-primary shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-space-md">
            <h2 className="font-headline-lg text-headline-lg font-black text-ink-primary">
              {editing.isNew ? 'Add Question' : `Edit Q${editing.question_number}`}
            </h2>
            <div className="flex flex-col gap-space-sm">
              <div className="grid grid-cols-2 gap-space-sm">
                <div>
                  <label className="block font-label-sticker text-label-sticker text-ink-secondary uppercase mb-1">Question Number</label>
                  <input
                    type="number"
                    value={editing.question_number ?? ''}
                    onChange={e => setEditing(p => ({ ...p!, question_number: +e.target.value }))}
                    className="w-full px-space-md py-space-sm bg-surface-muted text-ink-primary rounded-lg border-2 border-ink-primary font-body-md"
                    min={1}
                    max={30}
                  />
                </div>
                <div>
                  <label className="block font-label-sticker text-label-sticker text-ink-secondary uppercase mb-1">Correct Option</label>
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
                <label className="block font-label-sticker text-label-sticker text-ink-secondary uppercase mb-1">Question Text</label>
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
              <div>
                <label className="block font-label-sticker text-label-sticker text-ink-secondary uppercase mb-1">Explanation (optional)</label>
                <textarea
                  value={editing.explanation ?? ''}
                  onChange={e => setEditing(p => ({ ...p!, explanation: e.target.value }))}
                  rows={2}
                  className="w-full px-space-md py-space-sm bg-surface-muted text-ink-primary rounded-lg border-2 border-ink-primary font-body-md"
                />
              </div>
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
                className="flex-1 py-space-sm bg-round-1-blue text-on-primary border-2 border-ink-primary rounded-lg font-label-ticker text-body-sm font-black shadow-md disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
