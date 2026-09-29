import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let envText = '';
try {
  envText = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
} catch (e) {
  try {
    envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
  } catch (err) {}
}

const env: Record<string, string> = {};
envText.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTeamEliteR3Time() {
  const targetSecs = 11 * 60 + 37; // 697 seconds (11:37)

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .ilike('team_name', '%ELITE%');

  if (!teams || teams.length === 0) {
    console.error('No team matching ELITE found');
    return;
  }

  for (const team of teams) {
    const { error } = await supabase
      .from('round3_team_state')
      .update({
        finish_time_seconds: targetSecs,
        status: 'completed',
        vault_unlocked: true,
        updated_at: new Date().toISOString()
      })
      .eq('team_id', team.id);

    if (error) console.error('Update error:', error.message);
    else console.log(`✅ Updated ${team.team_name} Round 3 finish_time_seconds to ${targetSecs} (11:37)!`);
  }
}

updateTeamEliteR3Time();
