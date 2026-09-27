// IndexedDB 数据层：学习记录 + 会话日志
import { openDB, type IDBPDatabase } from 'idb'
import type { WordRecord, SessionLog, WordItem } from './types'
import { createEmptyCard } from './srs'

let dbp: Promise<IDBPDatabase<any>> | null = null

function db() {
  if (!dbp) {
    dbp = openDB('wordmate', 1, {
      upgrade(d) {
        const r = d.createObjectStore('records', { keyPath: 'word' })
        r.createIndex('wrong', 'wrongCount')
        d.createObjectStore('logs', { keyPath: 'id', autoIncrement: true })
      },
    })
  }
  return dbp
}

export async function getRecord(word: string): Promise<WordRecord | undefined> {
  return (await db()).get('records', word)
}

export async function getAllRecords(): Promise<WordRecord[]> {
  return (await db()).getAll('records')
}

export async function putRecord(rec: WordRecord) {
  await (await db()).put('records', rec)
}

/** 合并更新一个单词的记录，返回更新后的记录 */
export async function upsertWord(
  word: WordItem,
  deckId: string,
  patch: Partial<WordRecord>,
): Promise<WordRecord> {
  const d = await db()
  const old: WordRecord | undefined = await d.get('records', word.w)
  const rec: WordRecord = {
    word: word.w,
    phonetic: word.p,
    translation: word.t,
    decks: old?.decks?.includes(deckId) ? old.decks : [...(old?.decks ?? []), deckId],
    card: old?.card,
    wrongCount: old?.wrongCount ?? 0,
    studied: old?.studied ?? false,
    ...patch,
  }
  await d.put('records', rec)
  return rec
}

/** 标记一个词为已学，并为其建立 FSRS 新卡（若还没有） */
export async function markStudiedInDB(word: WordItem, deckId: string): Promise<WordRecord> {
  const d = await db()
  const old: WordRecord | undefined = await d.get('records', word.w)
  const rec: WordRecord = {
    word: word.w,
    phonetic: word.p,
    translation: word.t,
    decks: old?.decks?.includes(deckId) ? old.decks : [...(old?.decks ?? []), deckId],
    card: old?.card ?? createEmptyCard(),
    wrongCount: old?.wrongCount ?? 0,
    studied: true,
    studiedAt: Date.now(),
  }
  await d.put('records', rec)
  return rec
}

/** 迁移：给已学但缺卡片的历史记录补上新卡 */
export async function ensureCards(): Promise<void> {
  const d = await db()
  const all = await d.getAll('records')
  let changed = false
  for (const rec of all as WordRecord[]) {
    if (rec.studied && !rec.card) {
      rec.card = createEmptyCard()
      await d.put('records', rec)
      changed = true
    }
  }
  void changed
}

export async function addLog(log: SessionLog) {
  await (await db()).add('logs', log)
}

export async function getAllLogs(): Promise<SessionLog[]> {
  return (await db()).getAll('logs')
}

export async function clearAllData() {
  const d = await db()
  await d.clear('records')
  await d.clear('logs')
}
