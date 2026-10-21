import { LINES, SERVICES, SVC } from '../data/metro'

// 成本設定：坐一站約 2 分鐘，轉乘一次約 7 分鐘
// 轉乘有額外成本，演算法才會避開「站數一樣但多轉一次」的路線
export const RIDE_COST = 2
export const TRANSFER_COST = 7

// 節點不是「車站」，而是「車站 + 正在搭的列車」，例如「西門|BL」
const nodeKey = (station, svc) => `${station}|${svc}`
const parseKey = (k) => k.split('|')

/**
 * 找出起訖站之間成本最低的路線，找不到回傳 null
 * 在同一站換到另一條線，就是一條成本 = TRANSFER_COST 的邊
 */
export function findRoute(from, to) {
  const { goal, prev } = shortestPath(from, to)
  if (!goal) return null

  const legs = groupLegs(tracePath(goal, prev)).map(legInfo)
  return {
    legs,
    stations: legs.reduce((n, l) => n + l.count, 0),
    transfers: legs.length - 1,
  }
}

// Dijkstra 最短路徑：回傳終點節點，以及每個節點是從哪個節點走過來的
function shortestPath(from, to) {
  const dist = new Map()
  const prev = new Map()
  const done = new Set()
  const open = startNodes(from)
  for (const k of open) dist.set(k, 0)

  while (open.length) {
    const k = popCheapest(open, dist)
    if (done.has(k)) continue
    done.add(k)
    if (parseKey(k)[0] === to) return { goal: k, prev }

    for (const [nk, cost] of neighborsOf(k)) {
      if (done.has(nk)) continue
      const nd = dist.get(k) + cost
      if (!dist.has(nk) || nd < dist.get(nk)) {
        dist.set(nk, nd)
        prev.set(nk, k)
        open.push(nk)
      }
    }
  }
  return { goal: null, prev }
}

// 起點站有停的每一種列車，都是成本 0 的起始節點
function startNodes(station) {
  return SERVICES.filter((s) => s.names.includes(station)).map((s) => nodeKey(station, s.id))
}

// 取出目前成本最小的節點（資料量小，直接線性找即可）
function popCheapest(open, dist) {
  let best = 0
  for (let i = 1; i < open.length; i++) {
    if (dist.get(open[i]) < dist.get(open[best])) best = i
  }
  return open.splice(best, 1)[0]
}

// 相鄰節點：同一班車的前一站、後一站（坐一站），以及同站的其他列車（轉乘）
// 順序會影響同成本時選哪條，維持「前一站 → 後一站 → 轉乘」
function neighborsOf(k) {
  const [station, svcId] = parseKey(k)
  const names = SVC[svcId].names
  const i = names.indexOf(station)
  const rides = [names[i - 1], names[i + 1]]
    .filter((name) => name !== undefined)
    .map((name) => [nodeKey(name, svcId), RIDE_COST])
  const transfers = SERVICES.filter((o) => o.id !== svcId && o.names.includes(station)).map(
    (o) => [nodeKey(station, o.id), TRANSFER_COST],
  )
  return [...rides, ...transfers]
}

// 從終點倒推回起點，得到 [[站名, 列車], …]
function tracePath(goal, prev) {
  const path = []
  for (let k = goal; k !== undefined; k = prev.get(k)) path.unshift(parseKey(k))
  return path
}

// 同一班車連續坐的站合併成一個路段（leg）
function groupLegs(path) {
  const legs = []
  for (let i = 1; i < path.length; i++) {
    const [a, svcA] = path[i - 1]
    const [b, svcB] = path[i]
    if (svcA !== svcB) continue // 同站換車 = 轉乘，不是移動
    const last = legs.at(-1)
    if (last && last.svc === svcA && last.to === a) {
      legs[legs.length - 1] = { ...last, to: b, stops: [...last.stops, b] }
    } else {
      legs.push({ svc: svcA, from: a, to: b, stops: [a, b] })
    }
  }
  return legs
}

// 補上路線名稱、顏色、行駛方向
function legInfo(leg) {
  const s = SVC[leg.svc]
  const L = LINES[s.line]
  // 共用路段（例如中和新蘆線的古亭→大橋頭）兩種列車都能搭，方向就顯示兩個終點
  const dirs = new Set()
  for (const o of SERVICES) {
    if (o.line !== s.line || (o.label || '') !== (s.label || '')) continue
    const a = o.names.indexOf(leg.from)
    const b = o.names.indexOf(leg.to)
    if (a < 0 || b < 0) continue
    dirs.add(b > a ? o.names.at(-1) : o.names[0])
  }
  return {
    ...leg,
    line: s.line,
    lineName: s.label || L.name,
    color: L.color,
    ink: L.ink,
    hue: L.hue,
    dir: [...dirs].join('／'),
    count: leg.stops.length - 1,
  }
}

// 整條路線的起訖站，例如 { from: '龍山寺', to: '劍南路' }
export function routeEnds(route) {
  return { from: route.legs[0].from, to: route.legs.at(-1).to }
}

// 頁面說明用：轉乘一次約等於多坐幾站
export const TRANSFER_IN_STOPS = TRANSFER_COST / RIDE_COST

// 路段 → 一步一步的動作：上車 / 乘車 / 轉乘 / 抵達
export function toActions(legs) {
  const actions = []
  legs.forEach((leg, i) => {
    actions.push({ type: i === 0 ? 'board' : 'transfer', leg })
    actions.push({ type: 'ride', leg })
  })
  actions.push({ type: 'arrive', leg: legs.at(-1) })
  return actions
}
