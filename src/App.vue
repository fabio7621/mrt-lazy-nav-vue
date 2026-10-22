<script setup>
import { ref, shallowRef, computed, watch } from 'vue'
import StationInput from './components/StationInput.vue'
import RoutePreview from './components/RoutePreview.vue'
import NavigationView from './components/NavigationView.vue'
import { resolveStationName } from './utils/station'
import { findRoute, buildActions, getRouteEnds, TRANSFER_COST_IN_STOPS } from './utils/route'
import { store } from './utils/storage'

const SESSION_STORAGE_KEY = 'mrt-nav'
const RECENT_STORAGE_KEY = 'mrt-recent'
const MAX_RECENT_ROUTES = 4
const DEFAULT_FROM = '龍山寺'
const DEFAULT_TO = '劍南路'

// ---------- 讀取上次存的資料 ----------
// localStorage 的內容不可信（舊版本、手動改過），型別不對就當沒存過
const isNonEmptyText = (value) => typeof value === 'string' && value !== ''
const isRecentRoute = (entry) =>
  Array.isArray(entry) && entry.length === 2 && entry.every(isNonEmptyText)

function loadRecentRoutes() {
  const saved = store.get(RECENT_STORAGE_KEY)
  return Array.isArray(saved) ? saved.filter(isRecentRoute) : []
}

// ---------- 狀態 ----------
const savedSession = store.get(SESSION_STORAGE_KEY) || {}
const fromText = ref(isNonEmptyText(savedSession.from) ? savedSession.from : DEFAULT_FROM)
const toText = ref(isNonEmptyText(savedSession.to) ? savedSession.to : DEFAULT_TO)
const recentRoutes = ref(loadRecentRoutes())
const activeRoute = shallowRef(null) // 有值 = 正在導航
const stepIndex = ref(0)

// ---------- 衍生資料：輸入一變，路線自動重算 ----------
const fromStation = computed(() => resolveStationName(fromText.value))
const toStation = computed(() => resolveStationName(toText.value))

const routePlan = computed(() => {
  if (!fromStation.value || !toStation.value) return { status: 'incomplete', route: null }
  if (fromStation.value === toStation.value) return { status: 'same', route: null }
  const route = findRoute(fromStation.value, toStation.value)
  return { status: route ? 'ok' : 'none', route }
})

// ---------- 動作 ----------
function swapStations() {
  ;[fromText.value, toText.value] = [toText.value, fromText.value]
}

function applyRecentRoute(from, to) {
  fromText.value = from
  toText.value = to
}

// 上次存的步數來自 localStorage，不是整數就從頭開始，超出範圍就夾到頭尾
function clampStepIndex(value, lastIndex) {
  if (!Number.isInteger(value)) return 0
  return Math.min(Math.max(value, 0), lastIndex)
}

function enterNavigation(initialStep) {
  const route = routePlan.value.route
  if (!route) return
  const lastIndex = buildActions(route.legs).length - 1
  activeRoute.value = route
  stepIndex.value = clampStepIndex(initialStep, lastIndex)
  window.scrollTo(0, 0)
}

// 同一組起訖站移到最前面，不重複，最多留 MAX_RECENT_ROUTES 筆
// 存進 localStorage 的格式是 [[起點, 終點], …]，改了會讀不到舊資料
function saveRecentRoute({ from, to }) {
  const others = recentRoutes.value.filter(([f, t]) => !(f === from && t === to))
  recentRoutes.value = [[from, to], ...others].slice(0, MAX_RECENT_ROUTES)
  store.set(RECENT_STORAGE_KEY, recentRoutes.value)
}

function startNavigation() {
  const route = routePlan.value.route
  if (!route) return
  saveRecentRoute(getRouteEnds(route))
  enterNavigation(0)
}

function stopNavigation() {
  activeRoute.value = null
  window.scrollTo(0, 0)
}

// ---------- 記住上次的查詢與導航進度 ----------
// 欄位名稱是存進 localStorage 的格式，改了會讀不到舊資料
watch([fromText, toText, activeRoute, stepIndex], () => {
  store.set(SESSION_STORAGE_KEY, {
    from: fromText.value,
    to: toText.value,
    navigating: !!activeRoute.value,
    step: stepIndex.value,
  })
})

if (savedSession.navigating) enterNavigation(savedSession.step)
</script>

<template>
  <div class="app">
    <header class="brand">
      <span class="brand-mark" aria-hidden="true"></span>
      <div>
        <h1>捷運懶人導航</h1>
        <p>選好起訖站，一次只告訴你下一步</p>
      </div>
    </header>

    <NavigationView
      v-if="activeRoute"
      v-model:step-index="stepIndex"
      :route="activeRoute"
      @exit="stopNavigation"
    />

    <section v-else class="screen" aria-label="查詢路線">
      <div class="od">
        <StationInput
          id="from"
          v-model="fromText"
          label="起點"
          variant="from"
          placeholder="站名或代碼，例如 西門、BL11"
        />
        <StationInput id="to" v-model="toText" label="終點" variant="to" placeholder="要去哪一站？" />
        <button class="swap" type="button" aria-label="交換起點與終點" @click="swapStations">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />
          </svg>
        </button>
      </div>

      <RoutePreview :status="routePlan.status" :route="routePlan.route" />

      <button class="primary" type="button" :disabled="!routePlan.route" @click="startNavigation">
        開始導航
      </button>

      <div v-if="recentRoutes.length" class="recent">
        <h2>最近查過</h2>
        <div class="chips">
          <button
            v-for="[from, to] in recentRoutes"
            :key="from + to"
            type="button"
            @click="applyRecentRoute(from, to)"
          >
            {{ from }} → {{ to }}
          </button>
        </div>
      </div>

      <p class="note">
        收錄台北捷運文湖、淡水信義、松山新店、中和新蘆、板南、環狀 6 條路線及新北投、小碧潭支線，不含機場捷運與輕軌。
        路線以「轉乘一次約等於多坐 {{ TRANSFER_COST_IN_STOPS }} 站」估算，現場請以站內指標為準。
      </p>
    </section>
  </div>
</template>

<style scoped>
/* 版面：像站牌一樣的單欄，最寬 560px */
.app {
  max-width: 560px;
  margin: 0 auto;
  padding-inline: 16px;
  padding-block: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
  min-height: 100dvh;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
}
/* 六條路線顏色疊成的識別條 */
.brand-mark {
  flex: none;
  width: 10px;
  height: 42px;
  border-radius: 3px;
  background: linear-gradient(
    #e3002c 0 16.66%,
    #0070bd 0 33.33%,
    #008659 0 50%,
    #f8b61c 0 66.66%,
    #c48c31 0 83.33%,
    #ffdb00 0
  );
}
h1 {
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  margin: 0;
  line-height: 1.3;
}
.brand p {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}

/* 起訖站卡片，左側虛線連接兩個圓點 */
.od {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  padding: 6px 68px 6px 16px;
}
.od::before {
  content: '';
  position: absolute;
  left: 23px;
  top: 44px;
  bottom: 44px;
  width: 2px;
  background: repeating-linear-gradient(var(--muted) 0 4px, transparent 4px 8px);
}
.swap {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--surface-2);
  display: grid;
  place-items: center;
}
.swap svg {
  width: 20px;
  height: 20px;
}

.recent {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.recent h2 {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chips button {
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.9375rem;
  min-height: 40px;
}

.note {
  margin: auto 0 0;
  padding-block: 8px 24px;
  color: var(--muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}
</style>
