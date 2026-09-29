import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    let rpcDone = false;
    try {
      const { error } = await supabase.rpc('unpublish_competition_results');
      if (!error) rpcDone = true;
    } catch (e) {
      console.warn('unpublish_competition_results RPC notice:', e);
    }

    if (!rpcDone) {
      const { error: updateErr } = await supabase
        .from('competition_settings')
        .update({
          round3_results_published: false,
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (updateErr) {
        return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
      }

      try {
        await supabase
          .from('competition_settings')
          .update({
            results_published: false,
            published_at: null,
          })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        // Ignored if optional columns not present
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Results unpublished. Competition is back in DRAFT mode and score editing is unlocked.',
    });
  } catch (err: any) {
    console.error('Error in /api/admin/scores/unpublish:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal server error.' }, { status: 500 });
  }
}
