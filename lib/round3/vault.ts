// lib/round3/vault.ts
import { createClient } from '@/lib/supabase/client';

export async function validateVaultPasswordServer(
  teamId: string,
  password: string
): Promise<{ is_correct: boolean; vault_attempts?: number; error?: string; already_unlocked?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('validate_vault_password', {
    p_team_id: teamId,
    p_password: password,
  });

  if (error) {
    console.error('Error calling validate_vault_password RPC:', error);
    return { is_correct: false, error: error.message };
  }

  return data ?? { is_correct: false };
}
