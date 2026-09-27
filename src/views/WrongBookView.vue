<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { WordRecord, WordItem, StudyMode } from '../lib/types'
import { getAllRecords, putRecord } from '../lib/db'
import { refreshStats } from '../lib/store'
import { deckMeta } from '../lib/words'
import SubmitSession from '../components/SubmitSession.vue'

const records = ref<WordRecord[]>([])
const practice = ref<StudyMode | null>(null)
const practiceKey = ref(0)

async function load() {
  const recs = await getAllRecords()
  records.value = recs
    .filter((r) => r.wrongCount > 0)
    .sort((a, b) => (b.lastWrongAt ?? 0) - (a.lastWrongAt ?? 0))
}
onMounted(load)

const wrongWords = computed<WordItem[]>(() =>
  records.value.map((r) => ({ w: r.word, p: r.phonetic ?? '', t: r.translation ?? '' })),
)

function start(mode: StudyMode) {
  if (!wrongWords.value.length) return
  practice.value = mode
  practiceKey.value++
}

async function remove(rec: WordRecord) {
  await putRecord({ ...rec, wrongCount: 0 })
  await load()
  refreshStats()
}

function sourceLabel(rec: WordRecord): string {
  return rec.decks.map((d) => deckMeta(d)?.name ?? d).join(' / ')
}

function fmtTime(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function exitPractice() {
  practice.value = null
  await load()
  refreshStats()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-10">

    <!-- 练习模式 -->
    <SubmitSession
      v-if="practice"
      :key="practiceKey"
      :words="wrongWords"
      :mode="practice"
      deck-id="wrong"
      :title="practice === 'dictation' ? '错词听写' : '错词默写'"
      back-to="/wrong"
    >
      <template #question="{ current }">
        <div v-if="practice === 'dictation'" class="text-center">
          <div class="text-sm text-ink-soft">错词重听，拼出单词</div>
          <div class="font-mono text-3xl font-bold text-brand mt-4">{{ current.w }}</div>
        </div>
        <div v-else class="panel px-8 py-10 text-center">
          <div class="text-xs text-ink-soft tracking-widest mb-4">错词重默</div>
          <div class="text-xl whitespace-pre-line">{{ current.t }}</div>
        </div>
      </template>
      <template #actions>
        <button class="btn" @click="exitPractice">返回错词本</button>
      </template>
    </SubmitSession>

    <template v-else>
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="font-serif text-2xl md:text-3xl font-bold">错词本</h1>
          <p class="text-ink-soft text-sm mt-1">共 {{ records.length }} 个需要巩固的词</p>
        </div>
        <div class="flex gap-2">
          <button class="btn" :disabled="!records.length" @click="start('dictation')">错词听写</button>
          <button class="btn btn-hl" :disabled="!records.length" @click="start('recall')">错词默写</button>
        </div>
      </div>

      <!-- 空态 -->
      <div v-if="!records.length" class="panel mt-10 py-20 text-center">
        <div class="text-ink-soft text-sm">还没有错词，学习中拼错的单词会自动收集到这里</div>
        <RouterLink to="/library" class="btn btn-hl mt-6">去学习</RouterLink>
      </div>

      <!-- 错词列表 -->
      <div v-else class="panel mt-8 divide-y divide-line">
        <div v-for="rec in records" :key="rec.word" class="px-5 py-4 flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-3 flex-wrap">
              <span class="font-mono text-lg font-bold text-brand">{{ rec.word }}</span>
              <span class="text-xs text-ink-soft">/ {{ rec.phonetic }} /</span>
              <span class="text-[11px] bg-clay/15 text-clay px-1.5 py-0.5 rounded-sm">错 {{ rec.wrongCount }} 次</span>
            </div>
            <div class="text-sm text-ink mt-1 truncate">{{ rec.translation }}</div>
            <div class="text-[11px] text-ink-soft mt-0.5">{{ sourceLabel(rec) }} · {{ fmtTime(rec.lastWrongAt) }}</div>
          </div>
          <button class="text-xs text-ink-soft hover:text-brand shrink-0" @click="remove(rec)">移除</button>
        </div>
      </div>
    </template>
  </div>
</template>
