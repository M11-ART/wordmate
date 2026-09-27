<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import type { WordItem, StudyMode } from '../lib/types'
import { useSession } from '../lib/useSession'
import { speak } from '../lib/speech'
import SessionHeader from './SessionHeader.vue'
import SessionResult from './SessionResult.vue'
import SpeakerButton from './SpeakerButton.vue'
import WordDetail from './WordDetail.vue'

const props = defineProps<{
  words: WordItem[]
  mode: StudyMode
  deckId: string
  title: string
  backTo: string
  autoPlay?: boolean
}>()

const { s, submit, goPrev, goNext } = useSession(props.words, props.mode, props.deckId)
const inputEl = ref<HTMLInputElement>()

function focusInput() {
  inputEl.value?.focus()
}

onMounted(async () => {
  await nextTick()
  focusInput()
  if (props.autoPlay) speak(s.current.w)
})

watch(
  () => s.index,
  () => {
    focusInput()
    if (props.autoPlay) setTimeout(() => speak(s.current.w), 300)
  },
)
</script>

<template>
  <div>
    <SessionHeader :index="s.index" :total="words.length" :wrong="s.wrong"
                   :back-to="backTo" :title="title" />

    <template v-if="!s.finished">
      <div class="max-w-2xl mx-auto px-4 md:px-8 py-12 md:py-16" @click="focusInput">
        <!-- 题目区 -->
        <slot name="question" :current="s.current" :state="s.state" />

        <!-- 输入 -->
        <div class="mt-10">
          <input
            ref="inputEl"
            :value="s.input"
            @input="s.input = ($event.target as HTMLInputElement).value"
            @keydown.enter="submit"
            autocomplete="off" autocapitalize="off" spellcheck="false"
            :disabled="s.state !== 'asking'"
            class="w-full text-center font-mono text-2xl md:text-3xl tracking-[0.12em] bg-transparent
                   border-b-2 outline-none py-2 transition-colors"
            :class="{
              'border-brand': s.state === 'asking',
              'border-clay text-clay': s.state === 'wrong',
              'border-brand text-brand': s.state === 'correct',
            }"
          >
        </div>

        <!-- 反馈 -->
        <div v-if="s.state === 'correct'" class="text-center text-brand mt-4 text-sm font-medium">拼写正确</div>
        <div v-if="s.state === 'wrong'" class="panel mt-6 px-6 py-5">
          <div class="text-clay text-sm mb-2">正确答案：</div>
          <div class="font-mono text-2xl md:text-3xl font-bold text-brand">{{ s.current.w }}</div>
          <div class="text-ink-soft mt-1">/ {{ s.current.p }} /</div>
          <div class="text-sm mt-3 whitespace-pre-line text-ink">{{ s.current.t }}</div>
          <div class="text-xs text-ink-soft mt-4 text-center">按回车继续</div>
        </div>
        <div v-if="s.state === 'asking'" class="text-center text-xs text-ink-soft mt-5">输入完整单词后按回车提交</div>

        <!-- 手动切换 + 发音语速 -->
        <div class="flex items-center justify-center gap-6 mt-7">
          <button type="button"
                  class="text-sm text-ink-soft hover:text-brand transition-colors disabled:opacity-30 disabled:hover:text-ink-soft"
                  :disabled="s.index === 0" @click="goPrev">‹ 上一词</button>
          <SpeakerButton :word="s.current.w" />
          <button type="button"
                  class="text-sm text-ink-soft hover:text-brand transition-colors disabled:opacity-30 disabled:hover:text-ink-soft"
                  :disabled="s.index >= words.length - 1" @click="goNext">下一词 ›</button>
        </div>

        <WordDetail :item="s.current" />
      </div>
    </template>

    <SessionResult v-else :total="words.length" :wrong="s.wrong" :duration="s.duration">
      <slot name="actions" />
    </SessionResult>
  </div>
</template>
