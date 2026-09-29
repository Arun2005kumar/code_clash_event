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

async function fullResetAllData() {
  console.log('🔄 Executing FULL RESET of all user data and competition rounds...');

  // 1. Try RPC reset_all_rounds first
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('reset_all_rounds');
    if (!rpcErr) {
      console.log('✅ RPC reset_all_rounds completed successfully:', rpcRes);
    } else {
      console.warn('RPC reset_all_rounds failed, executing direct table wipe fallback:', rpcErr.message);
    }
  } catch (err) {
    console.warn('RPC error:', err);
  }

  // 2. Direct table cleanup fallback for absolute certainty
  try {
    console.log('Wiping round attempts and answers...');
    await supabase.from('round1_answers').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('round1_attempts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    
    await supabase.from('round2_results').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('round2_bids').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    
    await supabase.from('round3_bonus_attempts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('round3_vault_attempts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('round3_mission_attempts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('round3_team_state').delete().gte('id', '00000000-0000-0000-0000-000000000000');

    await supabase.from('anti_cheat_violations').delete().gte('id', '00000000-0000-0000-0000-000000000000');

    try {
      await supabase.from('score_audit_logs').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {}

    try {
      await supabase.from('team_scores').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {}

    // Reset teams state
    await supabase.from('teams').update({
      login_status: false,
      is_locked: false,
      updated_at: new Date().toISOString()
    }).gte('id', '00000000-0000-0000-0000-000000000000');

    // Reset competition settings to Round 1 active
    await supabase.from('competition_settings').update({
      current_round: 1,
      round1_active: true,
      round2_active: false,
      round3_active: false,
      current_round2_question: 1,
      show_round1_explanations: false,
      round3_results_published: false,
      results_published: false,
      updated_at: new Date().toISOString()
    }).gte('id', '00000000-0000-0000-0000-000000000000');

    console.log('🎉 ALL USER DATA & COMPETITION ROUNDS HAVE BEEN COMPLETELY RESET!');
  } catch (err: any) {
    console.error('Error during data wipe:', err.message);
  }
}

fullResetAllData();
