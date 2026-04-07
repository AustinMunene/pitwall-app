<template>
  <div class="app noise-bg">
    <nav class="nav navbar">
      <div class="nav-inner navbar-inner">
        <router-link to="/" class="nav-logo navbar-logo">
          <span class="logo-accent">BOX</span>LAP
        </router-link>

        <div class="nav-links navbar-links desktop-only">
          <router-link
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="nav-link navbar-link"
            :class="{ 'nav-link-active': isNavActive(link), 'navbar-link--active': isNavActive(link) }"
          >
            {{ link.label }}
          </router-link>
        </div>

        <div class="season-selector season-selector--desktop desktop-only">
          <button
            v-for="year in seasonStore.availableSeasons"
            :key="year"
            type="button"
            class="season-pill"
            :class="{ 'season-pill--active': seasonStore.selectedSeason === year }"
            @click="onSeasonSelect(year)"
          >
            {{ year }}
          </button>
        </div>

        <button
          type="button"
          class="hamburger mobile-only"
          :class="{ 'hamburger--open': menuOpen }"
          aria-label="Toggle menu"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <span class="hamburger-line" />
          <span class="hamburger-line" />
          <span class="hamburger-line" />
        </button>
      </div>

      <Transition name="dropdown">
        <div v-if="menuOpen" class="mobile-menu-backdrop" @click="menuOpen = false">
          <div class="mobile-menu-panel" @click.stop>
            <router-link
              v-for="link in navLinks"
              :key="`mobile-${link.path}`"
              :to="link.path"
              class="mobile-menu-link"
              :class="{ 'mobile-menu-link--active': isNavActive(link) }"
              @click="menuOpen = false"
            >
              <span>{{ link.label }}</span>
              <span class="mobile-menu-arrow">›</span>
            </router-link>

            <div class="mobile-menu-divider" />

            <div class="mobile-menu-seasons">
              <span class="mobile-menu-seasons-label">Season</span>
              <div class="mobile-menu-season-pills">
                <button
                  v-for="year in seasonStore.availableSeasons"
                  :key="`mobile-season-${year}`"
                  type="button"
                  class="mobile-season-pill"
                  :class="{ 'mobile-season-pill--active': seasonStore.selectedSeason === year }"
                  @click="selectSeasonMobile(year)"
                >
                  {{ year }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </nav>

    <main class="main-content page-content">
      <router-view v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <footer class="footer">
      <div class="footer-inner container">
        <span class="footer-logo"><span class="logo-accent">BOX</span>LAP</span>
        <span class="footer-desc">F1 Fan Analytics - Data from OpenF1 & Ergast API</span>
        <span class="footer-disclaimer">Not affiliated with Formula 1, FOM, or FIA.</span>
      </div>
    </footer>

    <BackToTop />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSeasonStore } from '@/stores/seasonStore'
import { useRaceStore } from '@/stores/raceStore'
import BackToTop from '@/components/ui/BackToTop.vue'

const menuOpen = ref(false)
const route = useRoute()
const router = useRouter()
const seasonStore = useSeasonStore()
const raceStore = useRaceStore()

watch(
  () => route.path,
  () => {
    menuOpen.value = false
  }
)

/**
 * When the user selects a different season, we navigate to the home page rather than
 * staying on the current page. Race rounds, telemetry sessions, and profile context
 * are season-specific; going home matches common F1 site behaviour and avoids stale state.
 */
async function onSeasonSelect(year: number) {
  if (year === seasonStore.selectedSeason) return

  seasonStore.setSelectedSeason(year)
  raceStore.reset()
  await seasonStore.loadCurrentSeason()
  await router.push('/')
}

const navLinks = computed(() => [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/drivers', label: 'Drivers', icon: '🧑‍✈️' },
  { path: '/teams', label: 'Teams', icon: '🔧' },
  { path: `/telemetry/${seasonStore.selectedSeason}/1`, label: 'Telemetry', icon: '📡', telemetry: true as const },
])

function isNavActive(link: { path: string; telemetry?: boolean }) {
  if (link.telemetry) return route.path.startsWith('/telemetry')
  return route.path === link.path
}

async function selectSeasonMobile(year: number) {
  await onSeasonSelect(year)
  menuOpen.value = false
}

