<script setup>
// 導航頁：進度條 + 一張步驟卡片 + 上一步／下一步
// 核心觀念：畫面 = 依 actions[step] 畫出來，按鈕只負責改 step
import { computed, onMounted, onUnmounted } from 'vue'
import StepCard from './StepCard.vue'
import { toActions, routeEnds } from '../utils/route'

const props = defineProps({
  route: { type: Object, required: true },
})
const step = defineModel('step', { type: Number, default: 0 })
const emit = defineEmits(['exit'])

const actions = computed(() => toActions(props.route.legs))
const current = computed(() => actions.value[step.value])
const nextAction = computed(() => actions.value[step.value + 1])
const isLast = computed(() => step.value >= actions.value.length - 1)
const routeLabel = computed(() => {
  const { from, to } = routeEnds(props.route)
  return `${from} → ${to}`
})

const BUTTON_TEXT = {
  board: '我上車了',
  transfer: '我上車了',
  ride: '我下車了',
  arrive: '再查一條路線',
}

function brief(a) {
  const l = a.leg
  return {
    board: `在${l.from}搭${l.lineName}`,
    transfer: `在${l.from}轉${l.lineName}，往${l.dir}`,
    ride: `坐 ${l.count} 站，在${l.to}下車`,
    arrive: `抵達${l.to}`,
  }[a.type]
}

function next() {
  if (isLast.value) emit('exit')
  else step.value++
}
function prev() {
  if (step.value > 0) step.value--
}

// 導航中盡量讓螢幕不要自動熄滅（瀏覽器不支援就算了）
let wakeLock = null
async function keepAwake() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen')
  } catch {
    wakeLock = null
  }
}
function onVisibility() {
  if (document.visibilityState === 'visible') keepAwake()
}
onMounted(() => {
  keepAwake()
  document.addEventListener('visibilitychange', onVisibility)
})
onUnmounted(() => {
  wakeLock?.release?.()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <section class="screen" aria-label="乘車導航">
    <div class="nav-head">
      <button class="ghost" type="button" @click="emit('exit')">← 結束導航</button>
      <span class="route-label">{{ routeLabel }}</span>
    </div>

    <div class="progress" aria-hidden="true">
      <span
        v-for="(a, i) in actions"
        :key="i"
        :class="{ done: i < step, now: i === step }"
        :style="{ '--seg': a.type === 'arrive' ? 'var(--ink)' : a.leg.color }"
      ></span>
    </div>

    <StepCard :key="step" :action="current" :index="step" :route="route" />

    <div class="upnext">
      <template v-if="nextAction">
        <span class="k">接下來</span>
        <span>{{ brief(nextAction) }}</span>
      </template>
    </div>

    <div class="controls">
      <button class="secondary" type="button" :disabled="step === 0" @click="prev">上一步</button>
      <button class="primary" type="button" @click="next">{{ BUTTON_TEXT[current.type] }}</button>
    </div>
  </section>
</template>

<style scoped>
.nav-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.route-label {
  font-size: 0.875rem;
  color: var(--muted);
  text-align: right;
  min-width: 0;
}

.progress {
  display: flex;
  gap: 4px;
  align-items: center;
}
.progress span {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--seg);
  opacity: 0.25;
  transition: opacity 0.2s, height 0.2s;
}
.progress span.done {
  opacity: 1;
}
.progress span.now {
  opacity: 1;
  height: 10px;
}

.upnext {
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 0.9375rem;
  padding-inline: 4px;
}
.upnext .k {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--muted);
  font-weight: 700;
  flex: none;
}

/* 按鈕固定在拇指好按的底部 */
.controls {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
  padding-block: 16px calc(16px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to bottom, transparent, var(--bg) 30%);
}

@media (prefers-reduced-motion: reduce) {
  .progress span {
    transition: none;
  }
}
</style>
