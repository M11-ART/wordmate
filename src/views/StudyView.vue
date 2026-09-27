<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { DeckData } from '../lib/types'
import { loadDeck, deckMeta } from '../lib/words'
import { useSession, letterStates } from '../lib/useSession'
import { speak } from '../lib/speech'
import SessionHeader from '../components/SessionHeader.vue'
import SessionResult from '../components/SessionResult.vue'
import SpeakerButton from '../components/SpeakerButton.vue'
import WordDetail from '../components/WordDetail.vue'

const props = defineProps<{ id: string; ch?: string }>()
const router = useRouter()

const deck = ref<DeckData>()
const chIndex = computed(() => Math.max(0, Number(props.ch ?? 0)))
const hasNext = computed(() => !!deck.value && chIndex.value < deck.value.chapters.length - 1)

const sessRef = ref<ReturnType<typeof useSession>>()
const s = computed(() => sessRef.value?.s)

const autoSound = ref(false)
const hiddenInput = ref<HTMLInputElement>()

async function init() {
  deck.value = await loadDeck(props.id)
  const chapter = deck.value.chapters[chIndex.value]
  sessRef.value = useSession(chapter.words, 'type', props.id)
  await nextTick()
  hiddenInput.value?.focus()
}

onMounted(() => {
  init()
  window.addEventListener('keydown', onKeydown, true)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown, true))

function onKeydown(e: KeyboardEvent) {
  const sess = sessRef.value
  if (!sess || sess.s.finished) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'Backspace') {
    e.preventDefault()
    sess.backspace()
    return
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    sess.goPrev()
    return
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    sess.goNext()
    return
  }
  // 放行字母、数字及缩写常见符号（含句点，如 B.C. / U.S.）
  if (e.key.length === 1 && /[a-zA-Z0-9'\- .]/.test(e.key)) {
    e.preventDefault()
    sess.typeKey(e.key)
  }
}

watch(
  () => s.value?.index,
  () => {
    hiddenInput.value?.focus()
    if (autoSound.value && sessRef.value) speak(sessRef.value.s.current.w)
  },
)

const letters = computed(() => {
  const sess = sessRef.value
  if (!sess || !deck.value) return []
  const cur = sess.s
  return letterStates(cur.current.w, cur.input)
})

function restart() {
  init()
}
function nextChapter() {
  router.push(`/study/${props.id}/${chIndex.value + 1}`)
}
const meta = computed(() => deckMeta(props.id))
</script>

<template>
  <div v-if="deck">
    <SessionHeader
      v-if="s"
      :index="s.index" :total="deck.chapters[chIndex].words.length"
      :wrong="s.wrong" :back-to="`/deck/${id}`"
      :title="`${meta?.name} · ${deck.chapters[chIndex].title} · 打字跟打`"
    />

    <template v-if="s && !s.finished">
      <div class="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-16" @click="hiddenInput?.focus()">
        <!-- 单词字母 -->
        <div class="font-mono text-4xl md:text-6xl text-center tracking-[0.12em] min-h-[90px] flex flex-wrap justify-center items-center">
          <span v-for="(st, i) in letters" :key="i" class="letter"
                :class="{
                  'letter-correct': st === 'correct',
                  'letter-pending': st === 'pending',
                  'letter-cursor': st === 'cursor',
                }">{{ s.current.w[i] }}</span>
        </div>

        <!-- 音标 + 发音 -->
        <div class="flex items-center justify-center gap-4 mt-6">
          <span class="text-ink-soft text-base md:text-lg">/ {{ s.current.p }} /</span>
          <SpeakerButton :word="s.current.w" />
          <label class="flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer select-none">
            <input type="checkbox" v-model="autoSound" class="accent-brand"> 自动发音
          </label>
        </div>

        <!-- 释义 -->
        <div class="panel mt-10 px-6 py-5 text-center text-[15px] whitespace-pre-line">{{ s.current.t }}</div>

        <!-- 手动上一个 / 下一个 -->
        <div class="flex items-center justify-center gap-6 mt-7">
          <button type="button"
                  class="text-sm text-ink-soft hover:text-brand transition-colors disabled:opacity-30 disabled:hover:text-ink-soft"
                  :disabled="s.index === 0" @click="sessRef?.goPrev()">‹ 上一词</button>
          <button type="button"
                  class="text-sm text-ink-soft hover:text-brand transition-colors disabled:opacity-30 disabled:hover:text-ink-soft"
                  :disabled="s.index >= deck.chapters[chIndex].words.length - 1"
                  @click="sessRef?.goNext()">下一词 ›</button>
        </div>

        <WordDetail :item="s.current" />

        <div class="text-center text-xs text-ink-soft mt-8">
          敲错不会前进，敲对自动进入下一词；也可用 ← → 方向键切换，手机请点页面唤起键盘
        </div>
      </div>
      <input ref="hiddenInput" class="fixed opacity-0 h-px w-px -z-10" autocomplete="off" autocapitalize="off" spellcheck="false">
    </template>

    <SessionResult v-else-if="s" :total="deck.chapters[chIndex].words.length" :wrong="s.wrong" :duration="s.duration">
      <button class="btn" @click="restart">再练一遍</button>
      <button v-if="hasNext" class="btn btn-hl" @click="nextChapter">下一章</button>
      <RouterLink class="btn btn-ghost" :to="`/deck/${id}`">回章节列表</RouterLink>
    </SessionResult>
  </div>
</template>
