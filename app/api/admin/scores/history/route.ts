import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ success: false, message: 'Missing teamId query parameter.' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: logs, error } = await supabase
      .from('score_audit_logs')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
    });
  } catch (err: any) {
    console.error('Error in /api/admin/scores/history:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal server error.' }, { status: 500 });
  }
}
