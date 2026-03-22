/**
 * claudeInsights.ts
 *
 * Sends structured race data to the Anthropic/Claude API and returns
 * fan-friendly narrative analysis. This acts as an automated post-race
 * analyst. The composable expects a pre-computed `RaceStats` object so
 * that the model receives concise summary numbers rather than raw arrays
 * (this keeps prompts small and cost-efficient).
 *
 * The API key is read from `VITE_ANTHROPIC_API_KEY` in the environment.
 * Never hardcode the key. Do not commit your .env files.
 */

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

/**
 * Builds the structured prompt we send to Claude.
 * We pass numbers, not raw arrays — Claude doesn't need 2000 lap entries,
 * it needs the computed summary statistics we've already derived.
 * Keeping the prompt tight reduces cost and improves output quality.
 */
function buildRacePrompt(raceStats: RaceStats): string {
  return `
You are a Formula 1 analyst writing for everyday fans who love the sport
but don't read telemetry data. Your tone is clear, enthusiastic, and direct.
Avoid jargon. Use concrete numbers. Tell the story of what actually happened.

Here is the computed data from this race:

RACE: ${raceStats.raceName} ${raceStats.season}
WINNER: ${raceStats.winner} (${raceStats.winnerTeam})
LAPS: ${raceStats.totalLaps}
FASTEST LAP: ${raceStats.fastestLapDriver} — ${raceStats.fastestLapTime}

RACE PACE RANKING (avg clean lap time, seconds):
${raceStats.pacingRanking.map((d, i) => `${i + 1}. ${d.driver} — ${d.avgPace}s`).join('\n')}

PIT STOP PERFORMANCE (total time lost in pits):
${raceStats.pitRanking.map(d => `${d.driver}: ${d.totalPitTime}s across ${d.stops} stops`).join('\n')}

BIGGEST POSITION MOVERS:
Gainers: ${raceStats.biggestGainers.map(d => `${d.driver} +${d.delta}`).join(', ')}
Losers: ${raceStats.biggestLosers.map(d => `${d.driver} ${d.delta}`).join(', ')}

SAFETY CAR: ${raceStats.safetyCarLaps.length > 0 ? `Deployed laps ${raceStats.safetyCarLaps.join(', ')}` : 'No safety car'}

TOP SPEED: ${raceStats.topSpeed.driver} — ${raceStats.topSpeed.speed} km/h

TYRE STRATEGIES USED:
${raceStats.strategies.map(s => `${s.driver}: ${s.strategy}`).join('\n')}

Write exactly 5 insight paragraphs. Each paragraph should:
1. Have a bold one-line headline (e.g. **The Race Pace Story**)
2. Be 2–3 sentences max
3. Explain one specific story from the data above
4. Sound like a knowledgeable friend explaining it at a pub, not a press release

Output only the 5 paragraphs. No intro, no outro, no bullet points.
  `.trim()
}

/**
 * RaceStats type — the shape of data we pass to Claude.
 * We compute all of this from our existing store data before calling the API,
 * so Claude only receives clean, summarised numbers.
 */
export interface RaceStats {
  raceName: string
  season: number
  winner: string
  winnerTeam: string
  totalLaps: number
  fastestLapDriver: string
  fastestLapTime: string
  pacingRanking: { driver: string; avgPace: number }[]
  pitRanking: { driver: string; totalPitTime: number; stops: number }[]
  biggestGainers: { driver: string; delta: number }[]
  biggestLosers: { driver: string; delta: number }[]
  safetyCarLaps: number[]
  topSpeed: { driver: string; speed: number }
  strategies: { driver: string; strategy: string }[]
}

/**
 * Main export — call this after race data is fully loaded.
 * Returns an array of { headline, body } objects ready to render.
 * Results are cached in sessionStorage so we don't re-call on tab switch.
 */
export async function generateRaceStory(raceStats: RaceStats): Promise<{ headline: string; body: string }[]> {
  const cacheKey = `pitwall_story_${raceStats.season}_${raceStats.raceName}`
  const cachedStr = sessionStorage.getItem(cacheKey)
  if (cachedStr) return JSON.parse(cachedStr)

  if (!ANTHROPIC_API_KEY) {
    throw new Error('Missing Anthropic API key. Set VITE_ANTHROPIC_API_KEY in .env.local')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      // Required header for browser-based API calls in some environments
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: buildRacePrompt(raceStats) }],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Anthropic API error: ${response.status} ${text}`)
  }

  const data = await response.json()
  // Anthropic responses can be nested — attempt to find the returned text
  const text = data?.content?.[0]?.text ?? data?.completion ?? ''

  // Parse Claude's output into structured { headline, body } pairs.
  // Claude returns paragraphs starting with **Headline** on the first line.
  const paragraphs = text
    .split('\n\n')
    .filter(Boolean)
    .map((block: string) => {
      const lines = block.split('\n')
      const headlineMatch = lines[0].match(/\*\*(.+?)\*\*/)
      return {
        headline: headlineMatch ? headlineMatch[1] : 'Insight',
        body: lines.slice(1).join(' ').trim() || lines[0].replace(/\*\*/g, '').trim(),
      }
    })

  sessionStorage.setItem(cacheKey, JSON.stringify(paragraphs))
  return paragraphs
}
