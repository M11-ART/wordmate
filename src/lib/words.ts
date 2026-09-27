// 词库元数据与加载
import type { DeckData, DeckMeta } from './types'

export const DECKS: DeckMeta[] = [
  { id: 'gk', name: '高考词汇', enName: 'Gaokao', desc: '高中大纲词汇', total: 0 },
  { id: 'cet4', name: 'CET-4', enName: 'Band 4', desc: '大学英语四级', total: 0 },
  { id: 'cet6', name: 'CET-6', enName: 'Band 6', desc: '大学英语六级', total: 0 },
  { id: 'ky', name: '考研英语', enName: 'Postgraduate', desc: '研究生入学考试', total: 0 },
  { id: 'ielts', name: '雅思', enName: 'IELTS', desc: 'IELTS 核心词汇', total: 0 },
  { id: 'toefl', name: '托福', enName: 'TOEFL', desc: 'TOEFL 核心词汇', total: 0 },
  { id: 'gre', name: 'GRE', enName: 'GRE', desc: 'GRE 考试词汇', total: 0 },
]

const cache = new Map<string, DeckData>()

export async function loadDeck(id: string): Promise<DeckData> {
  if (cache.has(id)) return cache.get(id)!
  const res = await fetch(`${import.meta.env.BASE_URL}data/${id}.json`)
  if (!res.ok) throw new Error(`词库 ${id} 加载失败`)
  const data: DeckData = await res.json()
  cache.set(id, data)
  return data
}

export function deckMeta(id: string): DeckMeta | undefined {
  return DECKS.find((d) => d.id === id)
}

/** 把任意一组词按每章 size 个分章（用于错词本等动态词单） */
export function chunkWords<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
