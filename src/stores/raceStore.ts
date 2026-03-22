import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getLaps, getStints, getPitStops, getDrivers, getPositions, getSessions, getCarData, getIntervals, getWeather, getRaceControl } from '@/api/openf1'
import {
  getDriverLaps,
  getSessionDrivers,
  getSessionPits,
  getSessionPositions,
  getSessionStints,
} from '@/api/telemetry'
import { getRaceResults } from '@/api/ergast'
import type { Lap, Stint, PitStop, RaceDriver, Position, Session } from '@/api/openf1'
import type { ErgastRaceResult } from '@/api/ergast'

export const useRaceStore = defineStore('race', () => {
  const results = ref<ErgastRaceResult[]>([])
  const laps = ref<Record<number, Lap[]>>({})
  const stints = ref<Stint[]>([])
  const pits = ref<PitStop[]>([])
  const drivers = ref<RaceDriver[]>([])
  const positions = ref<Position[]>([])
  const sessions = ref<Session[]>([])
  const currentSession = ref<Session | null>(null)
  
  // Raw telemetry per driver — keyed by driver_number.
  // Populated on demand when a driver is selected for deep analysis.
  const carData = ref<Record<number, any[]>>({})

  // Gap to leader sampled throughout the race for all drivers.
  // Used to render the gap evolution chart on the Lap Times tab.
  const intervals = ref<any[]>([])

  // Weather samples taken throughout the session.
  // Used to overlay track temperature on the lap time chart.
  const weather = ref<any[]>([])

  // Race control messages — flags, safety car periods, DRS zones.
  // Used to mark special periods on all time-series charts.
  const raceControl = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadRace(season: number, round: number) {
    loading.value = true
    error.value = null
    try {
      // Load Ergast results
      const ergastData = await getRaceResults(season, round) as { MRData: { RaceTable: { Races: Array<{ Results: ErgastRaceResult[] }> } } }
      const races = ergastData?.MRData?.RaceTable?.Races
      if (races && races.length > 0) {
        results.value = races[0].Results || []
      }

      // Load OpenF1 sessions to get session key
      const sessionsData = await getSessions(season) as Session[]
      sessions.value = sessionsData || []

      // Find matching race session (by round order)
      if (sessionsData && sessionsData.length >= round) {
        currentSession.value = sessionsData[round - 1] || null
      } else if (sessionsData && sessionsData.length > 0) {
        currentSession.value = sessionsData[sessionsData.length - 1]
      }

      if (currentSession.value) {
        const sk = currentSession.value.session_key

        // Try Supabase-first telemetry; fall back to OpenF1 if nothing is stored yet
        const [
          stintsFromSupabase,
          pitsFromSupabase,
          driversFromSupabase,
          positionsFromSupabase,
        ] = await Promise.all([
          getSessionStints(sk),
          getSessionPits(sk),
          getSessionDrivers(sk),
          getSessionPositions(sk),
        ])

        const hasSupabaseTelemetry =
          stintsFromSupabase.length > 0 ||
          pitsFromSupabase.length > 0 ||
          driversFromSupabase.length > 0 ||
          positionsFromSupabase.length > 0

        if (hasSupabaseTelemetry) {
          stints.value = stintsFromSupabase
          pits.value = pitsFromSupabase
          drivers.value = driversFromSupabase
          positions.value = positionsFromSupabase
        } else {
          const [stintsData, pitsData, driversData] = await Promise.all([
            getStints(sk) as Promise<Stint[]>,
            getPitStops(sk) as Promise<PitStop[]>,
            getDrivers(sk) as Promise<RaceDriver[]>,
          ])
          stints.value = stintsData || []
          pits.value = pitsData || []
          drivers.value = driversData || []
        }
      }
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 429) {
        error.value = 'Telemetry temporarily unavailable (OpenF1 rate limit). Please try again later.'
        // eslint-disable-next-line no-console
        console.warn('OpenF1 rate limit hit while loading race telemetry', err)
      } else {
        error.value = e instanceof Error ? e.message : 'Failed to load race data'
        console.error('loadRace error:', e)
      }
    } finally {
      loading.value = false
    }
  }

  async function loadLapsForDriver(sessionKey: number, driverNumber: number) {
    if (laps.value[driverNumber]) return
    try {
      // Try Supabase-stored laps first
      const supabaseLaps = await getDriverLaps(sessionKey, driverNumber)
      if (supabaseLaps.length > 0) {
        laps.value = { ...laps.value, [driverNumber]: supabaseLaps }
        return
      }

      // Fallback to direct OpenF1 if Supabase has not been populated yet
      const data = await getLaps(sessionKey, driverNumber) as Lap[]
      laps.value = { ...laps.value, [driverNumber]: data || [] }
    } catch (e) {
      console.error(`loadLapsForDriver error for #${driverNumber}:`, e)
    }
  }

  /**
   * Loads car telemetry for a specific driver.
   * Called lazily — only when user clicks into a driver's detail view.
   * We key by driver_number so we don't re-fetch if already loaded.
   */
  async function loadCarData(sessionKey: number, driverNumber: number) {
    if (carData.value[driverNumber]) return // already cached in store
    try {
      carData.value[driverNumber] = await getCarData(sessionKey, driverNumber)
    } catch (e) {
      console.error(`loadCarData error for #${driverNumber}:`, e)
      carData.value[driverNumber] = []
    }
  }

  /**
   * Loads gap-to-leader data for all drivers.
   * Called as part of the main race load alongside laps and positions.
   * We sample this down to one entry per lap per driver for chart performance.
   */
  async function loadIntervals(sessionKey: number) {
    try {
      intervals.value = await getIntervals(sessionKey)
    } catch (e) {
      console.error('loadIntervals error:', e)
      intervals.value = []
    }
  }

  /**
   * Loads weather data for the session.
   * We only need one call per race — weather applies to all drivers equally.
   */
  async function loadWeather(sessionKey: number) {
    try {
      weather.value = await getWeather(sessionKey)
    } catch (e) {
      console.error('loadWeather error:', e)
      weather.value = []
    }
  }

  /**
   * Loads race control messages.
   * We parse these into structured periods (SC laps, VSC laps, DRS enabled laps)
   * so charts can shade those ranges without the component needing raw messages.
   */
  async function loadRaceControl(sessionKey: number) {
    try {
      raceControl.value = await getRaceControl(sessionKey)
    } catch (e) {
      console.error('loadRaceControl error:', e)
      raceControl.value = []
    }
  }

  async function loadPositions(sessionKey: number) {
    try {
      const supabasePositions = await getSessionPositions(sessionKey)
      if (supabasePositions.length > 0) {
        positions.value = supabasePositions
        return
      }

      const data = await getPositions(sessionKey) as Position[]
      positions.value = data || []
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 429) {
        // eslint-disable-next-line no-console
        console.warn('OpenF1 rate limit hit while loading positions', err)
        return
      }
      console.error('loadPositions error:', e)
    }
  }

  function reset() {
    results.value = []
    laps.value = {}
    stints.value = []
    pits.value = []
    drivers.value = []
    positions.value = []
    currentSession.value = null
    error.value = null
  }

  return {
    results,
    laps,
    stints,
    pits,
    drivers,
    positions,
    carData,
    intervals,
    weather,
    raceControl,
    sessions,
    currentSession,
    loading,
    error,
    loadRace,
    loadLapsForDriver,
    loadCarData,
    loadIntervals,
    loadWeather,
    loadRaceControl,
    loadPositions,
    reset
  }
})
