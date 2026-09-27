// 词库与学习记录的类型定义

export interface WordItem {
  w: string // 单词
  p: string // 音标
  t: string // 中文释义
  d?: string // 英文释义
  f?: number // 词频排名（越小越常见）
  examples?: { en: string; zh: string }[] // 场景例句（中英对照）
  tip?: string // 记忆小提示（词根拆解 / 联想 / 画面感）
}

export interface Chapter {
  id: number
  title: string
  words: WordItem[]
}

export interface DeckMeta {
  id: string
  name: string
  enName: string
  desc: string
  total: number
}

export interface DeckData extends DeckMeta {
  chapters: Chapter[]
}

export type StudyMode = 'type' | 'dictation' | 'recall' | 'review'

export interface WordRecord {
  word: string
  phonetic?: string
  translation?: string
  decks: string[]
  // ts-fsrs 卡片状态（序列化为普通对象存储）
  card?: import('ts-fsrs').Card
  wrongCount: number
  lastWrongAt?: number
  studied: boolean
  studiedAt?: number
}

export interface SessionLog {
  id?: number
  date: string // YYYY-MM-DD
  at: number
  mode: StudyMode
  deckId: string
  total: number // 本轮处理词数
  wrong: number // 错误次数
  duration: number // 秒
}
