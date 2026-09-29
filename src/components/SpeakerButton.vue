<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { speak, getRate, setRate } from '../lib/speech'

const props = defineProps<{ word: string }>()
const rate = ref(getRate())
const open = ref(false)
const root = ref<HTMLElement>()

const rates = [
  { v: 0.7, label: '慢速' },
  { v: 0.85, label: '较慢' },
  { v: 1, label: '标准' },
  { v: 1.2, label: '较快' },
]
const currentLabel = computed(
  () => rates.find((r) => r.v === rate.value)?.label ?? '语速',
)

function play() {
  speak(props.word)
}
function toggle() {
  open.value = !open.value
}
function choose(v: number) {
  rate.value = v
  setRate(v)
  open.value = false
  speak(props.word)
}
function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <span ref="root" class="relative inline-flex items-center gap-1.5">
    <button type="button" class="text-brand hover:text-brand-deep transition-colors"
            @click.stop="play" aria-label="发音">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>

    <button type="button" @click.stop="toggle" aria-label="语速"
            class="inline-flex items-center gap-1 text-xs bg-paper border border-line rounded-sm py-1 px-2 text-ink-soft hover:border-brand outline-none">
      {{ currentLabel }}
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6">
        <path d="M2 4.5 6 8.5 10 4.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <span v-if="open"
          class="absolute top-full left-5 mt-1 z-50 min-w-[86px] bg-card border border-line rounded-sm shadow-lg overflow-hidden">
      <button v-for="r in rates" :key="r.v" type="button" @click.stop="choose(r.v)"
              class="block w-full text-left text-xs px-3 py-1.5 transition-colors"
              :class="r.v === rate
                ? 'text-brand font-bold bg-brand-soft'
                : 'text-ink-soft hover:bg-brand-soft'">
        {{ r.label }}
      </button>
    </span>
  </span>
</template>
