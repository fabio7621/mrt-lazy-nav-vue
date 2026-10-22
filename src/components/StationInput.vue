<script setup>
// 站名輸入框 + 自動完成下拉選單
// 用法：<StationInput id="from" v-model="fromText" label="起點" />
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { searchStations, resolveStationName } from '../utils/station'
import LineCode from './LineCode.vue'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  placeholder: { type: String, default: '' },
  variant: { type: String, default: 'from' }, // 'from' | 'to'，控制圓點樣式
})

// Vue 3.4+：defineModel 直接拿到 v-model 綁定的值
const inputText = defineModel({ type: String, default: '' })

const inputEl = ref(null)
const listEl = ref(null)
const isListOpen = ref(false)
const activeIndex = ref(0)
let isPointerOnList = false // 手指／滑鼠正按在選單上（不需要畫面更新，用一般變數就好）

const suggestions = computed(() => searchStations(inputText.value))
const isListVisible = computed(() => isListOpen.value && suggestions.value.length > 0)
const listId = computed(() => `${props.id}-list`)
const optionId = (index) => `${props.id}-opt-${index}`

function openList() {
  activeIndex.value = 0
  isListOpen.value = true
}

function closeList() {
  isListOpen.value = false
}

function selectStation(name) {
  isPointerOnList = false
  inputText.value = name
  closeList()
}

// 離開輸入框：關選單，把「西門站」「bl11」整理成正式站名
function commitInput() {
  closeList()
  const name = resolveStationName(inputText.value)
  if (name) inputText.value = name
}

// 重點：blur 會比 click 早發生，正在點選單時先不要關
function onBlur() {
  if (isPointerOnList) return
  commitInput()
}

function moveActiveIndex(offset) {
  const lastIndex = suggestions.value.length - 1
  activeIndex.value = Math.min(Math.max(activeIndex.value + offset, 0), lastIndex)
}

function selectActiveSuggestion() {
  const suggestion = suggestions.value[activeIndex.value]
  if (suggestion) selectStation(suggestion.name)
}

function onKeydown(event) {
  if (!isListVisible.value || event.isComposing) return // 注音選字中按 Enter 不要搶
  if (event.key === 'ArrowDown') {
    moveActiveIndex(1)
    event.preventDefault()
  } else if (event.key === 'ArrowUp') {
    moveActiveIndex(-1)
    event.preventDefault()
  } else if (event.key === 'Enter') {
    selectActiveSuggestion()
    event.preventDefault()
  } else if (event.key === 'Escape') {
    closeList()
  }
}

// 保險：手指在選單上滑動但沒點選，之後點別處時要收尾
function onDocumentPointerDown(event) {
  if (!isPointerOnList || listEl.value?.contains(event.target)) return
  isPointerOnList = false
  if (document.activeElement !== inputEl.value) commitInput()
}
onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <div class="field" :class="variant">
    <span class="dot" aria-hidden="true"></span>
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      ref="inputEl"
      v-model="inputText"
      autocomplete="off"
      role="combobox"
      :aria-expanded="isListVisible"
      :aria-controls="listId"
      :aria-activedescendant="isListVisible ? optionId(activeIndex) : undefined"
      :placeholder="placeholder"
      @focus="$event.target.select()"
      @input="openList"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <ul
      v-show="isListVisible"
      :id="listId"
      ref="listEl"
      class="suggest"
      role="listbox"
      @mousedown.prevent
      @pointerdown="isPointerOnList = true"
    >
      <li
        v-for="(station, i) in suggestions"
        :id="optionId(i)"
        :key="station.name"
        role="option"
        :aria-selected="i === activeIndex"
      >
        <button type="button" tabindex="-1" @click="selectStation(station.name)">
          <span>{{ station.name }}</span>
          <span class="badges">
            <LineCode
              v-for="entry in station.codes"
              :key="entry.code"
              :code="entry.code"
              :line="entry.line"
            />
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.field {
  position: relative;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  column-gap: 12px;
  align-items: center;
  padding-block: 12px;
}
.field.to {
  border-top: 1px solid var(--line);
}

.dot {
  position: relative;
  z-index: 1;
  grid-row: 1 / 3;
  justify-self: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid var(--ink);
  background: var(--surface);
}
.field.to .dot {
  background: var(--ink);
}

label {
  grid-column: 2;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--muted);
  font-weight: 700;
}

input {
  grid-column: 2;
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 1.3rem;
  font-weight: 700;
  padding: 2px 0;
  border-radius: 4px;
}
input::placeholder {
  color: var(--muted);
  font-weight: 400;
  font-size: 1rem;
}
input:focus {
  outline: none;
}
input:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
}

.suggest {
  position: absolute;
  z-index: 20;
  top: calc(100% - 4px);
  left: 20px;
  right: -56px;
  list-style: none;
  margin: 0;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.16);
  max-height: 320px;
  overflow: auto;
}
.suggest button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  font-size: 1.0625rem;
  font-weight: 500;
}
.suggest li[aria-selected='true'] button,
.suggest button:hover {
  background: var(--surface-2);
}
.badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
