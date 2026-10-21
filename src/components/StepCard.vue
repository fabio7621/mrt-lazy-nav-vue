<script setup>
// 導航頁的大卡片：一次只顯示一個動作
// 父層用 :key="step" 綁定，換步驟時元件會重新建立 → 進場動畫重播、expanded 自動重置
import { ref, computed } from 'vue'
import LineCode from './LineCode.vue'
import { codeOn } from '../utils/station'

const props = defineProps({
  action: { type: Object, required: true }, // { type, leg }
  index: { type: Number, required: true },
  route: { type: Object, required: true },
})

const expanded = ref(false)
const leg = computed(() => props.action.leg)
const kind = computed(() => props.action.type)
const isBoarding = computed(() => kind.value === 'board' || kind.value === 'transfer')

const cardClass = computed(() =>
  kind.value === 'ride' ? 'ride' : kind.value === 'arrive' ? 'arrive' : 'fill',
)
const cardStyle = computed(() =>
  kind.value === 'arrive' ? {} : { '--lc': leg.value.color, '--lci': leg.value.ink },
)

// ---------- 上車 / 轉乘：版面相同，只差文字 ----------
const isFirstBoarding = computed(() => kind.value === 'board')
const boardingLabel = computed(() => (isFirstBoarding.value ? '進站' : '轉乘'))
const boardingVerb = computed(() => (isFirstBoarding.value ? '搭' : '轉'))
const boardingTip = computed(() => {
  const { hue, lineName, dir } = leg.value
  return isFirstBoarding.value
    ? `進站後找${hue}色的「${lineName}」指標，月台上寫著「往 ${dir}」的那一側。`
    : `下車後跟著${hue}色的轉乘指標走，到「往 ${dir}」的月台候車。`
})

// ---------- 乘車中 ----------
const rideTip = computed(() =>
  leg.value.count === 1
    ? '下一站就要下車，可以先往車門移動。'
    : `聽到「${leg.value.stops.at(-2)}」到站後，下一站就要下車。`,
)

// 沿途站：超過 7 站時只留頭兩站和最後三站，中間折起來
const MAX_VISIBLE_STOPS = 7
const HEAD_STOPS = 2
const TAIL_STOPS = 3

function stopRow(name, i, n) {
  const isFirst = i === 0
  const isLast = i === n - 1
  return {
    type: 'stop',
    name,
    cls: isFirst ? 'first' : isLast ? 'last' : '',
    tag: isFirst ? '上車' : isLast ? '下車' : i === 1 ? '下一站' : '',
  }
}

function collapsedRows(stops) {
  const n = stops.length
  const row = (i) => stopRow(stops[i], i, n)
  const head = Array.from({ length: HEAD_STOPS }, (_, i) => row(i))
  const tail = Array.from({ length: TAIL_STOPS }, (_, i) => row(n - TAIL_STOPS + i))
  return [...head, { type: 'gap', hidden: n - HEAD_STOPS - TAIL_STOPS }, ...tail]
}

const stopRows = computed(() => {
  const stops = leg.value.stops
  if (stops.length > MAX_VISIBLE_STOPS && !expanded.value) return collapsedRows(stops)
  return stops.map((name, i) => stopRow(name, i, stops.length))
})
</script>

