// 台北捷運路網資料
// LINES：每條路線的名稱與顏色
// SERVICES：實際會開的「列車種類」，車站依行駛順序排列
//   有分支的路線（中和新蘆線、支線）拆成多個 service，演算法才知道哪裡要換車

export const LINES = {
  BR: { name: '文湖線', color: '#c48c31', ink: '#1f1406', hue: '棕' },
  R: { name: '淡水信義線', color: '#e3002c', ink: '#ffffff', hue: '紅' },
  G: { name: '松山新店線', color: '#008659', ink: '#ffffff', hue: '綠' },
  O: { name: '中和新蘆線', color: '#f8b61c', ink: '#1b1404', hue: '橘' },
  BL: { name: '板南線', color: '#0070bd', ink: '#ffffff', hue: '藍' },
  Y: { name: '環狀線', color: '#ffdb00', ink: '#1b1704', hue: '黃' },
}

const O_TRUNK =
  'O01南勢角 O02景安 O03永安市場 O04頂溪 O05古亭 O06東門 O07忠孝新生 O08松江南京 O09行天宮 O10中山國小 O11民權西路 O12大橋頭'

const RAW_SERVICES = [
  { id: 'R', line: 'R', seq: 'R02象山 R03台北101/世貿 R04信義安和 R05大安 R06大安森林公園 R07東門 R08中正紀念堂 R09台大醫院 R10台北車站 R11中山 R12雙連 R13民權西路 R14圓山 R15劍潭 R16士林 R17芝山 R18明德 R19石牌 R20唭哩岸 R21奇岩 R22北投 R23復興崗 R24忠義 R25關渡 R26竹圍 R27紅樹林 R28淡水' },
  { id: 'R22A', line: 'R', label: '新北投支線', seq: 'R22北投 R22A新北投' },
  { id: 'G', line: 'G', seq: 'G01新店 G02新店區公所 G03七張 G04大坪林 G05景美 G06萬隆 G07公館 G08台電大樓 G09古亭 G10中正紀念堂 G11小南門 G12西門 G13北門 G14中山 G15松江南京 G16南京復興 G17台北小巨蛋 G18南京三民 G19松山' },
  { id: 'G03A', line: 'G', label: '小碧潭支線', seq: 'G03七張 G03A小碧潭' },
  { id: 'O-HL', line: 'O', seq: O_TRUNK + ' O13台北橋 O14菜寮 O15三重 O16先嗇宮 O17頭前庄 O18新莊 O19輔大 O20丹鳳 O21迴龍' },
  { id: 'O-LZ', line: 'O', seq: O_TRUNK + ' O50三重國小 O51三和國中 O52徐匯中學 O53三民高中 O54蘆洲' },
  { id: 'BL', line: 'BL', seq: 'BL01頂埔 BL02永寧 BL03土城 BL04海山 BL05亞東醫院 BL06府中 BL07板橋 BL08新埔 BL09江子翠 BL10龍山寺 BL11西門 BL12台北車站 BL13善導寺 BL14忠孝新生 BL15忠孝復興 BL16忠孝敦化 BL17國父紀念館 BL18市政府 BL19永春 BL20後山埤 BL21昆陽 BL22南港 BL23南港展覽館' },
  { id: 'BR', line: 'BR', seq: 'BR01動物園 BR02木柵 BR03萬芳社區 BR04萬芳醫院 BR05辛亥 BR06麟光 BR07六張犁 BR08科技大樓 BR09大安 BR10忠孝復興 BR11南京復興 BR12中山國中 BR13松山機場 BR14大直 BR15劍南路 BR16西湖 BR17港墘 BR18文德 BR19內湖 BR20大湖公園 BR21葫洲 BR22東湖 BR23南港軟體園區 BR24南港展覽館' },
  { id: 'Y', line: 'Y', seq: 'Y07大坪林 Y08十四張 Y09秀朗橋 Y10景平 Y11景安 Y12中和 Y13橋和 Y14中原 Y15板新 Y16板橋 Y17新埔民生 Y18頭前庄 Y19幸福 Y20新北產業園區' },
]

// 'BL11西門' → { code: 'BL11', name: '西門' }
export const SERVICES = RAW_SERVICES.map((s) => {
  const stops = s.seq.split(' ').map((token) => {
    const [, code, name] = token.match(/^([A-Z]+\d+A?)(.+)$/)
    return { code, name }
  })
  return { ...s, stops, names: stops.map((x) => x.name) }
})

// 用 id 快速找 service
export const SVC = Object.fromEntries(SERVICES.map((s) => [s.id, s]))

// 站名 → { name, codes: [{ code, line }] }，轉乘站會有多個代碼
export const STATIONS = new Map()
for (const s of SERVICES) {
  for (const { code, name } of s.stops) {
    if (!STATIONS.has(name)) STATIONS.set(name, { name, codes: [] })
    const st = STATIONS.get(name)
    if (!st.codes.some((c) => c.code === code)) st.codes.push({ code, line: s.line })
  }
}
