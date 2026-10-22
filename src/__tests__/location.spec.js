// 用目前位置當起點：按下按鈕 → 瀏覽器回報位置 → 填入最近的站
// mock 邊界：只換掉 jsdom 沒有的 navigator.geolocation，找站邏輯真實執行
import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { STATION_COORDS } from '../data/stationCoords'
import { mountApp, inputValue, textOf, findButton, clickButton } from './helpers'

const LOCATE_LABEL = '用目前位置當起點'
const [XIMEN_LAT, XIMEN_LNG] = STATION_COORDS['西門']
const KAOHSIUNG = { latitude: 22.6273, longitude: 120.3014 }

// GeolocationPositionError 的代碼
const PERMISSION_DENIED = 1
const POSITION_UNAVAILABLE = 2
const TIMEOUT = 3

function mockGeolocation(getCurrentPosition) {
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
}

function mockPosition({ latitude, longitude, accuracy = 15 }) {
  mockGeolocation(vi.fn((onSuccess) => onSuccess({ coords: { latitude, longitude, accuracy } })))
}

function mockPositionError(code) {
  mockGeolocation(vi.fn((onSuccess, onError) => onError({ code })))
}

async function locate(wrapper) {
  await clickButton(wrapper, LOCATE_LABEL)
  await flushPromises()
}

const locateMessage = (wrapper) => textOf(wrapper.get('.locate-msg'))

// 附近車站一顆一顆讀，站名和距離用空白隔開：['西門 不到 50 公尺', '北門 約 760 公尺', …]
const chipText = (button) => button.findAll('span').map(textOf).join(' ')
const nearbyChips = (wrapper) => wrapper.findAll('.nearby button').map(chipText)

afterEach(() => {
  delete navigator.geolocation
})

describe('定位成功', () => {
  it('起點換成離目前位置最近的站', async () => {
    mockPosition({ latitude: XIMEN_LAT, longitude: XIMEN_LNG })
    const wrapper = mountApp()
    await locate(wrapper)
    expect(inputValue(wrapper, 'from')).toBe('西門')
  })

  it('告訴使用者已經設好哪一站', async () => {
    mockPosition({ latitude: XIMEN_LAT, longitude: XIMEN_LNG })
    const wrapper = mountApp()
    await locate(wrapper)
    expect(locateMessage(wrapper)).toBe('離你最近的是「西門」，已設為起點')
  })

  it('列出附近 3 站和距離，可以改選', async () => {
    mockPosition({ latitude: XIMEN_LAT, longitude: XIMEN_LNG })
    const wrapper = mountApp()
    await locate(wrapper)
    expect(nearbyChips(wrapper)).toEqual(['西門 不到 50 公尺', '北門 約 760 公尺', '台大醫院 約 770 公尺'])
  })

  it('點附近的另一站，起點就換成那一站', async () => {
    mockPosition({ latitude: XIMEN_LAT, longitude: XIMEN_LNG })
    const wrapper = mountApp()
    await locate(wrapper)
    await wrapper.findAll('.nearby button')[1].trigger('click')
    expect(inputValue(wrapper, 'from')).toBe('北門')
  })

  it('目前的起點在附近車站中標示為已選', async () => {
    mockPosition({ latitude: XIMEN_LAT, longitude: XIMEN_LNG })
    const wrapper = mountApp()
    await locate(wrapper)
    const pressed = wrapper.findAll('.nearby button[aria-pressed="true"]').map(chipText)
    expect(pressed).toEqual(['西門 不到 50 公尺'])
  })

  it('定位誤差很大時提醒使用者確認', async () => {
    mockPosition({ latitude: XIMEN_LAT, longitude: XIMEN_LNG, accuracy: 820 })
    const wrapper = mountApp()
    await locate(wrapper)
    expect(locateMessage(wrapper)).toBe('定位誤差約 820 公尺，已先設為「西門」，請確認是不是這一站')
  })

  it('附近 2 公里內沒有捷運站時不改起點', async () => {
    mockPosition(KAOHSIUNG)
    const wrapper = mountApp()
    await locate(wrapper)
    expect(inputValue(wrapper, 'from')).toBe('龍山寺')
    expect(locateMessage(wrapper)).toBe('附近 2 公里內沒有捷運站，請直接輸入站名')
  })
})

describe('定位中', () => {
  it('按鈕顯示「定位中…」且不能重複按', async () => {
    mockGeolocation(vi.fn()) // 瀏覽器一直沒回應
    const wrapper = mountApp()
    await clickButton(wrapper, LOCATE_LABEL)
    const button = findButton(wrapper, '定位中…')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('要求高精準度、10 秒逾時', async () => {
    const getCurrentPosition = vi.fn()
    mockGeolocation(getCurrentPosition)
    const wrapper = mountApp()
    await clickButton(wrapper, LOCATE_LABEL)
    expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, timeout: 10000 })
  })
})

describe('定位失敗', () => {
  it.each([
    [PERMISSION_DENIED, '沒有定位權限，請在瀏覽器設定允許定位，或直接輸入站名'],
    [POSITION_UNAVAILABLE, '目前抓不到位置（在地下或室內常發生），請直接輸入站名'],
    [TIMEOUT, '定位逾時，請再試一次或直接輸入站名'],
  ])('錯誤代碼 %i 顯示對應的說明', async (code, message) => {
    mockPositionError(code)
    const wrapper = mountApp()
    await locate(wrapper)
    expect(locateMessage(wrapper)).toBe(message)
  })

  it('失敗時起點維持原樣', async () => {
    mockPositionError(PERMISSION_DENIED)
    const wrapper = mountApp()
    await locate(wrapper)
    expect(inputValue(wrapper, 'from')).toBe('龍山寺')
  })

  it('失敗後可以再按一次重試', async () => {
    mockPositionError(TIMEOUT)
    const wrapper = mountApp()
    await locate(wrapper)
    mockPosition({ latitude: XIMEN_LAT, longitude: XIMEN_LNG })
    await locate(wrapper)
    expect(inputValue(wrapper, 'from')).toBe('西門')
  })

  it('瀏覽器不支援定位時說明原因', async () => {
    const wrapper = mountApp()
    await locate(wrapper)
    expect(locateMessage(wrapper)).toBe('這個瀏覽器不支援定位，請直接輸入站名')
  })
})
