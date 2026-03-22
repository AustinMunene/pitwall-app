import { supabase } from '@/lib/supabaseClient'
import type { Lap, Stint, PitStop, RaceDriver, Position, Session } from '@/api/openf1'

export async function getSessionLaps(sessionKey: number): Promise<Lap[]> {
  const { data, error } = await supabase
    .from('openf1_laps')
    .select('*')
    .eq('session_key', sessionKey)
    .order('lap_number', { ascending: true })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] getSessionLaps error', error)
    return []
  }

  return (data ?? []) as unknown as Lap[]
}

export async function getDriverLaps(sessionKey: number, driverNumber: number): Promise<Lap[]> {
  const { data, error } = await supabase
    .from('openf1_laps')
    .select('*')
    .eq('session_key', sessionKey)
    .eq('driver_number', driverNumber)
    .order('lap_number', { ascending: true })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] getDriverLaps error', error)
    return []
  }

  return (data ?? []) as unknown as Lap[]
}

export async function getSessionStints(sessionKey: number): Promise<Stint[]> {
  const { data, error } = await supabase
    .from('openf1_stints')
    .select('*')
    .eq('session_key', sessionKey)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] getSessionStints error', error)
    return []
  }

  return (data ?? []) as unknown as Stint[]
}

export async function getSessionPits(sessionKey: number): Promise<PitStop[]> {
  const { data, error } = await supabase
    .from('openf1_pits')
    .select('*')
    .eq('session_key', sessionKey)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] getSessionPits error', error)
    return []
  }

  return (data ?? []) as unknown as PitStop[]
}

export async function getSessionDrivers(sessionKey: number): Promise<RaceDriver[]> {
  const { data, error } = await supabase
    .from('openf1_drivers')
    .select('*')
    .eq('session_key', sessionKey)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] getSessionDrivers error', error)
    return []
  }

  return (data ?? []) as unknown as RaceDriver[]
}

export async function getSessionPositions(sessionKey: number): Promise<Position[]> {
  const { data, error } = await supabase
    .from('openf1_positions')
    .select('*')
    .eq('session_key', sessionKey)
    .order('date', { ascending: true })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] getSessionPositions error', error)
    return []
  }

  return (data ?? []) as unknown as Position[]
}

export async function getUpcomingWeekendSessions(): Promise<Session[]> {
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('openf1_sessions')
    .select('*')
    .gte('date_start', nowIso)
    .order('date_start', { ascending: true })
    .limit(32)

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] getUpcomingWeekendSessions error', error)
    return []
  }

  const sessions = (data ?? []) as unknown as Session[]
  if (sessions.length === 0) return []

  // Group by meeting (prefer meeting_key when available)
  const byMeeting = new Map<string, Session[]>()
  for (const s of sessions) {
    const key = s.meeting_key != null
      ? String(s.meeting_key)
      : `${s.year}-${s.circuit_short_name ?? ''}-${s.location ?? ''}`
    const arr = byMeeting.get(key)
    if (arr) arr.push(s)
    else byMeeting.set(key, [s])
  }

  const firstGroup = Array.from(byMeeting.values())[0] ?? []
  return firstGroup.sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  )
}

