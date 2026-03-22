import { cached } from './cache'

const BASE = 'https://api.openf1.org/v1'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) {
    const error = new Error(`OpenF1 API error: ${res.status} ${url}`) as Error & {
      status?: number
      url?: string
    }
    error.status = res.status
    error.url = url
    throw error
  }

  return res.json()
}

export const getLaps = (sessionKey: number, driverNumber: number) =>
  cached(`laps-${sessionKey}-${driverNumber}`, () =>
    get(`${BASE}/laps?session_key=${sessionKey}&driver_number=${driverNumber}`)
  )

export const getStints = (sessionKey: number) =>
  cached(`stints-${sessionKey}`, () =>
    get(`${BASE}/stints?session_key=${sessionKey}`)
  )

export const getPitStops = (sessionKey: number) =>
  cached(`pits-${sessionKey}`, () =>
    get(`${BASE}/pit?session_key=${sessionKey}`)
  )

export const getDrivers = (sessionKey: number) =>
  cached(`drivers-${sessionKey}`, () =>
    get(`${BASE}/drivers?session_key=${sessionKey}`)
  )

export const getPositions = (sessionKey: number) =>
  cached(`positions-${sessionKey}`, () =>
    get(`${BASE}/position?session_key=${sessionKey}`)
  )

export const getSessions = (year: number) =>
  cached(`sessions-${year}`, () =>
    get(`${BASE}/sessions?year=${year}&session_type=Race`)
  )

export const getAllRaceDrivers = async (sessionKey: number): Promise<RaceDriver[]> => {
  return cached(`race-drivers-${sessionKey}`, () =>
    get<RaceDriver[]>(`${BASE}/drivers?session_key=${sessionKey}`)
  )
}

export interface Lap {
  session_key: number
  driver_number: number
  lap_number: number
  lap_duration: number | null
  duration_sector_1: number | null
  duration_sector_2: number | null
  duration_sector_3: number | null
  is_pit_out_lap: boolean
  date_start: string
}

export interface Stint {
  session_key: number
  driver_number: number
  stint_number: number
  lap_start: number
  lap_end: number
  compound: string
  tyre_age_at_start: number
}

export interface PitStop {
  session_key: number
  driver_number: number
  lap_number: number
  pit_duration: number
  date: string
}

export interface RaceDriver {
  session_key: number
  driver_number: number
  broadcast_name: string
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  first_name: string
  last_name: string
  headshot_url: string
  country_code: string
}

export interface Position {
  session_key: number
  driver_number: number
  date: string
  position: number
}

export interface Session {
  session_key: number
  session_name: string
  session_type: string
  date_start: string
  date_end: string
  gmt_offset: string
  location: string
  country_name: string
  circuit_short_name: string
  year: number
  meeting_key: number
}

/**
 * Fetches car telemetry data for a specific driver in a session.
 *
 * Returns time-series data sampled ~3.7 times per second. Each entry includes:
 * - `date`: ISO timestamp for the sample
 * - `driver_number`: integer driver number
 * - `rpm`: engine rpm at sample
 * - `speed`: speed in km/h
 * - `n_gear`: gearbox gear (number or null)
 * - `throttle`: 0-100 throttle percentage
 * - `brake`: boolean whether brake pedal is applied
 * - `drs`: numeric DRS state (0,8,10,12,14) where higher values indicate DRS open
 *
 * Useful for: speed trap comparisons, throttle/brake analysis, DRS usage.
 * Endpoint: GET /car_data?session_key=...&driver_number=...
 */
export const getCarData = (sessionKey: number, driverNumber: number) =>
  cached(`car_data_${sessionKey}_${driverNumber}`, () =>
    get(`${BASE}/car_data?session_key=${sessionKey}&driver_number=${driverNumber}`)
  )

/**
 * Fetches the gap data between cars throughout the race.
 *
 * Each entry includes:
 * - `date`: ISO timestamp for the sample
 * - `driver_number`: integer driver number
 * - `gap_to_leader`: string like "+5.234" or "1 LAP"
 * - `interval_to_position_ahead`: numeric seconds to the car directly ahead
 *
 * Useful for: gap evolution charts, undercut/overcut windows, battle detection.
 * Endpoint: GET /intervals?session_key=...
 */
export const getIntervals = (sessionKey: number) =>
  cached(`intervals_${sessionKey}`, () =>
    get(`${BASE}/intervals?session_key=${sessionKey}`)
  )

/**
 * Fetches weather data sampled throughout the session.
 *
 * Each entry includes: `date`, `air_temperature`, `track_temperature`,
 * `humidity`, `pressure`, `wind_speed`, `wind_direction`, `rainfall` (boolean).
 * Useful for correlating lap time changes with track temperature evolution
 * and explaining tyre behaviour shifts mid-race.
 * Endpoint: GET /weather?session_key=...
 */
export const getWeather = (sessionKey: number) =>
  cached(`weather_${sessionKey}`, () =>
    get(`${BASE}/weather?session_key=${sessionKey}`)
  )

/**
 * Fetches race control messages throughout the session.
 *
 * Each entry includes: `date`, `lap_number`, `category`, `message`, `flag`, `scope`, `sector`.
 * - `category` examples: Flag, SafetyCar, Drs, Other
 * - `flag` examples: GREEN, YELLOW, DOUBLE YELLOW, RED, CHEQUERED, CLEAR
 * Useful for marking SC/VSC periods on charts, DRS enabled laps,
 * and explaining sudden lap time spikes.
 * Endpoint: GET /race_control?session_key=...
 */
export const getRaceControl = (sessionKey: number) =>
  cached(`race_control_${sessionKey}`, () =>
    get(`${BASE}/race_control?session_key=${sessionKey}`)
  )

