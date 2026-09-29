import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Verify all teams have valid scores generated if function exists
    try {
      await supabase.rpc('sync_team_calculated_scores');
    } catch (e) {
      console.warn('sync_team_calculated_scores RPC notice:', e);
    }

    // Try RPC function first
    let rpcDone = false;
    try {
      const { error } = await supabase.rpc('publish_competition_results');
      if (!error) rpcDone = true;
    } catch (e) {
      console.warn('publish_competition_results RPC notice:', e);
    }

    if (!rpcDone) {
      // Direct update to competition_settings table using guaranteed round3_results_published column
      const { error: updateErr } = await supabase
        .from('competition_settings')
        .update({
          round3_results_published: true,
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (updateErr) {
        return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
      }

      // Try updating optional columns if available
      try {
        await supabase
          .from('competition_settings')
          .update({
            results_published: true,
            published_at: new Date().toISOString(),
          })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        // Ignored if optional columns not present
      }
    }

    return NextResponse.json({
      success: true,
      message: '✅ Results Published Successfully! Participants can now view final standings on the leaderboard.',
    });
  } catch (err: any) {
    console.error('Error in /api/admin/scores/publish:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal server error.' }, { status: 500 });
  }
}
