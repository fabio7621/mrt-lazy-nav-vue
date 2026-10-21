// 每個測試共用的環境
// mock 邊界：自己寫的程式（utils、data、元件）都真實執行，只隔離 jsdom 沒實作的 BOM
import { afterEach, beforeEach, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'

enableAutoUnmount(afterEach)

beforeEach(() => {
  // localStorage 用 jsdom 的真實實作，只清掉上一個測試留下的資料
  localStorage.clear()
  // jsdom 沒實作 scrollTo，直接呼叫會印出 not implemented
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})
