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
    const { data: settings } = await supabase
      .from('competition_settings')
      .select('results_published, round3_results_published')
      .limit(1)
      .maybeSingle();

    const isPublished = settings?.results_published ?? settings?.round3_results_published ?? false;
    if (isPublished) {
      return NextResponse.json(
        {
          success: false,
          message: 'Results are currently PUBLISHED and scores are locked. Please unpublish results first before editing scores.',
        },
        { status: 400 }
      );
    }

    // 2. Action: Clear override
    if (action === 'clear') {
      const { data: existing } = await supabase
        .from('team_scores')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      const prevFinal = existing?.final_score ?? 0;
      const calcScore = existing?.calculated_score ?? 0;

      const { error: clearErr } = await supabase
        .from('team_scores')
        .update({
          admin_override_score: null,
          score_override_reason: 'Reverted to calculated score',
          score_modified_by: modifiedBy || 'Admin',
          score_modified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', teamId);

      if (clearErr) {
        return NextResponse.json({ success: false, message: clearErr.message }, { status: 500 });
      }

      await supabase.from('score_audit_logs').insert({
        team_id: teamId,
        previous_score: prevFinal,
        new_score: calcScore,
        modified_by: modifiedBy || 'Admin',
        reason: 'Reverted to calculated score',
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Override cleared. Score reverted to calculated score (${calcScore}).`,
      });
    }

    // 3. Validate numeric score inputs
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

    // 4. Fetch existing team_scores row to get previous final score for audit trail
    const { data: existingScore } = await supabase
      .from('team_scores')
      .select('final_score')
      .eq('team_id', teamId)
      .maybeSingle();

    const previousScore = existingScore?.final_score ?? 0;

    // 5. Direct DB update/upsert to team_scores table (No RPC schema cache issue!)
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
          admin_override_score: parsedOverride,
          score_override_reason: cleanReason,
          score_modified_by: cleanAdmin,
          score_modified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'team_id' }
      );

    if (upsertErr) {
      console.error('Error upserting team_scores:', upsertErr);
      return NextResponse.json({ success: false, message: upsertErr.message }, { status: 500 });
    }

    // 6. Update individual round state tables to keep all tables synchronized
    try {
      await supabase
        .from('round1_attempts')
        .update({ score: parsedR1 })
        .eq('team_id', teamId);
    } catch (e) {
      console.warn('Sync warning for round1_attempts:', e);
    }

    try {
      await supabase
        .from('round2_team_state')
        .update({ score: parsedR2 })
        .eq('team_id', teamId);
    } catch (e) {
      console.warn('Sync warning for round2_team_state:', e);
    }

    try {
      await supabase
        .from('round3_team_state')
        .update({ score: parsedR3 })
        .eq('team_id', teamId);
    } catch (e) {
      console.warn('Sync warning for round3_team_state:', e);
    }

    // 7. Insert entry into score audit trail
    const auditDetail = `R1: ${parsedR1}, R2: ${parsedR2}, R3: ${parsedR3}, Bonus: ${parsedBonus}${parsedOverride !== null ? `, Override Final: ${parsedOverride}` : ''} | ${cleanReason}`;
    await supabase.from('score_audit_logs').insert({
      team_id: teamId,
      previous_score: previousScore,
      new_score: finalScore,
      modified_by: cleanAdmin,
      reason: auditDetail,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Scores updated successfully! New Final Score: ${finalScore}`,
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
