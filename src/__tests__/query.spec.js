// 查詢頁：使用者輸入起訖站 → 看到路線摘要 → 開始導航
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import {
  mountApp,
  inputValue,
  findButton,
  isNavigating,
  previewText,
  summaryText,
  legTexts,
  isListOpen,
  optionNames,
  optionCodes,
  activeOptionName,
  recentChips,
  typeInto,
  pressKey,
  setRoute,
  clickButton,
  startNavigation,
} from './helpers'

describe('第一次開啟', () => {
  it('起點預填「龍山寺」', () => {
    const wrapper = mountApp()
    expect(inputValue(wrapper, 'from')).toBe('龍山寺')
  })

  it('終點預填「劍南路」', () => {
    const wrapper = mountApp()
    expect(inputValue(wrapper, 'to')).toBe('劍南路')
  })

  it('沒有「最近查過」區塊', () => {
    const wrapper = mountApp()
    expect(wrapper.find('.recent').exists()).toBe(false)
  })
})

describe('路線摘要', () => {
  it('顯示總站數與轉乘次數', () => {
    const wrapper = mountApp()
    expect(summaryText(wrapper)).toBe('10站 1次轉乘')
  })

  it('逐段列出路線、起訖、方向與站數', () => {
    const wrapper = mountApp()
    expect(legTexts(wrapper)).toEqual([
      '板南線 龍山寺 → 忠孝復興 往 南港展覽館 方向 · 坐 5 站',
      '文湖線 忠孝復興 → 劍南路 往 南港展覽館 方向 · 坐 5 站',
    ])
  })

  it('改了起訖站不用離開輸入框，摘要就跟著重算', async () => {
    const wrapper = mountApp()
    await setRoute(wrapper, '西門', '台北車站')
    expect(legTexts(wrapper)).toEqual(['板南線 西門 → 台北車站 往 南港展覽館 方向 · 坐 1 站'])
  })

  it('同一段兩種列車都能搭時，方向列出兩個終點', async () => {
    const wrapper = mountApp()
    await setRoute(wrapper, '古亭', '民權西路')
    expect(legTexts(wrapper)).toEqual(['中和新蘆線 古亭 → 民權西路 往 迴龍／蘆洲 方向 · 坐 6 站'])
  })

  it('支線顯示支線名稱', async () => {
    const wrapper = mountApp()
    await setRoute(wrapper, '新北投', '北投')
    expect(legTexts(wrapper)).toEqual(['新北投支線 新北投 → 北投 往 北投 方向 · 坐 1 站'])
  })

  it('站數一樣多時，選轉乘次數少的路線', async () => {
    // 淡水 → 動物園：在大安轉文湖線（1 次轉乘），不走多轉一次的路線
    const wrapper = mountApp()
    await setRoute(wrapper, '淡水', '動物園')
    expect(legTexts(wrapper)).toEqual([
      '淡水信義線 淡水 → 大安 往 象山 方向 · 坐 23 站',
      '文湖線 大安 → 動物園 往 動物園 方向 · 坐 8 站',
    ])
  })

  it('需要多次轉乘時，每一段都列出來', async () => {
    const wrapper = mountApp()
    await setRoute(wrapper, '新北投', '小碧潭')
    expect(legTexts(wrapper)).toEqual([
      '新北投支線 新北投 → 北投 往 北投 方向 · 坐 1 站',
      '淡水信義線 北投 → 中正紀念堂 往 象山 方向 · 坐 14 站',
      '松山新店線 中正紀念堂 → 七張 往 新店 方向 · 坐 7 站',
      '小碧潭支線 七張 → 小碧潭 往 小碧潭 方向 · 坐 1 站',
    ])
  })

  it('轉乘次數照實計算', async () => {
    const wrapper = mountApp()
    await setRoute(wrapper, '新北投', '小碧潭')
    expect(summaryText(wrapper)).toBe('23站 3次轉乘')
  })

  it('起點空白時提示先選好起訖站', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '')
    expect(previewText(wrapper)).toBe('選好起點和終點，這裡會先列出要搭哪幾條線。')
  })

  it('站名認不出來時，也提示先選好起訖站', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'to', '火星')
    expect(previewText(wrapper)).toBe('選好起點和終點，這裡會先列出要搭哪幾條線。')
  })

  it('起訖站相同時提示不用搭車', async () => {
    const wrapper = mountApp()
    await setRoute(wrapper, '西門', 'BL11')
    expect(previewText(wrapper)).toBe('起點和終點是同一站，不用搭車喔。')
  })

  // 收錄的路線全部互相連通，使用者操作不到「找不到路線」
  it.todo('兩站之間沒有路線時提示找不到路線')
})

