// 学习会话通用逻辑：打字跟打 / 听写 / 默写
import { reactive } from 'vue'
import type { WordItem, StudyMode } from './types'
import { upsertWord, addLog, markStudiedInDB } from './db'
import { refreshStats } from './store'

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useSession(words: WordItem[], mode: StudyMode, deckId: string) {
  const s = reactive({
    index: 0,
    input: '',
    wrong: 0, // 本会话错误次数
    finished: false,
    state: 'asking' as 'asking' | 'correct' | 'wrong', // 整词提交模式用
    duration: 0,
    current: words[0],
  })
  const t0 = Date.now()
  const wrongWords = new Set<string>()

  function markWrong(word: WordItem) {
    if (!wrongWords.has(word.w)) {
      wrongWords.add(word.w)
      upsertWord(word, deckId, { lastWrongAt: Date.now() }).then((rec) =>
        upsertWord(word, deckId, { wrongCount: rec.wrongCount + 1 }),
      )
    }
  }

  function markStudied(word: WordItem) {
    markStudiedInDB(word, deckId)
  }

  function next() {
    if (s.index + 1 >= words.length) {
      s.duration = Math.round((Date.now() - t0) / 1000)
      s.finished = true
      addLog({
        date: todayStr(),
        at: Date.now(),
        mode,
        deckId,
        total: words.length,
        wrong: s.wrong,
        duration: s.duration,
      })
      refreshStats()
      return
    }
    s.index++
    s.current = words[s.index]
    s.input = ''
    s.state = 'asking'
  }

  // ===== 手动浏览：上一个 / 下一个（不写学习记录、不结束会话）=====
  function goTo(i: number) {
    if (i < 0 || i >= words.length) return
    s.index = i
    s.current = words[i]
    s.input = ''
    s.state = 'asking'
  }
  function goPrev() {
    goTo(s.index - 1)
  }
  function goNext() {
    goTo(s.index + 1)
  }

  // ===== 打字跟打：逐字符 =====
  function typeKey(key: string) {
    const target = s.current.w
    if (s.input.length >= target.length) return
    const expected = target[s.input.length]
    if (key.toLowerCase() === expected.toLowerCase()) {
      s.input += key
      if (s.input.length === target.length) {
        markStudied(s.current)
        setTimeout(next, 250)
      }
    } else {
      s.wrong++
      markWrong(s.current)
    }
  }

  function backspace() {
    s.input = s.input.slice(0, -1)
  }

  // ===== 听写 / 默写：整词提交 =====
  function submit() {
    if (s.state === 'wrong') {
      next()
      return
    }
    const ok = s.input.trim().toLowerCase() === s.current.w.toLowerCase()
    if (ok) {
      s.state = 'correct'
      markStudied(s.current)
      setTimeout(next, 600)
    } else {
      s.state = 'wrong'
      s.wrong++
      markWrong(s.current)
    }
  }

  return { s, typeKey, backspace, submit, next, goPrev, goNext }
}

/** 跟打模式每个字母的状态：correct / pending / cursor */
export function letterStates(target: string, typed: string) {
  return target.split('').map((_, i) => {
    if (i < typed.length) return 'correct'
    if (i === typed.length) return 'cursor'
    return 'pending'
  })
}
