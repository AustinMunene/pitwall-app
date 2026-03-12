import { supabase } from '@/lib/supabaseClient'

export interface RaceSummary {
  id: number
  race_id: number
  title: string | null
  summary_markdown: string | null
  auto_insights: Record<string, unknown> | null
  notes: string | null
}

export interface RaceWithSummary {
  id: number
  season_year: number
  round_number: number
  grand_prix_name: string
  country: string | null
  circuit_name: string | null
  date_utc: string | null
  ergast_season: string | null
  ergast_round: string | null
  openf1_meeting_key: number | null
  race_summaries: RaceSummary | null
}

export async function getRaceSummary(season: number, round: number): Promise<RaceWithSummary | null> {
  const { data, error } = await supabase
    .from('races')
    .select(`
      id,
      season_year,
      round_number,
      grand_prix_name,
      country,
      circuit_name,
      date_utc,
      ergast_season,
      ergast_round,
      openf1_meeting_key,
      race_summaries (
        id,
        race_id,
        title,
        summary_markdown,
        auto_insights,
        notes
      )
    `)
    .eq('season_year', season)
    .eq('round_number', round)
    .maybeSingle<RaceWithSummary>()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] getRaceSummary error', error)
    return null
  }

  return data
}

