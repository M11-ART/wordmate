// FSRS 间隔重复算法封装（基于 ts-fsrs）
import { fsrs, generatorParameters, createEmptyCard, Rating } from 'ts-fsrs'
import type { Card } from 'ts-fsrs'
import type { WordRecord } from './types'

const f = fsrs(
  generatorParameters({
    enable_fuzz: true, // 间隔加入随机抖动，避免同日卡片堆积
    // 保留短期学习步骤：Again 会在几分钟内重新出现，复习会话内循环消化
  }),
)

export { Rating, createEmptyCard }
export type { Card }

/** 一张全新的卡片（未学过） */
export function emptyCard(now: Date = new Date()): Card {
  return createEmptyCard(now)
}

/** 按评分推进卡片，返回新卡片与本次调度信息 */
export function grade(card: Card, rating: Rating, now: Date = new Date()) {
  const result = f.next(card, now, rating as 1 | 2 | 3 | 4)
  return { card: result.card, log: result.log }
}

/** 今天结束（本地 23:59:59） */
export function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

/** 该记录是否有今日到期（含新卡与已逾期卡片） */
export function isDue(rec: WordRecord): boolean {
  if (!rec.card) return false
  // state: 0=New 1=Learning 2=Review 3=Relearning；新卡 due=创建时刻，当天即可首次评分
  return new Date(rec.card.due).getTime() <= endOfToday().getTime()
}

/** 卡片是否在数分钟内到期（用于复习会话内循环） */
export function dueWithin(rec: WordRecord, minutes: number, now: Date = new Date()): boolean {
  if (!rec.card) return false
  return new Date(rec.card.due).getTime() <= now.getTime() + minutes * 60_000
}

/** 距离到期的友好描述 */
export function dueLabel(rec: WordRecord): string {
  if (!rec.card || rec.card.state === 0) return '未学习'
  const due = new Date(rec.card.due).getTime()
  const now = Date.now()
  const diffH = Math.round((due - now) / 3600_000)
  if (diffH <= 0) return '待复习'
  if (diffH < 24) return `${Math.max(1, diffH)} 小时后`
  return `${Math.round(diffH / 24)} 天后`
}
