<script setup>
// 導航頁：進度條 + 一張步驟卡片 + 上一步／下一步
// 核心觀念：畫面 = 依 actions[stepIndex] 畫出來，按鈕只負責改 stepIndex
import { computed, onMounted, onUnmounted } from 'vue'
import StepCard from './StepCard.vue'
import { buildActions, getRouteEnds } from '../utils/route'

const props = defineProps({
  route: { type: Object, required: true },
})
const stepIndex = defineModel('stepIndex', { type: Number, default: 0 })
const emit = defineEmits(['exit'])

const PRIMARY_BUTTON_TEXT = {
  board: '我上車了',
  transfer: '我上車了',
  ride: '我下車了',
  arrive: '再查一條路線',
}

const actions = computed(() => buildActions(props.route.legs))
const currentAction = computed(() => actions.value[stepIndex.value])
const nextAction = computed(() => actions.value[stepIndex.value + 1])
const isLastStep = computed(() => stepIndex.value >= actions.value.length - 1)
const routeLabel = computed(() => {
  const { from, to } = getRouteEnds(props.route)
  return `${from} → ${to}`
})

// 「接下來」那一行的一句話摘要
function summarizeAction(action) {
  const { leg } = action
  return {
    board: `在${leg.from}搭${leg.lineName}`,
    transfer: `在${leg.from}轉${leg.lineName}，往${leg.direction}`,
    ride: `坐 ${leg.stopCount} 站，在${leg.to}下車`,
    arrive: `抵達${leg.to}`,
  }[action.type]
}

function goToNextStep() {
  if (isLastStep.value) emit('exit')
  else stepIndex.value++
}
function goToPreviousStep() {
  if (stepIndex.value > 0) stepIndex.value--
}

// 導航中盡量讓螢幕不要自動熄滅（瀏覽器不支援就算了）
let wakeLock = null
let isUnmounted = false
async function requestWakeLock() {
  try {
    const lock = await navigator.wakeLock?.request('screen')
    // 瀏覽器答應前導航可能已經結束，這時拿到的鎖要馬上放掉
    if (isUnmounted) lock?.release?.()
    else wakeLock = lock
  } catch {
    wakeLock = null
  }
}
function releaseWakeLock() {
  wakeLock?.release?.()
}
// 切到背景時瀏覽器會自動釋放，回到前景要重新要一次
function onVisibilityChange() {
  if (document.visibilityState === 'visible') requestWakeLock()
}
onMounted(() => {
  requestWakeLock()
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onUnmounted(() => {
  isUnmounted = true
  releaseWakeLock()
  document.removeEventListener('visibilitychange', onVisibilityChange)
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
        v-for="(action, i) in actions"
        :key="i"
        :class="{ done: i < stepIndex, now: i === stepIndex }"
        :style="{ '--seg': action.type === 'arrive' ? 'var(--ink)' : action.leg.color }"
      ></span>
    </div>

    <StepCard :key="stepIndex" :action="currentAction" :step-index="stepIndex" :route="route" />

    <div class="upnext">
      <template v-if="nextAction">
        <span class="k">接下來</span>
        <span>{{ summarizeAction(nextAction) }}</span>
      </template>
    </div>

    <div class="controls">
      <button class="secondary" type="button" :disabled="stepIndex === 0" @click="goToPreviousStep">
        上一步
      </button>
      <button class="primary" type="button" @click="goToNextStep">
        {{ PRIMARY_BUTTON_TEXT[currentAction.type] }}
      </button>
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
