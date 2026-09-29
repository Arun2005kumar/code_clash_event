import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    let teamId: string | null = null;
    let action: string = 'ping';

    // Parse body or query parameters (supports sendBeacon blob / text)
    try {
      const bodyText = await req.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        teamId = body.teamId;
        action = body.action || 'ping';
      }
    } catch {
      // Fallback to URL search params
      const searchParams = req.nextUrl.searchParams;
      teamId = searchParams.get('teamId');
      action = searchParams.get('action') || 'ping';
    }

    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing team ID.' }, { status: 400 });
    }

    const supabase = createClient();
    const isDisconnect = action === 'disconnect';

    // Update login_status and last_seen_at
    const updatePayload: any = {
      login_status: !isDisconnect,
      updated_at: new Date().toISOString(),
    };

    // Try setting last_seen_at
    try {
      updatePayload.last_seen_at = isDisconnect
        ? new Date(Date.now() - 60000).toISOString() // 1 min ago so offline immediately
        : new Date().toISOString();
    } catch (e) {
      console.warn('last_seen_at column notice:', e);
    }

    const { error } = await supabase
      .from('teams')
      .update(updatePayload)
      .eq('id', teamId);

    if (error) {
      // Fallback without last_seen_at if column missing
      delete updatePayload.last_seen_at;
      await supabase.from('teams').update(updatePayload).eq('id', teamId);
    }

    return NextResponse.json({
      success: true,
      online: !isDisconnect,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/teams/heartbeat:', err);
    return NextResponse.json({ success: false, message: err.message || 'Error processing heartbeat.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
