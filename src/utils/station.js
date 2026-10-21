import { STATIONS } from '../data/metro'

// 統一寫法：臺 → 台、去掉所有空白
const clean = (text) => (text || '').replace(/臺/g, '台').replace(/\s/g, '')

// 使用者常多打一個「站」字
const stripSuffix = (q) => q.replace(/站$/, '')

const hasCode = (st, code) => st.codes.some((c) => c.code === code)

// 把使用者輸入轉成正式站名，找不到回傳 null
// 支援：完整站名、多打一個「站」字、車站代碼（BL11）
export function resolve(text) {
  const q = clean(text)
  if (!q) return null
  if (STATIONS.has(q)) return q
  const noSuffix = stripSuffix(q)
  if (STATIONS.has(noSuffix)) return noSuffix
  const code = q.toUpperCase()
  for (const st of STATIONS.values()) {
    if (hasCode(st, code)) return st.name
  }
  return null
}

// 下拉選單排序用：完全符合 0 > 開頭符合 1 > 代碼開頭 2 > 包含 3，不符合 -1
function matchScore(st, q, name, code) {
  if (st.name === q || st.name === name || hasCode(st, code)) return 0
  if (st.name.startsWith(name)) return 1
  if (st.codes.some((c) => c.code.startsWith(code))) return 2
  if (st.name.includes(name)) return 3
  return -1
}

// 下拉選單用：依符合程度排序，最多 limit 站
export function search(text, limit = 8) {
  const q = clean(text)
  if (!q) return []
  const name = stripSuffix(q) || q
  const code = q.toUpperCase()
  return [...STATIONS.values()]
    .map((st) => ({ st, score: matchScore(st, q, name, code) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.st)
}

// 某站在某條線上的代碼，例如 codeOn('西門', 'BL') → 'BL11'
export function codeOn(name, line) {
  return STATIONS.get(name)?.codes.find((c) => c.line === line)?.code || ''
}