<template>
  <article class="step" :class="cardClass" :style="cardStyle" aria-live="polite">
    <!-- 上車 / 轉乘 -->
    <template v-if="isBoarding">
      <p class="eyebrow">第 {{ index + 1 }} 步 · {{ boardingLabel }}</p>
      <p class="where">
        在 <strong>{{ leg.from }}</strong>
        <LineCode :code="codeOn(leg.from, leg.line)" :line="leg.line" />
        <span v-if="kind === 'transfer'">不用出站</span>
      </p>
      <h2 class="big">{{ boardingVerb }} {{ leg.lineName }}</h2>
      <div class="dir">
        <span class="dir-label">往</span>
        <span class="dir-name">{{ leg.dir }}</span>
        <span class="dir-label">方向</span>
      </div>
      <p class="tip">{{ boardingTip }}</p>
    </template>

    <!-- 乘車中 -->
    <template v-else-if="kind === 'ride'">
      <p class="eyebrow">第 {{ index + 1 }} 步 · 乘車 · {{ leg.lineName }}</p>
      <div class="count">
        <span class="num">{{ leg.count }}</span>
        <span class="unit">站</span>
      </div>
      <p class="where">
        在 <strong>{{ leg.to }}</strong>
        <LineCode :code="codeOn(leg.to, leg.line)" :line="leg.line" />
        下車
      </p>
      <ol class="stops">
        <template v-for="(r, i) in stopRows" :key="i">
          <li v-if="r.type === 'gap'" class="gap">
            <button type="button" @click="expanded = true">中間還有 {{ r.hidden }} 站 · 展開</button>
          </li>
          <li v-else :class="r.cls">
            <span class="s">{{ r.name }}</span>
            <span v-if="r.tag" class="tag">{{ r.tag }}</span>
          </li>
        </template>
      </ol>
      <p class="tip">{{ rideTip }}</p>
    </template>

    <!-- 抵達 -->
    <template v-else>
      <p class="eyebrow">完成</p>
      <h2 class="big">抵達 {{ leg.to }}</h2>
      <p class="tip">這趟共坐 {{ route.stations }} 站、轉乘 {{ route.transfers }} 次。出站時記得刷卡。</p>
    </template>
  </article>
</template>

<style scoped>
.step {
  border-radius: 22px;
  padding: 24px 20px 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: enter 0.28s ease-out;
}
@keyframes enter {
  from {
    transform: translateY(8px);
    opacity: 0.4;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .step {
    animation: none;
  }
}

.step.fill {
  background: var(--lc);
  color: var(--lci);
}
.step.fill :deep(.code) {
  box-shadow: inset 0 0 0 2px currentColor;
}
.step.ride {
  background: var(--surface);
  border: 1px solid var(--line);
}
.step.arrive {
  background: var(--ink);
  color: var(--on-ink);
}

.eyebrow {
  margin: 0;
  font-size: 0.8125rem;
  letter-spacing: 0.14em;
  font-weight: 700;
  opacity: 0.85;
}
.where {
  margin: 0;
  font-size: 1.125rem;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.where strong {
  font-size: 1.375rem;
  font-weight: 900;
}
.big {
  margin: 0;
  font-size: clamp(2.25rem, 10vw, 3.25rem);
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: 0.02em;
  text-wrap: balance;
}
.dir {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  border-radius: 14px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--lci) 16%, transparent);
}
.dir-label {
  font-size: 1rem;
  font-weight: 700;
}
.dir-name {
  font-size: 1.75rem;
  font-weight: 900;
  line-height: 1.2;
}
.tip {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  opacity: 0.92;
}
.step.ride .tip {
  color: var(--muted);
  opacity: 1;
}

.count {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.count .num {
  font-family: var(--f-num);
  font-weight: 700;
  font-size: 5rem;
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
}
.count .unit {
  font-size: 1.5rem;
  font-weight: 900;
}

/* 沿途站：左側一條路線色的軌道 */
.stops {
  list-style: none;
  margin: 4px 0 0;
  padding: 0 0 0 30px;
  position: relative;
  display: flex;
  flex-direction: column;
}
.stops::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 18px;
  bottom: 18px;
  width: 4px;
  border-radius: 2px;
  background: var(--lc);
}
.stops li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
}
.stops li::before {
  content: '';
  position: absolute;
  left: -26px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--surface);
  border: 3px solid var(--lc);
}
.stops li.first::before,
.stops li.last::before {
  background: var(--lc);
}
.stops li.last .s {
  font-weight: 900;
  font-size: 1.125rem;
}
.stops li.gap::before {
  display: none;
}
.stops .gap button {
  border: 1px dashed var(--line);
  background: var(--surface-2);
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 0.875rem;
  color: var(--muted);
}
.tag {
  font-size: 0.75rem;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
  font-weight: 700;
}
.stops li.last .tag {
  background: var(--lc);
  color: var(--lci);
}
</style>
