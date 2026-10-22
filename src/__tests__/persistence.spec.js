// 記住上次的查詢與導航進度：關掉頁面再打開，接著上次的狀態
// localStorage 用 jsdom 真實實作；「重新整理」＝ unmount 後再 mount 一次
import { describe, it, expect, vi } from 'vitest'
import {
  mountApp,
  inputValue,
  isNavigating,
  previewText,
  recentChips,
  cardPart,
  setRoute,
  clickButton,
  startNavigation,
  goForward,
} from './helpers'

function reload(wrapper) {
  wrapper.unmount()
  return mountApp()
}

// 模擬上一次使用留下的資料
function savedSession(nav) {
  localStorage.setItem('mrt-nav', JSON.stringify(nav))
}

describe('重新整理後保留查詢', () => {
  it('起點維持上次輸入的站', async () => {
    const before = mountApp()
    await setRoute(before, '西門', '台北車站')
    const after = reload(before)
    expect(inputValue(after, 'from')).toBe('西門')
  })

  it('終點維持上次輸入的站', async () => {
    const before = mountApp()
    await setRoute(before, '西門', '台北車站')
    const after = reload(before)
    expect(inputValue(after, 'to')).toBe('台北車站')
  })

  it('最近查過的路線還在', async () => {
    const before = mountApp()
    await startNavigation(before, '西門', '台北車站')
    await clickButton(before, '← 結束導航')
    const after = reload(before)
    expect(recentChips(after)).toEqual(['西門 → 台北車站'])
  })

  it('已經結束導航的話，停在查詢頁', async () => {
    const before = mountApp()
    await startNavigation(before, '西門', '台北車站')
    await clickButton(before, '← 結束導航')
    const after = reload(before)
    expect(isNavigating(after)).toBe(false)
  })
})

describe('導航到一半重新整理', () => {
  it('回到導航頁', async () => {
    const before = mountApp()
    await startNavigation(before, '龍山寺', '劍南路')
    const after = reload(before)
    expect(isNavigating(after)).toBe(true)
  })

  it('停在剛才那一步', async () => {
    const before = mountApp()
    await startNavigation(before, '龍山寺', '劍南路')
    await goForward(before, 2)
    const after = reload(before)
    expect(cardPart(after, '.eyebrow')).toBe('第 3 步 · 轉乘')
  })

  it('記錄的步數超過這條路線時，停在最後一步', () => {
    savedSession({ from: '西門', to: '台北車站', navigating: true, step: 99 })
    const wrapper = mountApp()
    expect(cardPart(wrapper, '.eyebrow')).toBe('完成')
  })

  it('記錄的步數是負數時，從第 1 步開始', () => {
    savedSession({ from: '西門', to: '台北車站', navigating: true, step: -2 })
    const wrapper = mountApp()
    expect(cardPart(wrapper, '.eyebrow')).toBe('第 1 步 · 進站')
  })

  it('記錄的步數不是整數時，從第 1 步開始', () => {
    savedSession({ from: '西門', to: '台北車站', navigating: true, step: '2' })
    const wrapper = mountApp()
    expect(cardPart(wrapper, '.eyebrow')).toBe('第 1 步 · 進站')
  })

  it('沒有記錄步數時從第 1 步開始', () => {
    savedSession({ from: '西門', to: '台北車站', navigating: true })
    const wrapper = mountApp()
    expect(cardPart(wrapper, '.eyebrow')).toBe('第 1 步 · 進站')
  })

  it('記錄的站名已經認不出來時，停在查詢頁', () => {
    savedSession({ from: '火星', to: '台北車站', navigating: true, step: 1 })
    const wrapper = mountApp()
    expect(isNavigating(wrapper)).toBe(false)
  })
})

describe('瀏覽器不讓存資料時照常使用', () => {
  describe('讀不到資料時用預設起訖站', () => {
    function mountWithBlockedRead() {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      return mountApp()
    }

    it('起點是「龍山寺」', () => {
      expect(inputValue(mountWithBlockedRead(), 'from')).toBe('龍山寺')
    })

    it('終點是「劍南路」', () => {
      expect(inputValue(mountWithBlockedRead(), 'to')).toBe('劍南路')
    })
  })

  it('存不進去時照樣能開始導航', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const wrapper = mountApp()
    await startNavigation(wrapper, '西門', '台北車站')
    expect(isNavigating(wrapper)).toBe(true)
  })

  it('存不進去時，這次開著的期間仍記得最近查過', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const wrapper = mountApp()
    await startNavigation(wrapper, '西門', '台北車站')
    await clickButton(wrapper, '← 結束導航')
    expect(recentChips(wrapper)).toEqual(['西門 → 台北車站'])
  })

  describe('存的資料壞掉時用預設起訖站', () => {
    function mountWithBrokenData() {
      localStorage.setItem('mrt-nav', '{壞掉的 JSON')
      return mountApp()
    }

    it('起點是「龍山寺」', () => {
      expect(inputValue(mountWithBrokenData(), 'from')).toBe('龍山寺')
    })

    it('終點是「劍南路」', () => {
      expect(inputValue(mountWithBrokenData(), 'to')).toBe('劍南路')
    })
  })

  it('存的資料壞掉時，摘要照常顯示預設路線', () => {
    localStorage.setItem('mrt-nav', '{壞掉的 JSON')
    const wrapper = mountApp()
    expect(previewText(wrapper)).toContain('10站')
  })
})

// JSON 解析得了，但欄位型別不對（舊版本、手動改過、其他程式寫入）
describe('存的資料格式不對時照常使用', () => {
  it('起點不是文字時用預設起點', () => {
    savedSession({ from: 123, to: '台北車站' })
    expect(inputValue(mountApp(), 'from')).toBe('龍山寺')
  })

  it('終點不是文字時用預設終點', () => {
    savedSession({ from: '西門', to: ['台北車站'] })
    expect(inputValue(mountApp(), 'to')).toBe('劍南路')
  })

  it('最近查過不是陣列時，不顯示最近查過', () => {
    localStorage.setItem('mrt-recent', JSON.stringify({}))
    expect(recentChips(mountApp())).toEqual([])
  })

  it('最近查過不是陣列時，照樣能開始導航並記下這條路線', async () => {
    localStorage.setItem('mrt-recent', JSON.stringify({}))
    const wrapper = mountApp()
    await startNavigation(wrapper, '西門', '台北車站')
    await clickButton(wrapper, '← 結束導航')
    expect(recentChips(wrapper)).toEqual(['西門 → 台北車站'])
  })

  it('最近查過裡格式不對的項目略過，其他照常顯示', () => {
    const recent = [null, ['西門'], [1, 2], '古亭', ['西門', '台北車站']]
    localStorage.setItem('mrt-recent', JSON.stringify(recent))
    expect(recentChips(mountApp())).toEqual(['西門 → 台北車站'])
  })
})
