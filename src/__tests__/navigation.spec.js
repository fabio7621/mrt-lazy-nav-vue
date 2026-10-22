// 導航頁：一次只顯示下一步，使用者按「我上車了／我下車了」往前走
import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import {
  mountApp,
  inputValue,
  findButton,
  isNavigating,
  cardPart,
  stopRows,
  upNext,
  routeLabel,
  primaryLabel,
  clickButton,
  startNavigation,
  goForward,
} from './helpers'

// 從查詢頁開始導航，再往前走 forward 步
async function navigateTo(from, to, forward = 0) {
  const wrapper = mountApp()
  await startNavigation(wrapper, from, to)
  await goForward(wrapper, forward)
  return wrapper
}

describe('導航頁標頭', () => {
  it('顯示這趟的起訖站', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(routeLabel(wrapper)).toBe('龍山寺 → 劍南路')
  })

  it('進度條每個動作一格：上車、乘車、轉乘、乘車、抵達', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(wrapper.findAll('.progress span')).toHaveLength(5)
  })

  it('開始導航時捲回頁首', async () => {
    await navigateTo('龍山寺', '劍南路')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })
})

describe('第 1 步：進站上車', () => {
  it('標示步驟', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(cardPart(wrapper, '.eyebrow')).toBe('第 1 步 · 進站')
  })

  it('在哪一站上車', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(cardPart(wrapper, '.where strong')).toBe('龍山寺')
  })

  it('附上這條線的車站代碼', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(cardPart(wrapper, '.where .code')).toBe('BL10')
  })

  it('搭哪條線', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(cardPart(wrapper, '.big')).toBe('搭 板南線')
  })

  it('往哪個方向', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(cardPart(wrapper, '.dir-name')).toBe('南港展覽館')
  })

  it('提示找路線顏色的指標', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(cardPart(wrapper, '.tip')).toBe(
      '進站後找藍色的「板南線」指標，月台上寫著「往 南港展覽館」的那一側。',
    )
  })

  it('不顯示「不用出站」', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(cardPart(wrapper, '.where')).not.toContain('不用出站')
  })

  it('主按鈕是「我上車了」', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(primaryLabel(wrapper)).toBe('我上車了')
  })

  it('「上一步」不能按', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(findButton(wrapper, '上一步').element.disabled).toBe(true)
  })

  it('預告下一步要坐幾站、在哪下車', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    expect(upNext(wrapper)).toBe('坐 5 站，在忠孝復興下車')
  })

  it('支線顯示支線名稱', async () => {
    const wrapper = await navigateTo('新北投', '北投')
    expect(cardPart(wrapper, '.big')).toBe('搭 新北投支線')
  })

  it('兩種列車都能搭時，方向列出兩個終點', async () => {
    const wrapper = await navigateTo('古亭', '民權西路')
    expect(cardPart(wrapper, '.dir-name')).toBe('迴龍／蘆洲')
  })
})

describe('第 2 步：乘車', () => {
  it('標示步驟與路線', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    expect(cardPart(wrapper, '.eyebrow')).toBe('第 2 步 · 乘車 · 板南線')
  })

  it('大字顯示要坐幾站', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    expect(cardPart(wrapper, '.count .num')).toBe('5')
  })

  it('在哪一站下車', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    expect(cardPart(wrapper, '.where strong')).toBe('忠孝復興')
  })

  it('附上下車站在這條線的代碼', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    expect(cardPart(wrapper, '.where .code')).toBe('BL15')
  })

  it('列出沿途每一站，標出上車、下一站、下車', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    expect(stopRows(wrapper)).toEqual([
      '龍山寺 上車',
      '西門 下一站',
      '台北車站',
      '善導寺',
      '忠孝新生',
      '忠孝復興 下車',
    ])
  })

  it('提示聽到前一站廣播就準備下車', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    expect(cardPart(wrapper, '.tip')).toBe('聽到「忠孝新生」到站後，下一站就要下車。')
  })

  it('只坐一站時，提示先往車門移動', async () => {
    const wrapper = await navigateTo('西門', '台北車站', 1)
    expect(cardPart(wrapper, '.tip')).toBe('下一站就要下車，可以先往車門移動。')
  })

  it('只坐一站時，沿途只有上車站和下車站', async () => {
    const wrapper = await navigateTo('西門', '台北車站', 1)
    expect(stopRows(wrapper)).toEqual(['西門 上車', '台北車站 下車'])
  })

  it('主按鈕是「我下車了」', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    expect(primaryLabel(wrapper)).toBe('我下車了')
  })

  it('預告下一步在哪轉乘、往哪個方向', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    expect(upNext(wrapper)).toBe('在忠孝復興轉文湖線，往南港展覽館')
  })
})

