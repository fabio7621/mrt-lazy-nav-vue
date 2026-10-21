<script setup>
// 查詢頁：開始導航前先看路線摘要
defineProps({
  status: { type: String, required: true }, // 'incomplete' | 'same' | 'none' | 'ok'
  route: { type: Object, default: null },
})
</script>

<template>
  <div class="preview" aria-live="polite">
    <p v-if="status === 'incomplete'" class="hint">選好起點和終點，這裡會先列出要搭哪幾條線。</p>
    <p v-else-if="status === 'same'" class="hint warn">起點和終點是同一站，不用搭車喔。</p>
    <p v-else-if="status === 'none'" class="hint warn">找不到這兩站之間的路線。</p>

    <template v-else>
      <div class="sum">
        <span><b>{{ route.stations }}</b>站</span>
        <span><b>{{ route.transfers }}</b>次轉乘</span>
      </div>
      <ol class="legs">
        <li
          v-for="leg in route.legs"
          :key="leg.svc + leg.from"
          :style="{ '--lc': leg.color, '--lci': leg.ink }"
        >
          <span class="pill">{{ leg.lineName }}</span>
          <span class="leg-text">
            {{ leg.from }} → {{ leg.to }}
            <small>往 {{ leg.dir }} 方向 · 坐 {{ leg.count }} 站</small>
          </span>
        </li>
      </ol>
    </template>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.9375rem;
}
.hint.warn {
  color: var(--ink);
  font-weight: 700;
}

.sum {
  display: flex;
  gap: 24px;
  align-items: baseline;
}
.sum span {
  color: var(--muted);
  font-size: 0.9375rem;
}
.sum b {
  font-family: var(--f-num);
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--ink);
  margin-right: 4px;
  font-variant-numeric: tabular-nums;
}

.legs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.legs li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}
.legs li:first-child {
  border-top: 0;
}
.pill {
  font-size: 0.8125rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--lc);
  color: var(--lci);
  white-space: nowrap;
}
.leg-text {
  font-weight: 700;
  font-size: 1.0625rem;
  min-width: 0;
}
.leg-text small {
  display: block;
  font-weight: 400;
  font-size: 0.8125rem;
  color: var(--muted);
}
</style>
