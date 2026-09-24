import { createClient } from '@/lib/supabase/client'

interface LogViolationParams {
  teamId: string
  violationType: string
  roundName: string
}

const supabase = createClient()

// Debounce map to prevent flooding same violation type
const lastViolationTime: Record<string, number> = {}
const DEBOUNCE_MS = 3000

export async function logViolation({
  teamId,
  violationType,
  roundName,
}: LogViolationParams) {
  const key = `${teamId}-${violationType}`
  const now = Date.now()

  // Debounce: skip if same violation logged within 3 seconds
  if (lastViolationTime[key] && now - lastViolationTime[key] < DEBOUNCE_MS) {
    return
  }
  lastViolationTime[key] = now

  try {
    await supabase.from('anti_cheat_violations').insert({
      team_id: teamId,
      violation_type: violationType,
      round_name: roundName,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    // Never let logging failure disrupt the exam
    console.error('Violation log failed silently:', err)
  }
}

export async function getTeamViolationCount(teamId: string): Promise<number> {
  const { count } = await supabase
    .from('anti_cheat_violations')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)

  return count ?? 0
}

export async function getViolationCount(teamId: string): Promise<number> {
  return getTeamViolationCount(teamId)
}
