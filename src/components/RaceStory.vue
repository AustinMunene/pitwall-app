<!--
  RaceStory.vue
  Renders the Claude-generated race narrative as a set of insight cards.

  It receives the raceStats object (already computed by the parent),
  calls generateRaceStory() once on mount, then displays the results.
  Shows a skeleton loader while the API call is in flight.
  Shows an error state if the call fails (network issue or missing API key).
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { generateRaceStory, type RaceStats } from '@/api/claudeInsights'

const props = defineProps<{ raceStats: RaceStats }>()

const stories = ref<{ headline: string; body: string }[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    stories.value = await generateRaceStory(props.raceStats)
  } catch (e) {
    // Present a helpful error if API key missing or network fails
    error.value = 'Could not generate race story. Check your API key in .env.local.'
    // eslint-disable-next-line no-console
    console.error('generateRaceStory error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <!-- Loading state: 5 skeleton cards matching final layout -->
  <div v-if="loading" class="grid grid-cols-1 gap-4">
    <div v-for="i in 5" :key="i" class="story-skeleton glass-card" />
  </div>

  <!-- Error state -->
  <div v-else-if="error" class="story-error glass-card p-4">{{ error }}</div>

  <!-- Stories: staggered reveal using @vueuse/motion -->
  <div v-else class="grid grid-cols-1 gap-4">
    <div
      v-for="(story, i) in stories"
      :key="i"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: i * 120 } }"
      class="story-card glass-card p-4"
    >
      <div class="flex items-start gap-3">
        <div class="story-icon text-2xl">{{ ['🏆','⏱️','📈','🔁','💨'][i] }}</div>
        <div>
          <h3 class="story-headline font-semibold">{{ story.headline }}</h3>
          <p class="story-body text-sm text-gray-200 mt-1">{{ story.body }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.story-skeleton {
  height: 76px;
  background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04));
  border-radius: 8px;
  animation: pulse 1.2s infinite ease-in-out;
}

.story-card {
  padding: 0.75rem;
}

.story-headline {
  color: #fff;
}

.story-body {
  color: #cbd5e1;
}

@keyframes pulse {
  0% { opacity: 1 }
  50% { opacity: 0.6 }
  100% { opacity: 1 }
}

/* Reuse the project's glass-card class if present; otherwise define a minimal style */
.glass-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 0.5rem;
}
</style>
