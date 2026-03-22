/**
 * usePostRacePipeline.ts
 *
 * Orchestrates the full post-race data load in the correct sequence.
 * Some calls can run in parallel, others depend on prior results.
 *
 * Load order (implemented here):
 * 1. In parallel: drivers, results, stints, pits, intervals, weather, raceControl
 * 2. After results: load laps for top 10 drivers (most relevant for charts)
 * 3. After raceControl: parse SC/VSC periods into usable lap ranges
 * 4. After all laps loaded: compute raceStats object for Claude (NOT IMPLEMENTED — need confirmation)
 * 5. Trigger generateRaceStory() in background (non-blocking)
 *
 * NOTE: The computation of `raceStats` requires minor domain choices (how to aggregate
 * pacingRanking, pitRanking, etc.). Per your instructions I will ask before making
 * assumptions — `computeRaceStats` is intentionally left as a TODO and will not be
 * executed until you confirm the desired aggregation rules.
 */

import { ref, onMounted, type Ref } from 'vue'
import { useRaceStore } from '@/stores/raceStore'
import type { RaceStats } from '@/api/claudeInsights'

export function usePostRacePipeline(sessionKey: Ref<number>, season: number, round: number) {
  const store = useRaceStore()
  const loading = ref(true)
  const error = ref('')
  const progress = ref(0) // used to show a progress bar during load
  const raceStats = ref<RaceStats | null>(null)
  const scLaps = ref<number[]>([])
  const vscLaps = ref<number[]>([])

  onMounted(async () => {
    try {
      // Step 1 — parallel load of all non-lap data
      progress.value = 10
      await Promise.all([
        store.loadDrivers(sessionKey.value),
        store.loadStints(sessionKey.value),
        store.loadPitStops(sessionKey.value),
        store.loadIntervals(sessionKey.value),
        store.loadWeather(sessionKey.value),
        store.loadRaceControl(sessionKey.value),
      ])
      progress.value = 40

      // Step 2 — parse SC/VSC periods from race control messages
      // before loading laps so charts are ready to mark them immediately
      scLaps.value = parseSafetyCarLaps(store.raceControl)
      vscLaps.value = parseVscLaps(store.raceControl)
      progress.value = 50

      // Step 3 — load laps for top 10 finishers only
      const top10 = store.drivers.slice(0, 10)
      await Promise.all(
        top10.map(d => store.loadLapsForDriver(sessionKey.value, d.driver_number))
      )
      progress.value = 80

      // Step 4 — compute the raceStats summary for Claude
      // IMPORTANT: computeRaceStats is intentionally not implemented here.
      // This requires clarification on aggregation rules. We will wait for
      // your confirmation before constructing the RaceStats object.
      // raceStats.value = computeRaceStats(store, season, round)
      progress.value = 100

      // Step 5 — fire off Claude story generation in background (non-blocking)
      // We'll leave it to the RaceStory component to call generateRaceStory when
      // and if it receives a non-null raceStats object.
    } catch (e) {
      error.value = 'Failed to load race data. Please try again.'
      // eslint-disable-next-line no-console
      console.error('usePostRacePipeline error:', e)
    } finally {
      loading.value = false
    }
  })

  return { loading, error, progress, raceStats, scLaps, vscLaps }
}

/**
 * Parses race control messages to extract lap numbers where the
 * safety car was deployed. Finds "SafetyCar" category messages
 * with flag "DEPLOYED" (start) and "CLEAR" (end), then fills in
 * the lap range between them.
 */
function parseSafetyCarLaps(raceControl: any[]): number[] {
  const ranges: Array<{ start: number; end: number }> = []
  let currentStart: number | null = null
  for (const m of raceControl || []) {
    if (m.category === 'SafetyCar' && (m.flag === 'DEPLOYED' || (m.message && /DEPLOYED/i.test(m.message)))) {
      currentStart = m.lap_number ?? currentStart
    }
    if (currentStart != null && m.category === 'SafetyCar' && (m.flag === 'CLEAR' || /CLEAR/i.test(m.message))) {
      const end = m.lap_number ?? currentStart
      ranges.push({ start: currentStart, end })
      currentStart = null
    }
  }

  const laps: number[] = []
  for (const r of ranges) {
    for (let l = r.start; l <= r.end; l++) laps.push(l)
  }
  return Array.from(new Set(laps)).sort((a, b) => a - b)
}

/**
 * Same as above but for Virtual Safety Car periods.
 * VSC messages have category "SafetyCar" and message containing "VIRTUAL".
 */
function parseVscLaps(raceControl: any[]): number[] {
  const ranges: Array<{ start: number; end: number }> = []
  let currentStart: number | null = null
  for (const m of raceControl || []) {
    if (m.category === 'SafetyCar' && /VIRTUAL/i.test(m.message || '')) {
      if (/DEPLOYED/i.test(m.message || '') || m.flag === 'DEPLOYED') {
        currentStart = m.lap_number ?? currentStart
      }
      if (/CLEAR/i.test(m.message || '') || m.flag === 'CLEAR') {
        const end = m.lap_number ?? currentStart ?? 0
        if (currentStart != null) ranges.push({ start: currentStart, end })
        currentStart = null
      }
    }
  }

  const laps: number[] = []
  for (const r of ranges) {
    for (let l = r.start; l <= r.end; l++) laps.push(l)
  }
  return Array.from(new Set(laps)).sort((a, b) => a - b)
}

/**
 * Builds the RaceStats object from store data.
 * This is the structured summary we pass to Claude — not raw arrays.
 * All computation happens here so Claude only receives clean numbers.
 *
 * NOTE: This function is intentionally left as a TODO because it requires
 * domain choices (how to rank pacing, which drivers to include in rankings,
 * treatment of missing lap times, etc.). Please confirm desired rules
 * before I implement this.
 */
function computeRaceStats(store: any, season: number, round: number): RaceStats {
  throw new Error('computeRaceStats not implemented — please confirm aggregation rules')
}
