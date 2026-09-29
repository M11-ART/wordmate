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
    ...old,
    word: word.w,
    phonetic: word.p,
    translation: word.t,
    decks: old?.decks?.includes(deckId) ? old.decks : [...(old?.decks ?? []), deckId],
    wrongCount: old?.wrongCount ?? 0,
    studied: old?.studied ?? false,
    ...patch,
    updatedAt: Date.now(),
  }
  await d.put('records', rec)
  return rec
}

/** 标记一个词为已学，并为其建立 FSRS 新卡（若还没有） */
export async function markStudiedInDB(word: WordItem, deckId: string): Promise<WordRecord> {
  const d = await db()
  const old: WordRecord | undefined = await d.get('records', word.w)
  const rec: WordRecord = {
    ...old,
    word: word.w,
    phonetic: word.p,
    translation: word.t,
    decks: old?.decks?.includes(deckId) ? old.decks : [...(old?.decks ?? []), deckId],
    card: old?.card ?? createEmptyCard(),
    wrongCount: old?.wrongCount ?? 0,
    studied: true,
    studiedAt: Date.now(),
    updatedAt: Date.now(),
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

export function genUid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export async function addLog(log: SessionLog) {
  if (!log.uid) log.uid = genUid()
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

// ===== 云同步：导出 / 合并导入 =====
export interface SyncPayload {
  v: number
  records: WordRecord[]
  logs: SessionLog[]
  exportedAt: number
}

export async function exportData(): Promise<SyncPayload> {
  const d = await db()
  const [records, logs] = await Promise.all([d.getAll('records'), d.getAll('logs')])
  for (const l of logs as SessionLog[]) if (!l.uid) l.uid = 'legacy-' + genUid()
  return { v: 1, records, logs, exportedAt: Date.now() }
}

/** 合并远端数据：records 按 updatedAt 取新；logs 按 uid 取并集。返回合并后条数 */
export async function importMerge(payload: Partial<SyncPayload>): Promise<{
  records: number
  logs: number
}> {
  const d = await db()
  const localRecs = (await d.getAll('records')) as WordRecord[]
  const recMap = new Map<string, WordRecord>()
  for (const r of localRecs) recMap.set(r.word, r)
  for (const r of payload.records ?? []) {
    const ex = recMap.get(r.word)
    if (!ex || (r.updatedAt ?? 0) >= (ex.updatedAt ?? 0)) recMap.set(r.word, r)
  }
  const recsOut = [...recMap.values()]

  const localLogs = (await d.getAll('logs')) as SessionLog[]
  const logMap = new Map<string, SessionLog>()
  for (const l of localLogs) {
    if (!l.uid) l.uid = 'legacy-' + genUid()
    logMap.set(l.uid, l)
  }
  for (const l of payload.logs ?? []) {
    const uid = l.uid || 'remote-' + genUid()
    if (!logMap.has(uid)) logMap.set(uid, { ...l, uid })
  }
  const logsOut = [...logMap.values()].map(({ id, ...rest }) => rest) // 去自增 id 避免冲突

  const tx = d.transaction(['records', 'logs'], 'readwrite')
  await tx.objectStore('records').clear()
  await tx.objectStore('logs').clear()
  for (const r of recsOut) await tx.objectStore('records').put(r)
  for (const l of logsOut) await tx.objectStore('logs').put(l)
  await tx.done
  return { records: recsOut.length, logs: logsOut.length }
}
