<script setup lang="ts">
import { ref } from 'vue'
import { speak, getRate, setRate } from '../lib/speech'

const props = defineProps<{ word: string }>()
const rate = ref(getRate())

function play() {
  speak(props.word)
}
function onChange(e: Event) {
  const v = parseFloat((e.target as HTMLSelectElement).value)
  rate.value = v
  setRate(v)
  speak(props.word)
}
const rates = [
  { v: '0.7', label: '慢速' },
  { v: '0.85', label: '较慢' },
  { v: '1', label: '标准' },
  { v: '1.2', label: '较快' },
]
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <button type="button" class="text-brand hover:text-brand-deep transition-colors"
            @click.stop="play" aria-label="发音">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
    <select :value="rate" @change="onChange" aria-label="语速"
            class="text-xs bg-paper border border-line rounded-sm py-1 pl-1.5 pr-1 text-ink-soft cursor-pointer outline-none focus:border-brand">
      <option v-for="r in rates" :key="r.v" :value="r.v">{{ r.label }}</option>
    </select>
  </span>
</template>