onMounted(() => {
  void seasonStore.loadCurrentSeason()
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(8, 8, 8, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-inner {
  min-height: 60px;
  flex-wrap: wrap;
}

.nav-logo {
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: white;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-accent {
  color: #e8002d;
}

.nav-link {
  border-radius: 6px;
  color: #888;
  text-decoration: none;
  transition:
    color 0.15s,
    background 0.15s;
  letter-spacing: 0.03em;
}

.nav-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.nav-link.router-link-active,
.nav-link.nav-link-active {
  color: #fff;
  background: rgba(232, 0, 45, 0.12);
}

.season-selector--desktop {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 4px;
  flex-shrink: 0;
}

.season-selector--in-menu {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 8px;
}

.season-pill {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
  color: #666;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Titillium Web', sans-serif;
}

.season-pill--active {
  background: #e8002d;
  color: #fff;
}

.main-content {
  flex: 1;
}

.footer {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 2rem 1.5rem;
}

.footer-inner {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  text-align: center;
}

.footer-logo {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.footer-desc {
  font-size: 0.8rem;
  color: #666;
}

.footer-disclaimer {
  font-size: 0.75rem;
  color: #444;
}

@media (min-width: 769px) {
  .nav-links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex: 1;
  }

  .nav-link {
    padding: 0.375rem 0.875rem;
    font-size: 0.875rem;
    font-weight: 600;
  }
}

@media (max-width: 900px) {
  .season-selector--desktop {
    order: 3;
    width: 100%;
    justify-content: center;
  }
}

.desktop-only {
  display: flex;
}

.mobile-only {
  display: none;
}

.mobile-menu-backdrop {
  position: fixed;
  inset: 56px 0 0 0;
  z-index: 99;
  background: transparent;
}

.mobile-menu-panel {
  position: absolute;
  top: 8px;
  right: 12px;
  width: 240px;
  background: rgba(14, 14, 14, 0.98);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 8px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 16px 40px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  transform-origin: top right;
}

.mobile-menu-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #777;
  text-decoration: none;
  transition: all 0.15s;
  font-family: 'Titillium Web', sans-serif;
}

.mobile-menu-link:hover,
.mobile-menu-link:active {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.mobile-menu-link--active {
  background: rgba(232, 0, 45, 0.1);
  color: #e8002d;
}

.mobile-menu-arrow {
  margin-left: auto;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.15);
  font-weight: 300;
}

.mobile-menu-link--active .mobile-menu-arrow {
  color: rgba(232, 0, 45, 0.3);
}

.mobile-menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 6px 8px;
}

.mobile-menu-seasons {
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-menu-seasons-label {
  font-size: 10px;
  font-weight: 700;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.mobile-menu-season-pills {
  display: flex;
  gap: 6px;
}

.mobile-season-pill {
  flex: 1;
  padding: 7px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #666;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Titillium Web', sans-serif;
  text-align: center;
  min-height: unset;
  height: 34px;
}

.mobile-season-pill:active {
  transform: scale(0.94);
}

.mobile-season-pill--active {
  background: #e8002d;
  border-color: #e8002d;
  color: #fff;
}

.dropdown-enter-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.dropdown-leave-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
}

.dropdown-enter-from .mobile-menu-panel {
  transform: scale(0.94) translateY(-8px);
}

.dropdown-leave-to .mobile-menu-panel {
  transform: scale(0.97) translateY(-4px);
}

.dropdown-enter-active .mobile-menu-panel,
.dropdown-leave-active .mobile-menu-panel {
  transition: transform 0.16s ease;
}

.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  min-height: unset;
  padding: 0;
}

.hamburger-line {
  width: 18px;
  height: 1.5px;
  background: #fff;
  border-radius: 2px;
  transition: all 0.22s ease;
  display: block;
  transform-origin: center;
}

.hamburger--open .hamburger-line:nth-child(1) {
  transform: translateY(6.5px) rotate(45deg);
}

.hamburger--open .hamburger-line:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}

.hamburger--open .hamburger-line:nth-child(3) {
  transform: translateY(-6.5px) rotate(-45deg);
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: flex !important;
  }

  .navbar-inner {
    padding: 0 16px;
    justify-content: space-between;
    gap: 0;
  }
}
</style>
