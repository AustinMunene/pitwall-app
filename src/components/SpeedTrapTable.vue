<template>
  <div class="speedtrap-card glass-card p-4">
    <div class="card-title-label">Speed Trap Winners</div>
    <table class="w-full mt-2 text-sm">
      <thead>
        <tr>
          <th class="text-left">Driver</th>
          <th class="text-right">Top Speed (km/h)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.driver">
          <td>{{ row.driver }}</td>
          <td class="text-right">{{ row.topSpeed.toFixed(1) }}</td>
        </tr>
        <tr v-if="rows.length === 0">
          <td colspan="2" class="text-center text-gray-400">No speed trap data loaded</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * SpeedTrapTable
 *
 * Displays the top recorded speed per driver, based on car telemetry.
 * Filters samples to straight-line conditions (DRS open and throttle >= 95)
 * to avoid counting braking zones.
 */
const props = defineProps<{
  carData: Record<number, any[]>
  drivers?: Array<{ driver_number: number; name?: string; code?: string }>
}>()

const rows = computed(() => {
  const out: Array<{ driver: string; topSpeed: number }> = []
  for (const [numStr, samples] of Object.entries(props.carData || {})) {
    let top = -Infinity
    for (const s of samples || []) {
      if (s.speed == null || s.throttle == null || s.drs == null) continue
      if (s.drs >= 8 && s.throttle >= 95 && !s.brake) {
        const sp = Number(s.speed)
        if (!isNaN(sp) && sp > top) top = sp
      }
    }
    if (top !== -Infinity) {
      const driverLabel = (props.drivers || []).find(d => d.driver_number === parseInt(numStr))?.code ?? `#${numStr}`
      out.push({ driver: driverLabel, topSpeed: top })
    }
  }
  // sort descending
  out.sort((a, b) => b.topSpeed - a.topSpeed)
  return out
})
</script>

<style scoped>
.speedtrap-card { padding: 0.75rem }
table th { color: #aaa; font-size: 0.75rem; padding-bottom: 0.5rem }
table td { padding: 0.35rem 0 }
</style>
