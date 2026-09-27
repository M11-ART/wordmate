<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { DeckData } from '../lib/types'
import { loadDeck, deckMeta } from '../lib/words'
import { getAllRecords } from '../lib/db'

const props = defineProps<{ id: string }>()
const deck = ref<DeckData>()
const recMap = ref<Map<string, { studied: boolean }>>(new Map())

onMounted(async () => {
  deck.value = await loadDeck(props.id)
  const recs = await getAllRecords()
  recMap.value = new Map(recs.map((r) => [r.word.toLowerCase(), r]))
})

const meta = computed(() => deckMeta(props.id))

function chapterStudied(chId: number): { done: number; total: number } {
  const ch = deck.value!.chapters[chId]
  let done = 0
  for (const w of ch.words) if (recMap.value.get(w.w.toLowerCase())?.studied) done++
  return { done, total: ch.words.length }
}

const overall = computed(() => {
  if (!deck.value) return { done: 0, total: 0 }
  let done = 0
  for (const ch of deck.value.chapters) {
    for (const w of ch.words) if (recMap.value.get(w.w.toLowerCase())?.studied) done++
  }
  return { done, total: deck.value.total }
})

/** 第一个未全部完成的章节 */
const continueCh = computed(() => {
  if (!deck.value) return 0
  const idx = deck.value.chapters.findIndex((_, i) => chapterStudied(i).done < chapterStudied(i).total)
  return idx < 0 ? 0 : idx
})

const modes = [
  { name: '跟打', path: 'study' },
  { name: '听写', path: 'dictation' },
  { name: '默写', path: 'recall' },
]
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-10" v-if="deck">
    <RouterLink to="/library" class="text-sm text-ink-soft hover:text-brand flex items-center gap-1">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>词库
    </RouterLink>

    <div class="flex items-end justify-between flex-wrap gap-4 mt-4">
      <div>
        <h1 class="font-serif text-2xl md:text-3xl font-bold">{{ meta?.name }}</h1>
        <p class="text-ink-soft text-sm mt-1">共 {{ deck.total }} 词，{{ deck.chapters.length }} 章，每章约 30 词</p>
      </div>
      <RouterLink :to="`/study/${id}/${continueCh}`" class="btn btn-hl">继续学习</RouterLink>
    </div>

    <div class="panel mt-7 px-5 py-4">
      <div class="flex justify-between text-xs text-ink-soft mb-2">
        <span>总进度</span><span>{{ overall.done }} / {{ overall.total }}</span>
      </div>
      <div class="h-2 bg-line/60 rounded-full overflow-hidden">
        <div class="h-full bg-brand transition-all"
             :style="{ width: (overall.total ? (overall.done / overall.total) * 100 : 0) + '%' }"></div>
      </div>
    </div>

    <div class="mt-8 space-y-3">
      <div v-for="ch in deck.chapters" :key="ch.id"
           class="panel px-5 py-4 flex items-center gap-4 flex-wrap">
        <div class="w-20 shrink-0">
          <div class="font-serif font-bold">{{ ch.title }}</div>
          <div class="text-[11px] text-ink-soft">{{ chapterStudied(ch.id).done }}/{{ ch.words.length }}</div>
        </div>
        <div class="flex-1 min-w-[120px] h-1.5 bg-line/60 rounded-full overflow-hidden">
          <div class="h-full bg-brand"
               :style="{ width: (chapterStudied(ch.id).done / ch.words.length) * 100 + '%' }"></div>
        </div>
        <div class="flex gap-1.5 shrink-0">
          <RouterLink v-for="m in modes" :key="m.path"
                      :to="`/${m.path}/${id}/${ch.id}`"
                      class="text-xs px-3 py-1.5 border border-line text-brand rounded-sm hover:bg-brand hover:text-[#F3F5EC] hover:border-brand">
            {{ m.name }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