describe('沿途站很多時折起來', () => {
  it('剛好 7 站時全部列出', async () => {
    const wrapper = await navigateTo('古亭', '民權西路', 1)
    expect(stopRows(wrapper)).toHaveLength(7)
  })

  it('8 站以上只留頭兩站和最後三站，中間折起來', async () => {
    const wrapper = await navigateTo('西門', '市政府', 1)
    expect(stopRows(wrapper)).toEqual([
      '西門 上車',
      '台北車站 下一站',
      '中間還有 3 站 · 展開',
      '忠孝敦化',
      '國父紀念館',
      '市政府 下車',
    ])
  })

  it('按「展開」列出全部的站', async () => {
    const wrapper = await navigateTo('淡水', '動物園', 1)
    await clickButton(wrapper, '中間還有 19 站 · 展開')
    expect(stopRows(wrapper)).toHaveLength(24)
  })

  it('換到別的步驟再回來，又折起來', async () => {
    const wrapper = await navigateTo('淡水', '動物園', 1)
    await clickButton(wrapper, '中間還有 19 站 · 展開')
    await goForward(wrapper)
    await clickButton(wrapper, '上一步')
    expect(stopRows(wrapper)).toHaveLength(6)
  })
})

describe('第 3 步：轉乘', () => {
  it('標示步驟', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 2)
    expect(cardPart(wrapper, '.eyebrow')).toBe('第 3 步 · 轉乘')
  })

  it('在哪一站轉乘', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 2)
    expect(cardPart(wrapper, '.where strong')).toBe('忠孝復興')
  })

  it('附上要轉的線的代碼', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 2)
    expect(cardPart(wrapper, '.where .code')).toBe('BR10')
  })

  it('提醒不用出站', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 2)
    expect(cardPart(wrapper, '.where')).toContain('不用出站')
  })

  it('轉哪條線', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 2)
    expect(cardPart(wrapper, '.big')).toBe('轉 文湖線')
  })

  it('提示跟著轉乘指標走', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 2)
    expect(cardPart(wrapper, '.tip')).toBe(
      '下車後跟著棕色的轉乘指標走，到「往 南港展覽館」的月台候車。',
    )
  })

  it('同一條線換分支時，也算一次轉乘', async () => {
    const wrapper = await navigateTo('迴龍', '蘆洲', 2)
    expect(cardPart(wrapper, '.big')).toBe('轉 中和新蘆線')
  })

  it('同一條線換分支時，代碼是分岔站的代碼', async () => {
    const wrapper = await navigateTo('迴龍', '蘆洲', 2)
    expect(cardPart(wrapper, '.where .code')).toBe('O12')
  })

  it('主按鈕是「我上車了」', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 2)
    expect(primaryLabel(wrapper)).toBe('我上車了')
  })
})

describe('最後一步：抵達', () => {
  it('標示完成', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 4)
    expect(cardPart(wrapper, '.eyebrow')).toBe('完成')
  })

  it('抵達哪一站', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 4)
    expect(cardPart(wrapper, '.big')).toBe('抵達 劍南路')
  })

  it('總結這趟的站數與轉乘次數', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 4)
    expect(cardPart(wrapper, '.tip')).toBe('這趟共坐 10 站、轉乘 1 次。出站時記得刷卡。')
  })

  it('乘車前一步預告抵達', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 3)
    expect(upNext(wrapper)).toBe('抵達劍南路')
  })

  it('沒有下一步預告', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 4)
    expect(upNext(wrapper)).toBeNull()
  })

  it('主按鈕是「再查一條路線」', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 4)
    expect(primaryLabel(wrapper)).toBe('再查一條路線')
  })

  it('按「再查一條路線」回到查詢頁', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 4)
    await clickButton(wrapper, '再查一條路線')
    expect(isNavigating(wrapper)).toBe(false)
  })
})

describe('上一步', () => {
  it('回到前一個動作', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 2)
    await clickButton(wrapper, '上一步')
    expect(cardPart(wrapper, '.eyebrow')).toBe('第 2 步 · 乘車 · 板南線')
  })
})

