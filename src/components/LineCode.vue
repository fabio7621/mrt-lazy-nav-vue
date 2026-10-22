<script setup>
// 車站代碼小徽章，例如藍底白字的 BL11
import { computed } from 'vue'
import { LINES } from '../data/metro'

const props = defineProps({
  code: { type: String, required: true },
  line: { type: String, required: true },
})

const badgeStyle = computed(() => ({
  '--lc': LINES[props.line].color,
  '--lci': LINES[props.line].textColor,
}))
</script>

<template>
  <span class="code" :style="badgeStyle">{{ code }}</span>
</template>

<style scoped>
.code {
  display: inline-block;
  font-family: var(--f-num);
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  line-height: 1.35;
  padding: 0 7px;
  border-radius: 6px;
  background: var(--lc);
  color: var(--lci);
  font-variant-numeric: tabular-nums;
}
</style>
