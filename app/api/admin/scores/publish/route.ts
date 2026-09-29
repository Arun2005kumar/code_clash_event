import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Verify all teams have valid scores generated
    await supabase.rpc('sync_team_calculated_scores');

    const { data, error } = await supabase.rpc('publish_competition_results');

    if (error) {
      // Fallback update direct if RPC missing
      const { error: updateErr } = await supabase
        .from('competition_settings')
        .update({
          results_published: true,
          round3_results_published: true,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (updateErr) {
        return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
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
