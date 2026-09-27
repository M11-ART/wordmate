<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ total: number; wrong: number; duration: number }>()
const accuracy = computed(() =>
  props.total ? Math.max(0, Math.round((1 - props.wrong / (props.total + props.wrong)) * 100)) : 100,
)
const mmss = computed(() => `${Math.floor(props.duration / 60)}分${props.duration % 60}秒`)
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-14 md:py-20 text-center">
    <div class="text-sm tracking-widest text-ink-soft">本组练习完成</div>
    <h2 class="font-serif text-3xl md:text-4xl font-bold mt-3">
      {{ total }} 个词<span class="text-brand">已过完</span>
    </h2>
    <div class="panel mt-10 grid grid-cols-3 divide-x divide-line">
      <div class="py-7">
        <div class="font-serif text-3xl font-bold text-brand">{{ total }}</div>
        <div class="text-xs text-ink-soft mt-1">学习词数</div>
      </div>
      <div class="py-7">
        <div class="font-serif text-3xl font-bold" :class="wrong ? 'text-clay' : 'text-brand'">{{ wrong }}</div>
        <div class="text-xs text-ink-soft mt-1">错误次数</div>
      </div>
      <div class="py-7">
        <div class="font-serif text-3xl font-bold text-brand">{{ accuracy }}%</div>
        <div class="text-xs text-ink-soft mt-1">正确率</div>
      </div>
    </div>
    <div class="text-sm text-ink-soft mt-4">用时 {{ mmss }}</div>
    <div class="flex flex-wrap gap-3 justify-center mt-9">
      <slot />
    </div>
  </div>
</template>
