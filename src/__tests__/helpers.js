// 測試 helper：查詢（不帶副作用）和指令（模擬使用者動作）分開
import { mount } from '@vue/test-utils'
import App from '../App.vue'

export function mountApp() {
  return mount(App, { attachTo: document.body })
}

// ---------- 查詢 ----------

// 把樣板換行、縮排造成的空白壓成一格，斷言只看使用者讀到的字
export function textOf(wrapper) {
  return wrapper.text().replace(/\s+/g, ' ').trim()
}

export function inputValue(wrapper, id) {
  return wrapper.get(`#${id}`).element.value
}

export function findButton(wrapper, label) {
  return wrapper.findAll('button').find((b) => textOf(b) === label)
}

export function isNavigating(wrapper) {
  return wrapper.find('[aria-label="乘車導航"]').exists()
}

export function previewText(wrapper) {
  return textOf(wrapper.get('.preview'))
}

// Vue 會拿掉元素之間的換行，所以逐個區塊取字再用空白接起來
export function summaryText(wrapper) {
  return wrapper.findAll('.sum span').map(textOf).join(' ')
}

export function legTexts(wrapper) {
  return wrapper
    .findAll('.legs li')
    .map((li) => `${textOf(li.get('.pill'))} ${textOf(li.get('.leg-text'))}`)
}

// 下拉選單：讀渲染出來的 DOM，不讀 computed
export function isListOpen(wrapper, id) {
  return wrapper.get(`#${id}-list`).isVisible()
}

export function optionNames(wrapper, id) {
  return wrapper.findAll(`#${id}-list [role="option"]`).map((li) => textOf(li.get('button > span')))
}

export function optionCodes(wrapper, id, name) {
  const option = wrapper
    .findAll(`#${id}-list [role="option"]`)
    .find((li) => textOf(li.get('button > span')) === name)
  return option.findAll('.code').map(textOf)
}

export function activeOptionName(wrapper, id) {
  const li = wrapper.find(`#${id}-list [aria-selected="true"]`)
  return li.exists() ? textOf(li.get('button > span')) : null
}

export function recentChips(wrapper) {
  return wrapper.findAll('.recent button').map(textOf)
}

// 步驟卡片上的某一塊，例如 cardPart(wrapper, '.big') → '搭 板南線'
export function cardPart(wrapper, selector) {
  const el = wrapper.find(`article ${selector}`)
  return el.exists() ? textOf(el) : null
}

// 沿途站一列一列讀，站名和標籤用空白隔開：['龍山寺 上車', '西門 下一站', '台北車站', …]
export function stopRows(wrapper) {
  return wrapper
    .findAll('article .stops li')
    .map((li) => li.findAll('span, button').map(textOf).join(' '))
}

export function upNext(wrapper) {
  const el = wrapper.find('.upnext span:not(.k)')
  return el.exists() ? textOf(el) : null
}

export function routeLabel(wrapper) {
  return textOf(wrapper.get('.route-label'))
}

export function primaryLabel(wrapper) {
  return textOf(wrapper.get('.controls .primary'))
}

// ---------- 指令 ----------

export async function typeInto(wrapper, id, text) {
  await wrapper.get(`#${id}`).setValue(text)
}

export async function pressKey(wrapper, id, key, init = {}) {
  await wrapper.get(`#${id}`).trigger('keydown', { key, ...init })
}

export async function setRoute(wrapper, from, to) {
  await typeInto(wrapper, 'from', from)
  await typeInto(wrapper, 'to', to)
}

export async function clickButton(wrapper, label) {
  const button = findButton(wrapper, label)
  if (!button) throw new Error(`找不到按鈕「${label}」`)
  await button.trigger('click')
}

export async function startNavigation(wrapper, from, to) {
  await setRoute(wrapper, from, to)
  await clickButton(wrapper, '開始導航')
}

export async function goForward(wrapper, times = 1) {
  for (let i = 0; i < times; i++) await wrapper.get('.controls .primary').trigger('click')
}