describe('結束導航', () => {
  it('回到查詢頁', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 2)
    await clickButton(wrapper, '← 結束導航')
    expect(isNavigating(wrapper)).toBe(false)
  })

  it('起點保留剛才的站', async () => {
    const wrapper = await navigateTo('西門', '台北車站')
    await clickButton(wrapper, '← 結束導航')
    expect(inputValue(wrapper, 'from')).toBe('西門')
  })

  it('終點保留剛才的站', async () => {
    const wrapper = await navigateTo('西門', '台北車站')
    await clickButton(wrapper, '← 結束導航')
    expect(inputValue(wrapper, 'to')).toBe('台北車站')
  })

  it('捲回頁首', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路')
    window.scrollTo.mockClear()
    await clickButton(wrapper, '← 結束導航')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('再開始導航時從第 1 步開始', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 3)
    await clickButton(wrapper, '← 結束導航')
    await clickButton(wrapper, '開始導航')
    expect(cardPart(wrapper, '.eyebrow')).toBe('第 1 步 · 進站')
  })
})

// 螢幕常亮：瀏覽器的 Wake Lock API，jsdom 沒有實作，屬於要隔離的 BOM
describe('導航中保持螢幕常亮', () => {
  let visibility = 'visible'

  function installWakeLock(request) {
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    Object.defineProperty(document, 'visibilityState', {
      get: () => visibility,
      configurable: true,
    })
  }

  function switchTab(state) {
    visibility = state
    document.dispatchEvent(new Event('visibilitychange'))
  }

  afterEach(() => {
    delete navigator.wakeLock
    delete document.visibilityState
    visibility = 'visible'
  })

  it('開始導航時要求螢幕常亮', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn() })
    installWakeLock(request)
    await navigateTo('龍山寺', '劍南路')
    expect(request).toHaveBeenCalledWith('screen')
  })

  it('結束導航時放掉常亮', async () => {
    const lock = { release: vi.fn() }
    installWakeLock(vi.fn().mockResolvedValue(lock))
    const wrapper = await navigateTo('龍山寺', '劍南路')
    await flushPromises()
    await clickButton(wrapper, '← 結束導航')
    expect(lock.release).toHaveBeenCalledOnce()
  })

  it('瀏覽器還沒答應就結束導航，答應後立刻放掉常亮', async () => {
    const lock = { release: vi.fn() }
    let grant
    installWakeLock(vi.fn(() => new Promise((resolve) => (grant = resolve))))
    const wrapper = await navigateTo('龍山寺', '劍南路')
    await clickButton(wrapper, '← 結束導航')
    grant(lock)
    await flushPromises()
    expect(lock.release).toHaveBeenCalledOnce()
  })

  it('切回這個分頁時重新要求常亮', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn() })
    installWakeLock(request)
    await navigateTo('龍山寺', '劍南路')
    switchTab('hidden')
    switchTab('visible')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('切走分頁時不要求常亮', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn() })
    installWakeLock(request)
    await navigateTo('龍山寺', '劍南路')
    switchTab('hidden')
    expect(request).toHaveBeenCalledOnce()
  })

  it('離開導航頁後切換分頁，不再要求常亮', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn() })
    installWakeLock(request)
    const wrapper = await navigateTo('龍山寺', '劍南路')
    await clickButton(wrapper, '← 結束導航')
    switchTab('hidden')
    switchTab('visible')
    expect(request).toHaveBeenCalledOnce()
  })

  it('瀏覽器拒絕時照常導航', async () => {
    installWakeLock(vi.fn().mockRejectedValue(new Error('NotAllowedError')))
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    await flushPromises()
    expect(cardPart(wrapper, '.eyebrow')).toBe('第 2 步 · 乘車 · 板南線')
  })

  it('瀏覽器拒絕後結束導航不會出錯', async () => {
    installWakeLock(vi.fn().mockRejectedValue(new Error('NotAllowedError')))
    const wrapper = await navigateTo('龍山寺', '劍南路')
    await flushPromises()
    await clickButton(wrapper, '← 結束導航')
    expect(isNavigating(wrapper)).toBe(false)
  })

  it('瀏覽器不支援時照常導航', async () => {
    const wrapper = await navigateTo('龍山寺', '劍南路', 1)
    await flushPromises()
    expect(primaryLabel(wrapper)).toBe('我下車了')
  })
})
