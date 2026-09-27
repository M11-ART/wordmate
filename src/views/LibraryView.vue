<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DECKS } from '../lib/words'
import { getAllRecords } from '../lib/db'
import type { WordRecord } from '../lib/types'

const records = ref<WordRecord[]>([])
onMounted(async () => {
  records.value = await getAllRecords()
})

function progress(deckId: string) {
  const recs = records.value.filter((r) => r.decks.includes(deckId))
  const studied = recs.filter((r) => r.studied).length
  return { total: recs.length, studied }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
    <h1 class="font-serif text-2xl md:text-3xl font-bold">选择词库</h1>
    <p class="text-ink-soft text-sm mt-2">词库数据来自开源 ECDICT，按考试大纲收录，可离线使用</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-9">
      <RouterLink v-for="d in DECKS" :key="d.id" :to="`/deck/${d.id}`"
                  class="panel p-5 hover:border-brand transition-colors group block">
        <div class="flex items-start justify-between">
          <div>
            <div class="font-serif text-xl font-bold">{{ d.name }}</div>
            <div class="text-[11px] text-ink-soft tracking-widest mt-0.5">{{ d.enName.toUpperCase() }}</div>
          </div>
          <svg class="text-ink-soft group-hover:text-brand transition-colors" width="20" height="20"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </div>
        <p class="text-xs text-ink-soft mt-3">{{ d.desc }}</p>
        <div class="mt-4">
          <div class="h-1 bg-line/60 rounded-full overflow-hidden">
            <div class="h-full bg-brand"
                 :style="{ width: (progress(d.id).total ? (progress(d.id).studied / progress(d.id).total) * 100 : 0) + '%' }"></div>
          </div>
          <div class="text-[11px] text-ink-soft mt-1.5">
            <template v-if="progress(d.id).total">已学 {{ progress(d.id).studied }} / {{ progress(d.id).total }}</template>
            <template v-else>未开始</template>
          </div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
