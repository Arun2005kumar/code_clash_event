import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually
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
  console.error('Missing Supabase env credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function logoutPromptPirates() {
  console.log('Logging out PROMPT PIRATES...');

  const { data: team, error: fetchErr } = await supabase
    .from('teams')
    .select('id, team_name, login_status')
    .ilike('team_name', 'PROMPT PIRATES')
    .maybeSingle();

  if (fetchErr) {
    console.error('Error fetching team:', fetchErr.message);
    return;
  }

  if (!team) {
    console.log('No existing DB row found for PROMPT PIRATES. Attempting general update...');
    const { error: updateErr } = await supabase
      .from('teams')
      .update({ login_status: false })
      .ilike('team_name', '%PROMPT%PIRATES%');

    if (updateErr) console.error('Update error:', updateErr.message);
    else console.log('Successfully reset login status for PROMPT PIRATES matching name.');
    return;
  }

  const { error: updateErr } = await supabase
    .from('teams')
    .update({
      login_status: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', team.id);

  if (updateErr) {
    console.error('Error updating team:', updateErr.message);
  } else {
    console.log(`✅ SUCCESS! Logged out team PROMPT PIRATES (ID: ${team.id})!`);
  }
}

logoutPromptPirates();
