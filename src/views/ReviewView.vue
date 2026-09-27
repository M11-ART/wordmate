<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, toRaw } from 'vue'
import type { WordRecord } from '../lib/types'
import { getAllRecords, putRecord, ensureCards } from '../lib/db'
import { emptyCard, grade, Rating, isDue } from '../lib/srs'
import { refreshStats } from '../lib/store'
import { speak } from '../lib/speech'

const queue = ref<WordRecord[]>([])
const initialTotal = ref(0)
const index = ref(0)
const flipped = ref(false)
const finished = ref(false)
const autoSound = ref(false)
const counts = ref({ again: 0, hard: 0, good: 0, easy: 0 })
const t0 = Date.now()
const duration = ref(0)

onMounted(async () => {
  await ensureCards()
  const recs = await getAllRecords()
  queue.value = recs.filter((r) => isDue(r))
  initialTotal.value = queue.value.length
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const current = computed(() => queue.value[index.value])

function flip() {
  if (!flipped.value) {
    flipped.value = true
    if (autoSound.value && current.value) speak(current.value.word)
  }
}

async function rate(rating: Rating) {
  if (!flipped.value || !current.value) return
  // toRaw 解包 Vue reactive proxy，否则结构化克隆存 IndexedDB 会抛 DataCloneError
  const rec = toRaw(current.value)
  const oldCard = rec.card ?? emptyCard()
  const { card: newCard } = grade(oldCard, rating)
  const saved: WordRecord = {
    ...rec,
    decks: toRaw(rec.decks).slice(),
    card: newCard,
  }
  await putRecord(saved)
  if (rating === Rating.Again) counts.value.again++
  if (rating === Rating.Hard) counts.value.hard++
  if (rating === Rating.Good) counts.value.good++
  if (rating === Rating.Easy) counts.value.easy++
  // Learning 卡按真实 due 时间到期，不立即排回当前队列（避免同词连刷）
  flipped.value = false
  index.value++
  if (index.value >= queue.value.length) {
    duration.value = Math.round((Date.now() - t0) / 1000)
    finished.value = true
    refreshStats()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (finished.value || !current.value) return
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    if (!flipped.value) flip()
    else rate(Rating.Good)
  } else if (flipped.value) {
    if (e.key === '1') rate(Rating.Again)
    if (e.key === '2') rate(Rating.Hard)
    if (e.key === '3') rate(Rating.Good)
    if (e.key === '4') rate(Rating.Easy)
  }
}

const buttons = [
  { rating: Rating.Again, label: '重来', key: '1', cls: 'bg-clay text-white', hint: '很快再见' },
  { rating: Rating.Hard, label: '困难', key: '2', cls: 'bg-[#b0832e] text-white', hint: '间隔较短' },
  { rating: Rating.Good, label: '良好', key: '3', cls: 'bg-brand text-white', hint: '正常间隔' },
  { rating: Rating.Easy, label: '简单', key: '4', cls: 'bg-brand-deep text-white', hint: '间隔较长' },
]
</script>

<template>
  <div class="min-h-[80vh] flex flex-col">
    <!-- 空态 -->
    <div v-if="initialTotal === 0" class="max-w-xl mx-auto text-center px-4 py-24">
      <div class="w-20 h-20 rounded-full bg-brand-soft text-brand flex items-center justify-center mx-auto">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>
      </div>
      <h2 class="font-serif text-2xl font-bold mt-6">今日没有到期的复习</h2>
      <p class="text-ink-soft text-sm mt-3">学过的单词会按 FSRS 算法在快要忘记时自动回到这里。</p>
      <RouterLink to="/library" class="btn btn-hl mt-8">去词库学新词</RouterLink>
    </div>

    <!-- 完成态 -->
    <div v-else-if="finished" class="max-w-2xl mx-auto px-4 py-20 text-center w-full">
      <h2 class="font-serif text-3xl font-bold">今日复习完成</h2>
      <div class="panel mt-8 grid grid-cols-4 divide-x divide-line text-sm">
        <div class="py-6"><div class="font-serif text-2xl font-bold text-clay">{{ counts.again }}</div><div class="text-xs text-ink-soft mt-1">重来</div></div>
        <div class="py-6"><div class="font-serif text-2xl font-bold text-[#b0832e]">{{ counts.hard }}</div><div class="text-xs text-ink-soft mt-1">困难</div></div>
        <div class="py-6"><div class="font-serif text-2xl font-bold text-brand">{{ counts.good }}</div><div class="text-xs text-ink-soft mt-1">良好</div></div>
        <div class="py-6"><div class="font-serif text-2xl font-bold text-brand-deep">{{ counts.easy }}</div><div class="text-xs text-ink-soft mt-1">简单</div></div>
      </div>
      <div class="text-sm text-ink-soft mt-4">共处理 {{ index }} 张卡，用时 {{ Math.floor(duration / 60) }}分{{ duration % 60 }}秒</div>
      <RouterLink to="/" class="btn btn-hl mt-8">返回首页</RouterLink>
    </div>

    <!-- 复习卡片 -->
    <template v-else>
      <div class="max-w-4xl mx-auto w-full px-4 md:px-8 py-6">
        <div class="flex items-center justify-between text-xs text-ink-soft">
          <span>FSRS 复习 · {{ index + 1 }} / {{ queue.length }}</span>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" v-model="autoSound" class="accent-brand"> 翻面发音
          </label>
        </div>
        <div class="h-1.5 bg-line/60 rounded-full mt-2 overflow-hidden">
          <div class="h-full bg-brand transition-all" :style="{ width: (index / queue.length) * 100 + '%' }"></div>
        </div>
      </div>

      <div class="flex-1 flex items-center justify-center px-4 pb-6">
        <div class="panel w-full max-w-2xl min-h-[340px] flex flex-col">
          <!-- 正面 -->
          <div v-if="!flipped" class="flex-1 flex flex-col items-center justify-center py-12 cursor-pointer" @click="flip">
            <div class="font-mono text-4xl md:text-5xl font-bold text-brand">{{ current.word }}</div>
            <div class="text-ink-soft mt-3">/ {{ current.phonetic }} /</div>
            <button class="mt-5 text-brand" @click.stop="speak(current.word)" aria-label="发音">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
                <path d="M18.5 5.5a9 9 0 0 1 0 13"/>
              </svg>
            </button>
            <div class="text-xs text-ink-soft mt-8">点击卡片或按空格翻面</div>
          </div>

          <!-- 背面 -->
          <div v-else class="flex-1 flex flex-col py-10 px-8">
            <div class="text-center">
              <div class="font-mono text-3xl md:text-4xl font-bold text-brand">{{ current.word }}</div>
              <div class="text-ink-soft mt-2">/ {{ current.phonetic }} /</div>
            </div>
            <div class="mt-6 text-[15px] whitespace-pre-line text-center">{{ current.translation }}</div>
            <div class="mt-auto pt-8 grid grid-cols-4 gap-2 md:gap-3">
              <button v-for="b in buttons" :key="b.label"
                      class="rounded-sm py-2.5 text-xs md:text-sm font-medium transition-opacity hover:opacity-90"
                      :class="b.cls" @click="rate(b.rating)">
                <span class="block opacity-80 text-[10px]">{{ b.key }}</span>
                {{ b.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
