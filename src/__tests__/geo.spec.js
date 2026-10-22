// 找最近的車站：純函式，直接用真實的座標資料
import { describe, it, expect } from 'vitest'
import { STATIONS } from '../data/metro'
import { STATION_COORDS } from '../data/stationCoords'
import { distanceInMeters, findNearbyStations, formatDistance } from '../utils/geo'

const XIMEN = STATION_COORDS['西門']
const TAMSUI = STATION_COORDS['淡水']
const KAOHSIUNG = [22.6273, 120.3014]

const names = (stations) => stations.map((station) => station.name)

describe('座標資料', () => {
  it('路網裡每一站都有座標', () => {
    const missing = [...STATIONS.keys()].filter((name) => !STATION_COORDS[name])
    expect(missing).toEqual([])
  })

  it('沒有路網以外的站名（站名打錯會配不到）', () => {
    const unknown = Object.keys(STATION_COORDS).filter((name) => !STATIONS.has(name))
    expect(unknown).toEqual([])
  })
})

describe('distanceInMeters', () => {
  it('同一點距離為 0', () => {
    expect(distanceInMeters(XIMEN, XIMEN)).toBe(0)
  })

  it('西門到台北車站約 900 公尺', () => {
    expect(distanceInMeters(XIMEN, STATION_COORDS['台北車站'])).toBeCloseTo(906, -1)
  })
})

describe('findNearbyStations', () => {
  it('由近到遠列出最近的 3 站', () => {
    expect(names(findNearbyStations(XIMEN))).toEqual(['西門', '北門', '台大醫院'])
  })

  it('每站附上距離（公尺）', () => {
    const [nearest, second] = findNearbyStations(XIMEN)
    expect(nearest.distance).toBe(0)
    expect(second.distance).toBeCloseTo(764, -1)
  })

  it('可以指定最多幾站', () => {
    expect(names(findNearbyStations(XIMEN, { limit: 1 }))).toEqual(['西門'])
  })

  it('超過 2 公里的站不列入', () => {
    expect(names(findNearbyStations(TAMSUI))).toEqual(['淡水', '紅樹林'])
  })

  it('附近完全沒有捷運站時回傳空陣列', () => {
    expect(findNearbyStations(KAOHSIUNG)).toEqual([])
  })
})

describe('formatDistance', () => {
  it('很近時不報精確數字', () => {
    expect(formatDistance(0)).toBe('不到 50 公尺')
  })

  it('一公里內以 10 公尺為單位', () => {
    expect(formatDistance(764)).toBe('約 760 公尺')
  })

  it('一公里以上換成公里，取到小數一位', () => {
    expect(formatDistance(1234)).toBe('約 1.2 公里')
  })

  it('整數公里不顯示 .0', () => {
    expect(formatDistance(1959)).toBe('約 2 公里')
  })
})
