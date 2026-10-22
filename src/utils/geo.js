import { STATION_COORDS } from '../data/stationCoords'

const EARTH_RADIUS_METERS = 6371000
const DEFAULT_NEARBY_LIMIT = 3
const DEFAULT_MAX_DISTANCE_METERS = 2000 // 走路約 25 分鐘，再遠就不算「附近」
const NEARBY_THRESHOLD_METERS = 50

const toRadians = (degrees) => (degrees * Math.PI) / 180

/**
 * 兩點之間的地表距離（haversine 公式）
 * @param {[number, number]} from [緯度, 經度]
 * @param {[number, number]} to [緯度, 經度]
 * @returns {number} 公尺
 */
export function distanceInMeters([fromLat, fromLng], [toLat, toLng]) {
  const latDelta = toRadians(toLat - fromLat)
  const lngDelta = toRadians(toLng - fromLng)
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(lngDelta / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine))
}

/**
 * 離某個位置最近的幾站，由近到遠
 * @param {[number, number]} position [緯度, 經度]
 * @returns {{ name: string, distance: number }[]}
 */
export function findNearbyStations(
  position,
  { limit = DEFAULT_NEARBY_LIMIT, maxDistance = DEFAULT_MAX_DISTANCE_METERS } = {},
) {
  return Object.entries(STATION_COORDS)
    .map(([name, coords]) => ({ name, distance: distanceInMeters(position, coords) }))
    .filter((station) => station.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}

/**
 * 給人看的距離：764 → '約 760 公尺'，1234 → '約 1.2 公里'
 * @param {number} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  if (meters < NEARBY_THRESHOLD_METERS) return `不到 ${NEARBY_THRESHOLD_METERS} 公尺`
  if (meters < 1000) return `約 ${Math.round(meters / 10) * 10} 公尺`
  return `約 ${Number((meters / 1000).toFixed(1))} 公里`
}