describe('頁尾說明', () => {
  it('轉乘換算的站數和找路時用的成本一致', () => {
    // 找路成本：坐一站 2、轉乘一次 7 → 轉乘一次約等於多坐 3.5 站
    const wrapper = mountApp()
    expect(wrapper.get('.note').text()).toContain('路線以「轉乘一次約等於多坐 3.5 站」估算')
  })
})

describe('開始導航按鈕', () => {
  it('有路線時可以按', () => {
    const wrapper = mountApp()
    expect(findButton(wrapper, '開始導航').element.disabled).toBe(false)
  })

  it('站名不完整時不能按', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '')
    expect(findButton(wrapper, '開始導航').element.disabled).toBe(true)
  })

  it('起訖站相同時不能按', async () => {
    const wrapper = mountApp()
    await setRoute(wrapper, '西門', '西門')
    expect(findButton(wrapper, '開始導航').element.disabled).toBe(true)
  })

  it('按下後進入導航頁', async () => {
    const wrapper = mountApp()
    await clickButton(wrapper, '開始導航')
    expect(isNavigating(wrapper)).toBe(true)
  })
})

describe('交換起點與終點', () => {
  it('起點換成原本的終點', async () => {
    const wrapper = mountApp()
    await wrapper.get('[aria-label="交換起點與終點"]').trigger('click')
    expect(inputValue(wrapper, 'from')).toBe('劍南路')
  })

  it('終點換成原本的起點', async () => {
    const wrapper = mountApp()
    await wrapper.get('[aria-label="交換起點與終點"]').trigger('click')
    expect(inputValue(wrapper, 'to')).toBe('龍山寺')
  })

  it('摘要改成反方向', async () => {
    const wrapper = mountApp()
    await wrapper.get('[aria-label="交換起點與終點"]').trigger('click')
    expect(legTexts(wrapper)[0]).toBe('文湖線 劍南路 → 忠孝復興 往 動物園 方向 · 坐 5 站')
  })
})

describe('離開輸入框時整理站名', () => {
  it.each([
    ['臺北車站', '台北車站'],
    [' 西門站 ', '西門'],
    ['bl11', '西門'],
    ['R22A', '新北投'],
  ])('「%s」整理成「%s」', async (typed, expected) => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', typed)
    await wrapper.get('#from').trigger('blur')
    expect(inputValue(wrapper, 'from')).toBe(expected)
  })

  it('認不出來的字保留原樣', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '火星')
    await wrapper.get('#from').trigger('blur')
    expect(inputValue(wrapper, 'from')).toBe('火星')
  })

  it('關閉下拉選單', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await wrapper.get('#from').trigger('blur')
    expect(isListOpen(wrapper, 'from')).toBe(false)
  })
})

describe('點進輸入框', () => {
  it('全選原本的站名，直接打字就能取代', async () => {
    const wrapper = mountApp()
    const input = wrapper.get('#from').element
    await wrapper.get('#from').trigger('focus')
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, '龍山寺'.length])
  })
})

