<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { DeckData } from '../lib/types'
import { loadDeck, deckMeta } from '../lib/words'
import { speak } from '../lib/speech'
import SubmitSession from '../components/SubmitSession.vue'

const props = defineProps<{ id: string; ch?: string }>()
const router = useRouter()

const deck = ref<DeckData>()
const chIndex = computed(() => Math.max(0, Number(props.ch ?? 0)))
const hasNext = computed(() => !!deck.value && chIndex.value < deck.value.chapters.length - 1)
const restartKey = ref(0)
const meta = computed(() => deckMeta(props.id))

onMounted(async () => {
  deck.value = await loadDeck(props.id)
})

function nextChapter() {
  router.push(`/dictation/${props.id}/${chIndex.value + 1}`)
}
</script>

<template>
  <SubmitSession
    v-if="deck"
    :key="restartKey"
    :words="deck.chapters[chIndex].words"
    mode="dictation" :deck-id="id" auto-play
    :title="`${meta?.name} · ${deck.chapters[chIndex].title} · 听写`"
    :back-to="`/deck/${id}`"
  >
    <template #question="{ current }">
      <div class="text-center">
        <button class="w-24 h-24 rounded-full bg-brand-soft text-brand flex items-center justify-center
                       mx-auto hover:bg-brand hover:text-[#F3F5EC] transition-colors"
                @click.stop="speak(current.w)" aria-label="播放发音">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
               stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
            <path d="M18.5 5.5a9 9 0 0 1 0 13"/>
          </svg>
        </button>
        <div class="text-sm text-ink-soft mt-5">听发音，拼出单词（可点击重播）</div>
      </div>
    </template>
    <template #actions>
      <button class="btn" @click="restartKey++">再练一遍</button>
      <button v-if="hasNext" class="btn btn-hl" @click="nextChapter">下一章</button>
      <RouterLink class="btn btn-ghost" :to="`/deck/${id}`">回章节列表</RouterLink>
    </template>
  </SubmitSession>
</template>
