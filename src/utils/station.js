import { STATIONS } from '../data/metro'

// 統一寫法：臺 → 台、去掉所有空白
const normalizeText = (text) => (text || '').replace(/臺/g, '台').replace(/\s/g, '')

// 使用者常多打一個「站」字
const stripStationSuffix = (query) => query.replace(/站$/, '')

const hasStationCode = (station, code) => station.codes.some((entry) => entry.code === code)

// 把使用者輸入轉成正式站名，找不到回傳 null
// 支援：完整站名、多打一個「站」字、車站代碼（BL11）
export function resolveStationName(text) {
  const query = normalizeText(text)
  if (!query) return null
  if (STATIONS.has(query)) return query

  const nameWithoutSuffix = stripStationSuffix(query)
  if (STATIONS.has(nameWithoutSuffix)) return nameWithoutSuffix

  const codeQuery = query.toUpperCase()
  for (const station of STATIONS.values()) {
    if (hasStationCode(station, codeQuery)) return station.name
  }
  return null
}

// 下拉選單排序用：完全符合 0 > 開頭符合 1 > 代碼開頭 2 > 包含 3，不符合 -1
function scoreStationMatch(station, query, nameQuery, codeQuery) {
  if (station.name === query || station.name === nameQuery || hasStationCode(station, codeQuery)) return 0
  if (station.name.startsWith(nameQuery)) return 1
  if (station.codes.some((entry) => entry.code.startsWith(codeQuery))) return 2
  if (station.name.includes(nameQuery)) return 3
  return -1
}

// 下拉選單用：依符合程度排序，最多 limit 站
export function searchStations(text, limit = 8) {
  const query = normalizeText(text)
  if (!query) return []
  const nameQuery = stripStationSuffix(query) || query
  const codeQuery = query.toUpperCase()
  return [...STATIONS.values()]
    .map((station) => ({ station, score: scoreStationMatch(station, query, nameQuery, codeQuery) }))
    .filter((match) => match.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((match) => match.station)
}

// 某站在某條線上的代碼，例如 getStationCode('西門', 'BL') → 'BL11'
export function getStationCode(stationName, lineId) {
  return STATIONS.get(stationName)?.codes.find((entry) => entry.line === lineId)?.code || ''
}
