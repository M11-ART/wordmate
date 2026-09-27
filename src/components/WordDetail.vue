<script setup lang="ts">
import { ref } from 'vue'
import type { WordItem } from '../lib/types'
import SpeakerButton from './SpeakerButton.vue'

defineProps<{ item: WordItem }>()
const open = ref(false)
</script>

<template>
  <div class="panel mt-6 overflow-hidden">
    <button type="button"
            class="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-ink hover:bg-brand-soft/40 transition-colors"
            @click="open = !open">
      <span>单词详解 · 释义 / 例句 / 记忆法</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round"
           class="transition-transform duration-200" :class="{ 'rotate-180': open }">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <div v-show="open" class="px-5 pb-5 border-t border-line/70">
      <!-- 单词 + 音标 + 发音 -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 pt-4">
        <span class="font-mono text-xl font-bold text-brand">{{ item.w }}</span>
        <span v-if="item.p" class="text-ink-soft text-sm">/ {{ item.p }} /</span>
        <SpeakerButton :word="item.w" />
      </div>

      <!-- 中文释义 -->
      <div class="mt-4">
        <div class="text-[11px] tracking-wider text-ink-soft">中文释义</div>
        <div class="text-[15px] whitespace-pre-line mt-1">{{ item.t }}</div>
      </div>

      <!-- 英文释义 -->
      <div v-if="item.d" class="mt-3">
        <div class="text-[11px] tracking-wider text-ink-soft">英文释义</div>
        <div class="text-sm text-ink-soft whitespace-pre-line mt-1">{{ item.d }}</div>
      </div>

      <!-- 场景例句 -->
      <div v-if="item.examples && item.examples.length" class="mt-4">
        <div class="text-[11px] tracking-wider text-ink-soft">场景例句（Tatoeba）</div>
        <ul class="mt-2 space-y-3">
          <li v-for="(ex, i) in item.examples" :key="i" class="border-l-2 border-hl pl-3">
            <div class="text-[15px] leading-relaxed">{{ ex.en }}</div>
            <div class="text-sm text-ink-soft mt-0.5">{{ ex.zh }}</div>
          </li>
        </ul>
      </div>

      <!-- 记忆小提示 -->
      <div v-if="item.tip" class="mt-4 bg-hl/25 border border-hl/60 rounded-sm px-4 py-3">
        <div class="text-xs font-medium flex items-center gap-1.5 text-[#8a6a1f]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.663 17h4.673M12 3v1M18.364 5.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          记忆小提示
        </div>
        <div class="text-sm mt-1.5 whitespace-pre-line leading-relaxed">{{ item.tip }}</div>
      </div>
    </div>
  </div>
</template>
