<script setup>
import { ref, shallowRef, computed, watch } from 'vue'
import StationInput from './components/StationInput.vue'
import RoutePreview from './components/RoutePreview.vue'
import NavigationView from './components/NavigationView.vue'
import { resolve } from './utils/station'
import { findRoute, toActions, routeEnds, TRANSFER_IN_STOPS } from './utils/route'
import { store } from './utils/storage'

// ---------- 狀態 ----------
const saved = store.get('mrt-nav') || {}
const fromText = ref(saved.from || '龍山寺')
const toText = ref(saved.to || '劍南路')
const recent = ref(store.get('mrt-recent') || [])
const navRoute = shallowRef(null) // 有值 = 正在導航
const step = ref(0)

// ---------- 衍生資料：輸入一變，路線自動重算 ----------
const from = computed(() => resolve(fromText.value))
const to = computed(() => resolve(toText.value))

const plan = computed(() => {
  if (!from.value || !to.value) return { status: 'incomplete', route: null }
  if (from.value === to.value) return { status: 'same', route: null }
  const route = findRoute(from.value, to.value)
  return { status: route ? 'ok' : 'none', route }
})

// ---------- 動作 ----------
function swap() {
  ;[fromText.value, toText.value] = [toText.value, fromText.value]
}

// 上次存的步數來自 localStorage，不是整數就從頭開始，超出範圍就夾到頭尾
function validStep(value, lastStep) {
  if (!Number.isInteger(value)) return 0
  return Math.min(Math.max(value, 0), lastStep)
}

function startNav(startStep = 0) {
  const route = plan.value.route
  if (!route) return
  navRoute.value = route
  step.value = validStep(startStep, toActions(route.legs).length - 1)
  window.scrollTo(0, 0)
}

function onStart() {
  const route = plan.value.route
  if (!route) return
  const { from: f, to: t } = routeEnds(route)
  recent.value = [[f, t], ...recent.value.filter(([a, b]) => !(a === f && b === t))].slice(0, 4)
  store.set('mrt-recent', recent.value)
  startNav(0)
}

function endNav() {
  navRoute.value = null
  window.scrollTo(0, 0)
}

function useRecent(f, t) {
  fromText.value = f
  toText.value = t
}

// ---------- 記住上次的查詢與導航進度 ----------
watch([fromText, toText, navRoute, step], () => {
  store.set('mrt-nav', {
    from: fromText.value,
    to: toText.value,
    navigating: !!navRoute.value,
    step: step.value,
  })
})

if (saved.navigating) startNav(saved.step)
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

    <NavigationView v-if="navRoute" v-model:step="step" :route="navRoute" @exit="endNav" />

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
        <button class="swap" type="button" aria-label="交換起點與終點" @click="swap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />
          </svg>
        </button>
      </div>

      <RoutePreview :status="plan.status" :route="plan.route" />

      <button class="primary" type="button" :disabled="!plan.route" @click="onStart">開始導航</button>

      <div v-if="recent.length" class="recent">
        <h2>最近查過</h2>
        <div class="chips">
          <button v-for="[f, t] in recent" :key="f + t" type="button" @click="useRecent(f, t)">
            {{ f }} → {{ t }}
          </button>
        </div>
      </div>

      <p class="note">
        收錄台北捷運文湖、淡水信義、松山新店、中和新蘆、板南、環狀 6 條路線及新北投、小碧潭支線，不含機場捷運與輕軌。
        路線以「轉乘一次約等於多坐 {{ TRANSFER_IN_STOPS }} 站」估算，現場請以站內指標為準。
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
