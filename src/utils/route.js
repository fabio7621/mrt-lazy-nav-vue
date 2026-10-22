import { LINES, SERVICES, SERVICE_BY_ID } from '../data/metro'

// 成本設定：單位約為分鐘，坐一站、轉乘一次各要花多久
// 轉乘有額外成本，演算法才會避開「站數一樣但多轉一次」的路線
//
// 成本完全一樣時選哪條，由這四處的順序共同決定（測試有釘住結果）：
//   1. 起始節點的順序 = data/metro.js 裡 RAW_SERVICES 的排列順序
//   2. popCheapestNode 用嚴格 <：成本相同時先放進 frontier 的先取出
//   3. findShortestPath 鬆弛時用嚴格 <：成本相同時保留先找到的前一站
//   4. listNeighbors 的順序：前一站 → 後一站 → 轉乘
export const RIDE_COST = 2
export const TRANSFER_COST = 7

// 頁面說明用：轉乘一次約等於多坐幾站
export const TRANSFER_COST_IN_STOPS = TRANSFER_COST / RIDE_COST

// 節點不是「車站」，而是「車站 + 正在搭的列車」，例如「西門|BL」
const toNodeKey = (station, serviceId) => `${station}|${serviceId}`
const parseNodeKey = (nodeKey) => nodeKey.split('|')

/**
 * 找出起訖站之間成本最低的路線，找不到回傳 null
 * 在同一站換到另一條線，就是一條成本 = TRANSFER_COST 的邊
 */
export function findRoute(fromStation, toStation) {
  const { goalNode, previousByNode } = findShortestPath(fromStation, toStation)
  if (!goalNode) return null

  const path = tracePathBack(goalNode, previousByNode)
  const legs = groupIntoLegs(path).map(describeLeg)
  return {
    legs,
    stopCount: legs.reduce((sum, leg) => sum + leg.stopCount, 0),
    transferCount: legs.length - 1,
  }
}

// Dijkstra 最短路徑：回傳終點節點，以及每個節點是從哪個節點走過來的
function findShortestPath(fromStation, toStation) {
  const costByNode = new Map()
  const previousByNode = new Map()
  const visited = new Set()
  const frontier = listStartNodes(fromStation)
  for (const node of frontier) costByNode.set(node, 0)

  while (frontier.length) {
    const node = popCheapestNode(frontier, costByNode)
    if (visited.has(node)) continue
    visited.add(node)
    if (parseNodeKey(node)[0] === toStation) return { goalNode: node, previousByNode }

    for (const [neighbor, edgeCost] of listNeighbors(node)) {
      if (visited.has(neighbor)) continue
      const newCost = costByNode.get(node) + edgeCost
      if (!costByNode.has(neighbor) || newCost < costByNode.get(neighbor)) {
        costByNode.set(neighbor, newCost)
        previousByNode.set(neighbor, node)
        frontier.push(neighbor)
      }
    }
  }
  return { goalNode: null, previousByNode }
}

// 起點站有停的每一種列車，都是成本 0 的起始節點
function listStartNodes(station) {
  return SERVICES.filter((service) => service.stationNames.includes(station)).map((service) =>
    toNodeKey(station, service.id),
  )
}

// 取出目前成本最小的節點（資料量小，直接線性找即可）
function popCheapestNode(frontier, costByNode) {
  let cheapestIndex = 0
  for (let i = 1; i < frontier.length; i++) {
    if (costByNode.get(frontier[i]) < costByNode.get(frontier[cheapestIndex])) cheapestIndex = i
  }
  return frontier.splice(cheapestIndex, 1)[0]
}

// 相鄰節點：同一班車的前一站、後一站（坐一站），以及同站的其他列車（轉乘）
// 回傳順序是同成本選路的依據之一（見檔案開頭）
function listNeighbors(node) {
  const [station, serviceId] = parseNodeKey(node)
  const stationNames = SERVICE_BY_ID[serviceId].stationNames
  const index = stationNames.indexOf(station)
  const rideEdges = [stationNames[index - 1], stationNames[index + 1]]
    .filter((name) => name !== undefined)
    .map((name) => [toNodeKey(name, serviceId), RIDE_COST])
  const transferEdges = SERVICES.filter(
    (other) => other.id !== serviceId && other.stationNames.includes(station),
  ).map((other) => [toNodeKey(station, other.id), TRANSFER_COST])
  return [...rideEdges, ...transferEdges]
}

// 從終點倒推回起點，得到 [[站名, 列車], …]
function tracePathBack(goalNode, previousByNode) {
  const path = []
  for (let node = goalNode; node !== undefined; node = previousByNode.get(node)) {
    path.unshift(parseNodeKey(node))
  }
  return path
}

// 同一班車連續坐的站合併成一個路段（leg）
function groupIntoLegs(path) {
  const legs = []
  for (let i = 1; i < path.length; i++) {
    const [prevStation, prevServiceId] = path[i - 1]
    const [station, serviceId] = path[i]
    if (prevServiceId !== serviceId) continue // 同站換車 = 轉乘，不是移動
    const lastLeg = legs.at(-1)
    const continuesLastLeg =
      lastLeg && lastLeg.serviceId === serviceId && lastLeg.to === prevStation
    if (continuesLastLeg) {
      legs[legs.length - 1] = { ...lastLeg, to: station, stops: [...lastLeg.stops, station] }
    } else {
      legs.push({ serviceId, from: prevStation, to: station, stops: [prevStation, station] })
    }
  }
  return legs
}

// 補上路線名稱、顏色、行駛方向
function describeLeg(leg) {
  const service = SERVICE_BY_ID[leg.serviceId]
  const line = LINES[service.line]
  return {
    ...leg,
    line: service.line,
    lineName: service.label || line.name,
    color: line.color,
    textColor: line.textColor,
    colorName: line.colorName,
    direction: findLegTerminals(leg, service).join('／'),
    stopCount: leg.stops.length - 1,
  }
}

// 這段路往哪個終點站開
// 共用路段（例如中和新蘆線的古亭→大橋頭）兩種列車都能搭，就回傳兩個終點
function findLegTerminals(leg, service) {
  const terminals = new Set()
  for (const other of SERVICES) {
    const isSameBranch = other.line === service.line && (other.label || '') === (service.label || '')
    if (!isSameBranch) continue
    const fromIndex = other.stationNames.indexOf(leg.from)
    const toIndex = other.stationNames.indexOf(leg.to)
    if (fromIndex < 0 || toIndex < 0) continue
    terminals.add(toIndex > fromIndex ? other.stationNames.at(-1) : other.stationNames[0])
  }
  return [...terminals]
}

// 整條路線的起訖站，例如 { from: '龍山寺', to: '劍南路' }
export function getRouteEnds(route) {
  return { from: route.legs[0].from, to: route.legs.at(-1).to }
}

// 路段 → 一步一步的動作：上車 / 乘車 / 轉乘 / 抵達
export function buildActions(legs) {
  const legActions = legs.flatMap((leg, i) => [
    { type: i === 0 ? 'board' : 'transfer', leg },
    { type: 'ride', leg },
  ])
  return [...legActions, { type: 'arrive', leg: legs.at(-1) }]
}
