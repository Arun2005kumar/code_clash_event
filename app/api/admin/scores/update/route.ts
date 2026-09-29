import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      teamId,
      r1Score,
      r2Score,
      r3Score,
      bonusAdjustment,
      overrideScore, // Can be number, null, or undefined
      reason,
      action,
      modifiedBy,
    } = body;

    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid or missing team ID.' }, { status: 400 });
    }

    const supabase = createClient();

    // 1. Check if competition results are published (Locked state)
    let isPublished = false;
    try {
      const { data: settings } = await supabase
        .from('competition_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      isPublished = settings?.results_published ?? settings?.round3_results_published ?? false;
    } catch (e) {
      console.warn('Error fetching competition_settings:', e);
    }

    if (isPublished) {
      return NextResponse.json(
        {
          success: false,
          message: 'Results are currently PUBLISHED and scores are locked. Please unpublish results first before editing scores.',
        },
        { status: 400 }
      );
    }

    // 2. Validate numeric score inputs
    const parsedR1 = Number(r1Score ?? 0);
    const parsedR2 = Number(r2Score ?? 0);
    const parsedR3 = Number(r3Score ?? 0);
    const parsedBonus = Number(bonusAdjustment ?? 0);

    if (isNaN(parsedR1) || !Number.isInteger(parsedR1)) {
      return NextResponse.json({ success: false, message: 'Round 1 score must be a valid integer number.' }, { status: 400 });
    }
    if (isNaN(parsedR2) || !Number.isInteger(parsedR2)) {
      return NextResponse.json({ success: false, message: 'Round 2 score must be a valid integer number.' }, { status: 400 });
    }
    if (isNaN(parsedR3) || !Number.isInteger(parsedR3)) {
      return NextResponse.json({ success: false, message: 'Round 3 score must be a valid integer number.' }, { status: 400 });
    }
    if (isNaN(parsedBonus) || !Number.isInteger(parsedBonus)) {
      return NextResponse.json({ success: false, message: 'Bonus adjustment must be a valid integer number.' }, { status: 400 });
    }

    let parsedOverride: number | null = null;
    if (overrideScore !== undefined && overrideScore !== null && overrideScore !== '') {
      const val = Number(overrideScore);
      if (isNaN(val) || !Number.isInteger(val)) {
        return NextResponse.json({ success: false, message: 'Final override score must be a valid integer number.' }, { status: 400 });
      }
      parsedOverride = val;
    }

    const calculatedScore = parsedR1 + parsedR2 + parsedR3 + parsedBonus;
    const finalScore = parsedOverride !== null ? parsedOverride : calculatedScore;

    const cleanReason = (reason && typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Manual score edit';
    const cleanAdmin = (modifiedBy && typeof modifiedBy === 'string' && modifiedBy.trim()) ? modifiedBy.trim() : 'Admin';

    // 3. ALWAYS update existing core round tables FIRST (Round 1, Round 2, Round 3)
    // Round 1
    const { data: existingR1 } = await supabase.from('round1_attempts').select('id').eq('team_id', teamId).maybeSingle();
    if (existingR1) {
      await supabase.from('round1_attempts').update({ score: parsedR1, status: 'submitted' }).eq('team_id', teamId);
    } else {
      await supabase.from('round1_attempts').insert({ team_id: teamId, score: parsedR1, status: 'submitted' });
    }

    // Round 2
    const { data: existingR2 } = await supabase.from('round2_team_state').select('id').eq('team_id', teamId).maybeSingle();
    if (existingR2) {
      await supabase.from('round2_team_state').update({ score: parsedR2 }).eq('team_id', teamId);
    } else {
      await supabase.from('round2_team_state').insert({ team_id: teamId, score: parsedR2, coins: 100, status: 'active' });
    }

    // Round 3
    const { data: existingR3 } = await supabase.from('round3_team_state').select('id').eq('team_id', teamId).maybeSingle();
    if (existingR3) {
      await supabase.from('round3_team_state').update({ score: parsedR3 }).eq('team_id', teamId);
    } else {
      await supabase.from('round3_team_state').insert({ team_id: teamId, score: parsedR3, status: 'in_progress', vault_unlocked: parsedR3 > 0 });
    }

    // 4. Try updating team_scores table (if migration 022 has been executed)
    let teamScoresUpdated = false;
    try {
      const { data: existingScore } = await supabase
        .from('team_scores')
        .select('final_score')
        .eq('team_id', teamId)
        .maybeSingle();

      const previousScore = existingScore?.final_score ?? 0;

      const { error: upsertErr } = await supabase
        .from('team_scores')
        .upsert(
          {
            team_id: teamId,
            r1_score: parsedR1,
            r2_score: parsedR2,
            r3_score: parsedR3,
            bonus_adjustment: parsedBonus,
            calculated_score: calculatedScore,
            admin_override_score: action === 'clear' ? null : parsedOverride,
            score_override_reason: cleanReason,
            score_modified_by: cleanAdmin,
            score_modified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'team_id' }
        );

      if (!upsertErr) {
        teamScoresUpdated = true;

        // Add to audit trail
        const auditDetail = `R1: ${parsedR1}, R2: ${parsedR2}, R3: ${parsedR3}, Bonus: ${parsedBonus}${parsedOverride !== null ? `, Override Final: ${parsedOverride}` : ''} | ${cleanReason}`;
        await supabase.from('score_audit_logs').insert({
          team_id: teamId,
          previous_score: previousScore,
          new_score: finalScore,
          modified_by: cleanAdmin,
          reason: auditDetail,
          created_at: new Date().toISOString(),
        });
      } else {
        console.warn('team_scores table notice (migration 022 not run yet):', upsertErr.message);
      }
    } catch (e: any) {
      console.warn('team_scores table bypass:', e.message);
    }

    return NextResponse.json({
      success: true,
      message: `Scores updated successfully! R1: ${parsedR1}, R2: ${parsedR2}, R3: ${parsedR3}, Bonus: ${parsedBonus} => Final Score: ${finalScore}`,
      teamScoresUpdated,
      data: {
        team_id: teamId,
        r1_score: parsedR1,
        r2_score: parsedR2,
        r3_score: parsedR3,
        bonus_adjustment: parsedBonus,
        calculated_score: calculatedScore,
        admin_override_score: parsedOverride,
        final_score: finalScore,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/admin/scores/update:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal server error.' }, { status: 500 });
  }
}
