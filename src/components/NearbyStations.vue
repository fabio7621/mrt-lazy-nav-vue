<script setup>
// 「用目前位置當起點」：定位 → 自動選最近的站，並列出附近幾站讓使用者改選
// 用法：<NearbyStations :selected="fromStation" @select="fromText = $event" />
import { ref, computed } from 'vue'
import { findNearbyStations, formatDistance } from '../utils/geo'
import { getCurrentPosition, LOCATE_FAILURE } from '../utils/geolocation'

defineProps({
  selected: { type: String, default: null }, // 目前的起點，用來標示已選的那顆
})
const emit = defineEmits(['select'])

// 誤差超過這個值，最近的站可能不準，要提醒使用者確認
const POOR_ACCURACY_METERS = 300

const FAILURE_MESSAGES = {
  [LOCATE_FAILURE.UNSUPPORTED]: '這個瀏覽器不支援定位，請直接輸入站名',
  [LOCATE_FAILURE.DENIED]: '沒有定位權限，請在瀏覽器設定允許定位，或直接輸入站名',
  [LOCATE_FAILURE.UNAVAILABLE]: '目前抓不到位置（在地下或室內常發生），請直接輸入站名',
  [LOCATE_FAILURE.TIMEOUT]: '定位逾時，請再試一次或直接輸入站名',
}

const isLocating = ref(false)
const nearbyStations = ref([])
const message = ref('')
const buttonLabel = computed(() => (isLocating.value ? '定位中…' : '用目前位置當起點'))

function describeResult(nearest, accuracy) {
  if (!nearest) return '附近 2 公里內沒有捷運站，請直接輸入站名'
  if (accuracy > POOR_ACCURACY_METERS) {
    return `定位誤差約 ${Math.round(accuracy)} 公尺，已先設為「${nearest.name}」，請確認是不是這一站`
  }
  return `離你最近的是「${nearest.name}」，已設為起點`
}

async function locate() {
  isLocating.value = true
  message.value = ''
  try {
    const { position, accuracy } = await getCurrentPosition()
    nearbyStations.value = findNearbyStations(position)
    const [nearest] = nearbyStations.value
    if (nearest) emit('select', nearest.name)
    message.value = describeResult(nearest, accuracy)
  } catch (error) {
    nearbyStations.value = []
    message.value = FAILURE_MESSAGES[error.reason] || FAILURE_MESSAGES[LOCATE_FAILURE.UNAVAILABLE]
  } finally {
    isLocating.value = false
  }
}
</script>

<template>
  <div class="locate">
    <button class="locate-btn" type="button" :disabled="isLocating" @click="locate">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
      <span>{{ buttonLabel }}</span>
    </button>

    <p class="locate-msg" role="status">{{ message }}</p>

    <div v-if="nearbyStations.length" class="nearby" role="group" aria-label="附近車站">
      <button
        v-for="station in nearbyStations"
        :key="station.name"
        type="button"
        :aria-pressed="station.name === selected"
        @click="emit('select', station.name)"
      >
        <span class="name">{{ station.name }}</span>
        <span class="dist">{{ formatDistance(station.distance) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.locate {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.locate-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 14px 0 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  font-size: 0.9375rem;
  font-weight: 700;
}
.locate-btn svg {
  width: 20px;
  height: 20px;
}
.locate-btn:disabled {
  opacity: 0.6;
  cursor: progress;
}

.locate-msg {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
  line-height: 1.5;
}
.locate-msg:empty {
  display: none;
}

.nearby {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.nearby button {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-height: 40px;
  padding: 6px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  font-size: 0.9375rem;
}
.nearby button[aria-pressed='true'] {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--on-ink);
}
.name {
  font-weight: 700;
}
.dist {
  font-size: 0.8125rem;
  opacity: 0.75;
}
</style>
