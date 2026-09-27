<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { stats, refreshStats } from './lib/store'

const route = useRoute()
const menuOpen = ref(false)

onMounted(refreshStats)
watch(() => route.fullPath, async () => {
  menuOpen.value = false
  await refreshStats()
})

const nav = [
  { to: '/', label: '今日学习', icon: 'home' },
  { to: '/library', label: '词库', icon: 'book' },
  { to: '/review', label: '复习', icon: 'repeat', badge: () => stats.due },
  { to: '/wrong', label: '错词本', icon: 'alert', badge: () => stats.wrong },
  { to: '/anki', label: 'Anki 导出', icon: 'download' },
]

const paths: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 19H6',
  repeat: 'M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 19h16',
}
</script>

<template>
  <div class="min-h-screen md:flex">
    <!-- 移动端顶栏 -->
    <div class="md:hidden flex items-center justify-between bg-brand-deep text-[#EEF2E6] px-4 h-14 sticky top-0 z-40">
      <RouterLink to="/" class="font-serif font-bold text-lg tracking-wide">
        词记 <span class="text-hl">WordMate</span>
      </RouterLink>
      <button class="p-2" @click="menuOpen = !menuOpen" aria-label="菜单">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path v-if="!menuOpen" d="M4 7h16M4 12h16M4 17h16" />
          <path v-else d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>

    <!-- 侧边栏（桌面）/ 下拉（移动） -->
    <aside
      class="bg-brand-deep text-[#CFD9C4] md:w-60 md:min-h-screen md:sticky md:top-0 md:self-start
             z-30 md:block"
      :class="menuOpen ? 'block' : 'hidden'"
    >
      <div class="hidden md:block px-6 pt-8 pb-6">
        <div class="font-serif font-bold text-2xl text-[#F3F5EC]">词记</div>
        <div class="text-hl text-sm tracking-widest mt-0.5">WORDMATE</div>
      </div>
      <nav class="py-2 md:py-0">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-6 py-3 text-sm transition-colors hover:bg-brand hover:text-white"
          active-class="!bg-brand !text-white border-l-[3px] border-hl"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round">
            <path :d="paths[item.icon]" />
          </svg>
          <span class="flex-1">{{ item.label }}</span>
          <span
            v-if="item.badge && item.badge() > 0"
            class="text-[11px] bg-hl text-brand-deep font-bold rounded-full min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center"
          >{{ item.badge() }}</span>
        </RouterLink>
      </nav>
      <div class="hidden md:block px-6 py-6 text-[11px] text-[#8FA084] leading-relaxed mt-10">
        数据保存在本机浏览器<br>词库来自开源 ECDICT
      </div>
    </aside>

    <!-- 主内容 -->
    <main class="flex-1 min-w-full md:min-w-0">
      <RouterView />
    </main>
  </div>
</template>
