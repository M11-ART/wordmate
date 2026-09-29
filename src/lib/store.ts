// 全局轻量统计状态（待复习数、错词数等），各视图操作后调用 refreshStats
import { reactive } from 'vue'
import { getAllRecords, ensureCards } from './db'
import { isDue } from './srs'
import { scheduleAutoPush } from './sync'

export const stats = reactive({
  due: 0,
  wrong: 0,
  studied: 0,
  total: 0,
})

export async function refreshStats() {
  await ensureCards()
  const recs = await getAllRecords()
  stats.total = recs.length
  stats.due = recs.filter((r) => isDue(r)).length
  stats.wrong = recs.filter((r) => r.wrongCount > 0).length
  stats.studied = recs.filter((r) => r.studied).length
  scheduleAutoPush() // 学习数据变化后，若已登录则防抖自动上传
}
