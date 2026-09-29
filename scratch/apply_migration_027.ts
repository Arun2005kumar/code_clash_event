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

async function applyMigration027() {
  console.log('Ensuring event_ended column exists in competition_settings...');

  // Try updating event_ended on competition_settings to false
  const { data, error } = await supabase
    .from('competition_settings')
    .update({ event_ended: false })
    .gte('id', '00000000-0000-0000-0000-000000000000')
    .select('*');

  if (error) {
    console.warn('Update error (column might not exist yet):', error.message);
  } else {
    console.log('✅ Column event_ended exists and updated:', data);
  }
}

applyMigration027();
