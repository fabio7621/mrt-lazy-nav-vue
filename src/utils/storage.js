// localStorage 包一層 try/catch：無痕模式或被封鎖時不會讓整個 app 壞掉
export const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* 存不了就算了 */
    }
  },
}
