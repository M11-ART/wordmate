<script setup lang="ts">
defineProps<{
  index: number
  total: number
  wrong: number
  backTo: string
  title: string
}>()
</script>

<template>
  <div class="bg-card border-b border-line sticky top-0 md:top-0 z-20">
    <div class="max-w-4xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
      <RouterLink :to="backTo" class="text-ink-soft hover:text-brand text-sm flex items-center gap-1 shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        <span class="hidden sm:inline">退出</span>
      </RouterLink>
      <div class="flex-1">
        <div class="flex justify-between text-xs text-ink-soft mb-1.5">
          <span>{{ title }}</span>
          <span>{{ Math.min(index + 1, total) }} / {{ total }}</span>
        </div>
        <div class="h-1.5 bg-line/60 rounded-full overflow-hidden">
          <div class="h-full bg-brand rounded-full transition-all duration-200"
               :style="{ width: ((index) / total) * 100 + '%' }"></div>
        </div>
      </div>
      <div class="text-sm text-clay font-medium shrink-0">错 {{ wrong }}</div>
    </div>
  </div>
</template>
