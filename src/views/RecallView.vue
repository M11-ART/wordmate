<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { DeckData } from '../lib/types'
import { loadDeck, deckMeta } from '../lib/words'
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
  router.push(`/recall/${props.id}/${chIndex.value + 1}`)
}
</script>

<template>
  <SubmitSession
    v-if="deck"
    :key="restartKey"
    :words="deck.chapters[chIndex].words"
    mode="recall" :deck-id="id"
    :title="`${meta?.name} · ${deck.chapters[chIndex].title} · 默写`"
    :back-to="`/deck/${id}`"
  >
    <template #question="{ current }">
      <div class="panel px-8 py-10 text-center">
        <div class="text-xs text-ink-soft tracking-widest mb-4">看中文释义，默写英文</div>
        <div class="text-xl md:text-2xl whitespace-pre-line leading-relaxed">{{ current.t }}</div>
      </div>
    </template>
    <template #actions>
      <button class="btn" @click="restartKey++">再练一遍</button>
      <button v-if="hasNext" class="btn btn-hl" @click="nextChapter">下一章</button>
      <RouterLink class="btn btn-ghost" :to="`/deck/${id}`">回章节列表</RouterLink>
    </template>
  </SubmitSession>
</template>
