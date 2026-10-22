// 包一層瀏覽器定位 API：callback 改成 Promise，錯誤統一成幾種原因
// 注意：只有 HTTPS 或 localhost 才拿得到位置，用區網 IP 開 dev server 會被瀏覽器拒絕

export const LOCATE_FAILURE = {
  UNSUPPORTED: 'unsupported',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout',
}

// GeolocationPositionError.code → 原因
const FAILURE_BY_ERROR_CODE = {
  1: LOCATE_FAILURE.DENIED,
  2: LOCATE_FAILURE.UNAVAILABLE,
  3: LOCATE_FAILURE.TIMEOUT,
}

const POSITION_OPTIONS = {
  enableHighAccuracy: true, // 要 GPS 等級，不要只靠基地台
  timeout: 10000,
  maximumAge: 30000, // 30 秒內的舊位置可以直接用，按第二次比較快
}

export class LocateError extends Error {
  constructor(reason) {
    super(`geolocation failed: ${reason}`)
    this.reason = reason
  }
}

/**
 * 取得目前位置
 * @returns {Promise<{ position: [number, number], accuracy: number }>} 位置 [緯度, 經度]、誤差半徑（公尺）
 * @throws {LocateError} reason 是 LOCATE_FAILURE 其中之一
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new LocateError(LOCATE_FAILURE.UNSUPPORTED))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ position: [coords.latitude, coords.longitude], accuracy: coords.accuracy }),
      (error) => reject(new LocateError(FAILURE_BY_ERROR_CODE[error.code] || LOCATE_FAILURE.UNAVAILABLE)),
      POSITION_OPTIONS,
    )
  })
}
