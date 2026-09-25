'use client';

// app/admin/teams/page.tsx — Redesigned Admin Teams Table

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface TeamRow {
  id: string;
  team_name: string;
  leader_name: string;
  leader_reg_no: string;
  login_status: boolean;
  created_at: string;
  r1_status?: string;
  r1_score?: number;
  r2_score?: number;
  r2_coins?: number;
  total_violations: number;
  is_flagged: boolean;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ team_name: '', leader_name: '', leader_reg_no: '' });
  const [adding, setAdding] = useState(false);

  const loadTeams = async () => {
    const supabase = createClient();
    const { data: violations } = await supabase.rpc('get_violation_counts');
    const violationMap = new Map((violations ?? []).map((v: any) => [v.team_id, v]));

    const { data: teams } = await supabase
      .from('teams')
      .select(`*, round1_attempts(score, status), round2_team_state(score, coins)`)
      .order('created_at');

    const rows: TeamRow[] = (teams ?? []).map((t: any) => {
      const v = violationMap.get(t.id) as any;
      const submittedR1 = t.round1_attempts?.find((a: any) => a.status === 'submitted' || a.status === 'auto_submitted') || t.round1_attempts?.[0];
      return {
        id: t.id,
        team_name: t.team_name,
        leader_name: t.leader_name,
        leader_reg_no: t.leader_reg_no,
        login_status: t.login_status,
        created_at: t.created_at,
        r1_status: submittedR1?.status,
        r1_score: submittedR1?.score ?? 0,
        r2_score: t.round2_team_state?.[0]?.score ?? 0,
        r2_coins: t.round2_team_state?.[0]?.coins ?? 100,
        total_violations: v?.total_violations ?? 0,
        is_flagged: v?.is_flagged ?? false,
      };
    });

    setTeams(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();

    const supabase = createClient();
    const channel = supabase
      .channel('admin-teams-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadTeams())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round1_attempts' }, () => loadTeams())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round2_team_state' }, () => loadTeams())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addTeam = async () => {
    if (!newTeam.team_name || !newTeam.leader_name || !newTeam.leader_reg_no) {
      toast.error('All fields required.');
      return;
    }
    setAdding(true);
    const supabase = createClient();
    const { error } = await supabase.from('teams').insert(newTeam);
    if (error) { toast.error(error.message); }
    else { toast.success('Team added!'); setNewTeam({ team_name: '', leader_name: '', leader_reg_no: '' }); setShowAddModal(false); loadTeams(); }
    setAdding(false);
  };

  const resetTeamLogin = async (teamId: string) => {
    const supabase = createClient();
    await supabase.from('teams').update({ login_status: false }).eq('id', teamId);
    toast.success('Login status reset.');
    loadTeams();
  };

  const filtered = teams.filter(t =>
    t.team_name.toLowerCase().includes(search.toLowerCase()) ||
    t.leader_name.toLowerCase().includes(search.toLowerCase()) ||
    t.leader_reg_no.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Teams
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">{teams.length} registered teams participating</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center gap-2 hover:-translate-y-0.5"
        >
          <span>+</span>
          <span>Add Team</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          🔍
        </div>
        <input
          type="text"
          placeholder="Search teams, leaders, or reg numbers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border-1.5 border-slate-200 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-600/10 transition-colors shadow-xs"
        />
      </div>

      {/* Table Container Card */}
      <div className="bg-white border-1.5 border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/80 border-b-2 border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">TEAM</th>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">LEADER</th>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">REG NO</th>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">LOGIN STATUS</th>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">R1 STATUS</th>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">R1 SCORE</th>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">R2 SCORE</th>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">COINS</th>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">VIOLATIONS</th>
                <th className="px-6 py-3.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(10).fill(0).map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="skeleton h-4 w-full rounded-md" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="text-4xl mb-3">😴</div>
                    <h3 className="text-base font-extrabold text-slate-900 mb-1">No teams yet. Did everyone oversleep?</h3>
                    <p className="text-xs text-slate-500">Add teams using the button above or wait for registrations.</p>
                  </td>
                </tr>
              ) : filtered.map((team) => (
                <tr
                  key={team.id}
                  className="hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                >
                  <td className="px-6 py-4 font-extrabold text-slate-900 whitespace-nowrap">
                    {team.is_flagged && <span className="mr-1.5">⚠️</span>}
                    {team.team_name}
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium whitespace-nowrap">{team.leader_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                      {team.leader_reg_no}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      team.login_status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${team.login_status ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{team.login_status ? 'Online' : 'Offline'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      team.r1_status === 'submitted' || team.r1_status === 'auto_submitted'
                        ? 'bg-emerald-50 text-emerald-700'
                        : team.r1_status === 'in_progress'
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-slate-400 italic'
                    }`}>
                      {team.r1_status === 'submitted' || team.r1_status === 'auto_submitted'
                        ? 'Completed'
                        : team.r1_status === 'in_progress'
                        ? 'In Progress'
                        : 'Not started'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">{team.r1_score ?? '—'}</td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">{team.r2_score ?? '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-slate-900 font-extrabold">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-900 font-black text-[10px] flex items-center justify-center shadow-xs">
                        🪙
                      </span>
                      <span>{team.r2_coins ?? '—'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-extrabold ${team.total_violations >= 3 ? 'text-rose-600' : team.total_violations > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {team.total_violations >= 3 && '⚠️ '}
                      {team.total_violations}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => resetTeamLogin(team.id)}
                      className="px-3 py-1.5 rounded-lg border-1.5 border-slate-200 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                    >
                      Reset Login
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Team Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl space-y-5 border-2 border-slate-200">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Add New Team</h2>
              <p className="text-xs text-slate-500 mt-1">Enter details to register a team manually.</p>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Team Name', key: 'team_name', placeholder: 'ByteBlasters' },
                { label: 'Leader Name', key: 'leader_name', placeholder: 'Arjun Sharma' },
                { label: 'Reg Number', key: 'leader_reg_no', placeholder: 'CS2021001' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input
                    value={(newTeam as any)[f.key]}
                    onChange={e => setNewTeam(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="input-light"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border-1.5 border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={addTeam}
                disabled={adding}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs disabled:opacity-60 cursor-pointer shadow-xs"
              >
                {adding ? 'Adding...' : 'Add Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
