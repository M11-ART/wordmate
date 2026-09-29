<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAllRecords, getAllLogs } from '../lib/db'
import { stats, refreshStats } from '../lib/store'
import { DECKS } from '../lib/words'
import { todayStr } from '../lib/useSession'
import type { WordRecord, SessionLog } from '../lib/types'
import WeeklyChart from '../components/WeeklyChart.vue'

const records = ref<WordRecord[]>([])
const logs = ref<SessionLog[]>([])

onMounted(async () => {
  await refreshStats()
  records.value = await getAllRecords()
  logs.value = await getAllLogs()
})

const studyDays = computed(() => new Set(logs.value.map((l) => l.date)).size)
const todayLearned = computed(() =>
  logs.value.filter((l) => l.date === todayStr()).reduce((a, b) => a + b.total, 0),
)

function deckProgress(deckId: string) {
  const recs = records.value.filter((r) => r.decks.includes(deckId))
  const studied = recs.filter((r) => r.studied).length
  return { total: recs.length, studied }
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
    <div class="text-sm text-ink-soft">{{ greeting }}，今天也要背单词</div>

    <!-- 今日复习大卡 -->
    <div class="mt-4 bg-brand-deep text-[#EEF2E6] rounded-sm px-7 py-7 flex items-center gap-6 flex-wrap">
      <div class="flex-1 min-w-[200px]">
        <div class="text-sm text-[#A9B59E]">今日到期复习</div>
        <div class="font-serif text-5xl font-bold text-hl mt-1">{{ stats.due }}</div>
        <div class="text-xs text-[#8FA084] mt-2">FSRS 算法安排，趁没忘记快刷掉</div>
      </div>
      <RouterLink to="/review" class="btn btn-hl text-base px-7 py-3">开始复习</RouterLink>
    </div>

    <!-- 统计 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      <div class="panel px-5 py-4">
        <div class="font-serif text-2xl font-bold text-brand">{{ stats.studied }}</div>
        <div class="text-xs text-ink-soft mt-0.5">累计学过</div>
      </div>
      <div class="panel px-5 py-4">
        <div class="font-serif text-2xl font-bold text-brand">{{ todayLearned }}</div>
        <div class="text-xs text-ink-soft mt-0.5">今日新学</div>
      </div>
      <div class="panel px-5 py-4">
        <div class="font-serif text-2xl font-bold text-clay">{{ stats.wrong }}</div>
        <div class="text-xs text-ink-soft mt-0.5">错词待巩固</div>
      </div>
      <div class="panel px-5 py-4">
        <div class="font-serif text-2xl font-bold text-brand">{{ studyDays }} 天</div>
        <div class="text-xs text-ink-soft mt-0.5">学习天数</div>
      </div>
    </div>

    <!-- 近 7 天 -->
    <div class="panel mt-4 px-5 py-5">
      <div class="text-sm font-medium mb-2">近 7 天学习量</div>
      <WeeklyChart :logs="logs" />
    </div>

    <!-- 词库进度 + Anki 入口 -->
    <div class="grid md:grid-cols-2 gap-4 mt-4">
      <div class="panel px-5 py-5">
        <div class="text-sm font-medium mb-3">词库进度</div>
        <div v-for="d in DECKS" :key="d.id" class="flex items-center gap-3 py-1.5">
          <RouterLink :to="`/deck/${d.id}`" class="text-sm w-20 text-brand shrink-0">{{ d.name }}</RouterLink>
          <div class="flex-1 h-1.5 bg-line/60 rounded-full overflow-hidden">
            <div class="h-full bg-brand"
                 :style="{ width: (deckProgress(d.id).total ? (deckProgress(d.id).studied / deckProgress(d.id).total) * 100 : 0) + '%' }"></div>
          </div>
          <span class="text-[11px] text-ink-soft w-16 text-right shrink-0">
            {{ deckProgress(d.id).studied }}/{{ deckProgress(d.id).total }}
          </span>
        </div>
      </div>

      <div class="panel px-6 py-6 flex flex-col justify-center">
        <div class="font-serif text-lg font-bold">导出到 Anki 随身背</div>
        <p class="text-sm text-ink-soft mt-2 leading-relaxed">
          把任意词库、章节或你的错词本一键生成 Anki 牌组（含认词与拼写两种卡、FSRS 调度），
          导入手机后通勤路上也能刷。
        </p>
        <RouterLink to="/anki" class="btn btn-hl mt-5 self-start">生成 Anki 牌组</RouterLink>
      </div>
    </div>
  </div>
</template>