describe('自動完成下拉選單', () => {
  it('打字前不顯示', () => {
    const wrapper = mountApp()
    expect(isListOpen(wrapper, 'from')).toBe(false)
  })

  it('打字後列出符合的站', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    expect(optionNames(wrapper, 'from')).toEqual(['大安', '大安森林公園'])
  })

  it('轉乘站列出每條線的車站代碼', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    expect(optionCodes(wrapper, 'from', '大安')).toEqual(['R05', 'BR09'])
  })

  it('站名開頭符合的排在只有包含的前面', async () => {
    // 「小南門」「松江南京」比「南勢角」等站先建立，但只是包含「南」，要排最後
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '南')
    expect(optionNames(wrapper, 'from')).toEqual([
      '南京復興',
      '南京三民',
      '南勢角',
      '南港',
      '南港展覽館',
      '南港軟體園區',
      '小南門',
      '松江南京',
    ])
  })

  it('完全符合的站排第一', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '南港')
    expect(optionNames(wrapper, 'from')[0]).toBe('南港')
  })

  it('多打「站」字也找得到', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '中和站')
    expect(optionNames(wrapper, 'from')).toEqual(['中和'])
  })

  it('只打一個「站」字時，列出站名有「站」的站', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '站')
    expect(optionNames(wrapper, 'from')).toEqual(['台北車站'])
  })

  it('可以用車站代碼開頭搜尋', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', 'r2')
    expect(optionNames(wrapper, 'from')).toEqual([
      '唭哩岸',
      '奇岩',
      '北投',
      '復興崗',
      '忠義',
      '關渡',
      '竹圍',
      '紅樹林',
    ])
  })

  it('最多列 8 站', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', 'BL1')
    expect(optionNames(wrapper, 'from')).toHaveLength(8)
  })

  it('沒有符合的站就不顯示', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '火星')
    expect(isListOpen(wrapper, 'from')).toBe(false)
  })

  it('點選後填入站名', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await wrapper.findAll('#from-list button')[1].trigger('click')
    expect(inputValue(wrapper, 'from')).toBe('大安森林公園')
  })

  it('點選後收起選單', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await wrapper.findAll('#from-list button')[1].trigger('click')
    expect(isListOpen(wrapper, 'from')).toBe(false)
  })

  it('手指按住選單時輸入框失焦，選單不會先關掉', async () => {
    // blur 比 click 早發生：按住選單 → 輸入框 blur → 才 click
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await wrapper.get('#from-list').trigger('pointerdown')
    await wrapper.get('#from').trigger('blur')
    expect(isListOpen(wrapper, 'from')).toBe(true)
  })

  describe('手指在選單上滑開沒選，之後點別處', () => {
    async function slideOffThenTapElsewhere() {
      const wrapper = mountApp()
      await typeInto(wrapper, 'from', 'bl11')
      await wrapper.get('#from-list').trigger('pointerdown')
      await wrapper.get('#from').trigger('blur')
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await nextTick()
      return wrapper
    }

    it('整理站名', async () => {
      const wrapper = await slideOffThenTapElsewhere()
      expect(inputValue(wrapper, 'from')).toBe('西門')
    })

    it('收起選單', async () => {
      const wrapper = await slideOffThenTapElsewhere()
      expect(isListOpen(wrapper, 'from')).toBe(false)
    })
  })

  describe('手指按住選單後滑回輸入框，繼續輸入不被打斷', () => {
    // 按住選單時有 mousedown.prevent，輸入框沒有真的失焦
    async function slideBackToInput() {
      const wrapper = mountApp()
      wrapper.get('#from').element.focus()
      await typeInto(wrapper, 'from', 'bl11')
      await wrapper.get('#from-list').trigger('pointerdown')
      await wrapper.get('#from').trigger('pointerdown')
      return wrapper
    }

    it('不整理站名', async () => {
      const wrapper = await slideBackToInput()
      expect(inputValue(wrapper, 'from')).toBe('bl11')
    })

    it('選單維持打開', async () => {
      const wrapper = await slideBackToInput()
      expect(isListOpen(wrapper, 'from')).toBe(true)
    })
  })

  it('沒按住選單時點別處，不會動到站名', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', 'bl11')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(inputValue(wrapper, 'from')).toBe('bl11')
  })
})

describe('用鍵盤操作下拉選單', () => {
  it('一開始停在第一個選項', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    expect(activeOptionName(wrapper, 'from')).toBe('大安')
  })

  it('↓ 移到下一個選項', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await pressKey(wrapper, 'from', 'ArrowDown')
    expect(activeOptionName(wrapper, 'from')).toBe('大安森林公園')
  })

  it('↓ 到最後一個就停住', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await pressKey(wrapper, 'from', 'ArrowDown')
    await pressKey(wrapper, 'from', 'ArrowDown')
    expect(activeOptionName(wrapper, 'from')).toBe('大安森林公園')
  })

  it('↑ 回到上一個選項', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await pressKey(wrapper, 'from', 'ArrowDown')
    await pressKey(wrapper, 'from', 'ArrowUp')
    expect(activeOptionName(wrapper, 'from')).toBe('大安')
  })

  it('↑ 到第一個就停住', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await pressKey(wrapper, 'from', 'ArrowUp')
    expect(activeOptionName(wrapper, 'from')).toBe('大安')
  })

  it('再打字時回到第一個選項', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await pressKey(wrapper, 'from', 'ArrowDown')
    await typeInto(wrapper, 'from', '大安森')
    expect(activeOptionName(wrapper, 'from')).toBe('大安森林公園')
  })

  it('Enter 填入目前的選項', async () => {
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await pressKey(wrapper, 'from', 'ArrowDown')
    await pressKey(wrapper, 'from', 'Enter')
    expect(inputValue(wrapper, 'from')).toBe('大安森林公園')
  })

  describe('注音選字中按 Enter 不搶走選字', () => {
    async function enterWhileComposing() {
      const wrapper = mountApp()
      await typeInto(wrapper, 'from', '大安')
      await pressKey(wrapper, 'from', 'ArrowDown')
      await pressKey(wrapper, 'from', 'Enter', { isComposing: true })
      return wrapper
    }

    it('站名不變', async () => {
      const wrapper = await enterWhileComposing()
      expect(inputValue(wrapper, 'from')).toBe('大安')
    })

    it('選單維持打開', async () => {
      const wrapper = await enterWhileComposing()
      expect(isListOpen(wrapper, 'from')).toBe(true)
    })
  })

  describe('Esc', () => {
    async function pressEscape() {
      const wrapper = mountApp()
      await typeInto(wrapper, 'from', '大安')
      await pressKey(wrapper, 'from', 'ArrowDown')
      await pressKey(wrapper, 'from', 'Escape')
      return wrapper
    }

    it('關閉選單', async () => {
      const wrapper = await pressEscape()
      expect(isListOpen(wrapper, 'from')).toBe(false)
    })

    it('站名不變', async () => {
      const wrapper = await pressEscape()
      expect(inputValue(wrapper, 'from')).toBe('大安')
    })
  })

  it('選單關著時按 Enter 不會填入選項', async () => {
    // 先停在第二個選項再關掉，Enter 若沒被擋住就會填入「大安森林公園」
    const wrapper = mountApp()
    await typeInto(wrapper, 'from', '大安')
    await pressKey(wrapper, 'from', 'ArrowDown')
    await pressKey(wrapper, 'from', 'Escape')
    await pressKey(wrapper, 'from', 'Enter')
    expect(inputValue(wrapper, 'from')).toBe('大安')
  })
})

