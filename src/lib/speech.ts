// 发音：优先有道真人发音（HTMLAudio playbackRate 调速），失败回退浏览器 Web Speech

let voice: 1 | 2 = 1 // 1=英音 2=美音

const RATE_KEY = 'wordmate_rate'
function loadRate(): number {
  const v = parseFloat(localStorage.getItem(RATE_KEY) || '')
  return Number.isFinite(v) && v >= 0.4 && v <= 1.6 ? v : 0.85 // 默认稍慢，缓解"读得太快"
}
let rate = loadRate()

export function setVoice(v: 1 | 2) {
  voice = v
}
export function getRate(): number {
  return rate
}
export function setRate(r: number) {
  rate = r
  localStorage.setItem(RATE_KEY, String(r))
}

export function youdaoUrl(word: string): string {
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${voice}`
}

export function speak(word: string): void {
  const audio = new Audio(youdaoUrl(word))
  audio.playbackRate = rate // 真人录音调速（浏览器默认保持音高）
  audio.onerror = () => speechFallback(word)
  audio.play().catch(() => speechFallback(word))
}

function speechFallback(word: string) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(word)
  u.lang = voice === 2 ? 'en-US' : enGB()
  u.rate = rate
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

function enGB(): string {
  return 'en-GB'
}
