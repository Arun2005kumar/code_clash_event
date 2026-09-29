import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamId, overrideScore, reason, action, modifiedBy } = body;

    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid or missing team ID.' }, { status: 400 });
    }

    const supabase = createClient();

    // Check if competition results are published
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

    if (action === 'clear') {
      const { data, error } = await supabase.rpc('clear_team_score_override', {
        p_team_id: teamId,
        p_modified_by: modifiedBy || 'Admin',
      });

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data, message: 'Override cleared. Score reverted to calculated score.' });
    }

    // Validate score input
    if (overrideScore === undefined || overrideScore === null || overrideScore === '') {
      return NextResponse.json({ success: false, message: 'Please provide a valid numeric score.' }, { status: 400 });
    }

    const parsedScore = Number(overrideScore);
    if (isNaN(parsedScore) || !Number.isInteger(parsedScore)) {
      return NextResponse.json(
        { success: false, message: 'Invalid score value. Final score must be a valid integer.' },
        { status: 400 }
      );
    }

    const cleanReason = (reason && typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Manual admin correction';
    const cleanAdmin = (modifiedBy && typeof modifiedBy === 'string' && modifiedBy.trim()) ? modifiedBy.trim() : 'Admin';

    const { data, error } = await supabase.rpc('update_team_score_override', {
      p_team_id: teamId,
      p_override_score: parsedScore,
      p_reason: cleanReason,
      p_modified_by: cleanAdmin,
    });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Score updated successfully for team. New Final Score: ${parsedScore}`,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/scores/update:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal server error.' }, { status: 500 });
  }
}