describe('最近查過', () => {
  async function finishTrip(wrapper, from, to) {
    await startNavigation(wrapper, from, to)
    await clickButton(wrapper, '← 結束導航')
  }

  it('開始導航過的路線出現在最近查過', async () => {
    const wrapper = mountApp()
    await finishTrip(wrapper, '西門', '台北車站')
    expect(recentChips(wrapper)).toEqual(['西門 → 台北車站'])
  })

  it('記錄的是整理過的正式站名', async () => {
    const wrapper = mountApp()
    await finishTrip(wrapper, 'bl11', '臺北車站')
    expect(recentChips(wrapper)).toEqual(['西門 → 台北車站'])
  })

  it('最新的排最前面', async () => {
    const wrapper = mountApp()
    await finishTrip(wrapper, '西門', '台北車站')
    await finishTrip(wrapper, '古亭', '民權西路')
    expect(recentChips(wrapper)).toEqual(['古亭 → 民權西路', '西門 → 台北車站'])
  })

  it('同一條路線再查一次，移到最前面且不重複', async () => {
    const wrapper = mountApp()
    await finishTrip(wrapper, '西門', '台北車站')
    await finishTrip(wrapper, '古亭', '民權西路')
    await finishTrip(wrapper, '西門', '台北車站')
    expect(recentChips(wrapper)).toEqual(['西門 → 台北車站', '古亭 → 民權西路'])
  })

  it('同起點、不同終點算不同路線', async () => {
    const wrapper = mountApp()
    await finishTrip(wrapper, '西門', '台北車站')
    await finishTrip(wrapper, '西門', '市政府')
    expect(recentChips(wrapper)).toEqual(['西門 → 市政府', '西門 → 台北車站'])
  })

  it('反方向算不同路線', async () => {
    const wrapper = mountApp()
    await finishTrip(wrapper, '西門', '台北車站')
    await finishTrip(wrapper, '台北車站', '西門')
    expect(recentChips(wrapper)).toEqual(['台北車站 → 西門', '西門 → 台北車站'])
  })

  it('只留最近 4 條', async () => {
    const wrapper = mountApp()
    await finishTrip(wrapper, '西門', '台北車站')
    await finishTrip(wrapper, '古亭', '民權西路')
    await finishTrip(wrapper, '淡水', '動物園')
    await finishTrip(wrapper, '新北投', '小碧潭')
    await finishTrip(wrapper, '南勢角', '蘆洲')
    expect(recentChips(wrapper)).toEqual([
      '南勢角 → 蘆洲',
      '新北投 → 小碧潭',
      '淡水 → 動物園',
      '古亭 → 民權西路',
    ])
  })

  it('點一下就帶入起點', async () => {
    const wrapper = mountApp()
    await finishTrip(wrapper, '西門', '台北車站')
    await setRoute(wrapper, '淡水', '動物園')
    await clickButton(wrapper, '西門 → 台北車站')
    expect(inputValue(wrapper, 'from')).toBe('西門')
  })

  it('點一下就帶入終點', async () => {
    const wrapper = mountApp()
    await finishTrip(wrapper, '西門', '台北車站')
    await setRoute(wrapper, '淡水', '動物園')
    await clickButton(wrapper, '西門 → 台北車站')
    expect(inputValue(wrapper, 'to')).toBe('台北車站')
  })
})
