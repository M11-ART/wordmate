<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { verifyConfig } from '../lib/github'
import {
  getSyncConfig,
  saveSyncConfig,
  isLoggedIn,
  fullSync,
  lastSyncAt,
  logout,
  type SyncResult,
} from '../lib/sync'
import { stats, refreshStats } from '../lib/store'

const cfg = ref(getSyncConfig())
const logged = ref(isLoggedIn(cfg.value))
const busy = ref(false)
const msg = ref('')
const result = ref<SyncResult | null>(null)
const showToken = ref(false)
const showHelp = ref(false)
const lastAt = ref(lastSyncAt())

onMounted(refreshStats)

function fmt(t: number | null): string {
  if (!t) return '尚未同步'
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function loginAndSync() {
  msg.value = ''
  result.value = null
  if (!cfg.value.owner.trim() || !cfg.value.token.trim()) {
    msg.value = '请填写 GitHub 用户名和 Token'
    return
  }
  busy.value = true
  try {
    saveSyncConfig(cfg.value)
    await verifyConfig(cfg.value)
    result.value = await fullSync(cfg.value)
    logged.value = true
    lastAt.value = lastSyncAt()
    await refreshStats()
  } catch (e) {
    msg.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function syncNow() {
  msg.value = ''
  result.value = null
  busy.value = true
  try {
    result.value = await fullSync(cfg.value)
    lastAt.value = lastSyncAt()
    await refreshStats()
  } catch (e) {
    msg.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function doLogout() {
  logout()
  cfg.value = getSyncConfig()
  logged.value = false
  result.value = null
  msg.value = '已退出登录，本机数据仍保留'
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12">
    <h1 class="font-serif text-2xl md:text-3xl font-bold">云同步</h1>
    <p class="text-ink-soft text-sm mt-2 leading-relaxed">
      用 GitHub 账号登录，学习数据存到你自己的仓库，手机和电脑登录同一账号即可互通。
      Token 仅保存在本机浏览器。
    </p>

    <!-- 已登录 -->
    <div v-if="logged" class="space-y-5 mt-8">
      <div class="panel p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-bold flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-full bg-brand"></span>
              已登录 {{ cfg.owner }}
            </div>
            <div class="text-xs text-ink-soft mt-1">仓库 {{ cfg.repo }} · 分支 {{ cfg.branch }}</div>
          </div>
          <button class="text-xs text-ink-soft border border-line rounded-sm px-3 py-1.5 hover:bg-brand-soft"
                  @click="doLogout">退出登录</button>
        </div>
        <hr class="my-4">
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <div class="text-xl font-bold text-brand">{{ stats.studied }}</div>
            <div class="text-xs text-ink-soft mt-0.5">累计学过</div>
          </div>
          <div>
            <div class="text-xl font-bold text-brand">{{ stats.wrong }}</div>
            <div class="text-xs text-ink-soft mt-0.5">错词</div>
          </div>
          <div>
            <div class="text-xl font-bold text-brand">{{ stats.due }}</div>
            <div class="text-xs text-ink-soft mt-0.5">待复习</div>
          </div>
        </div>
        <div class="text-xs text-ink-soft mt-4">上次同步：{{ fmt(lastAt) }}</div>
        <button class="btn btn-hl w-full mt-3 py-2.5" :disabled="busy" @click="syncNow">
          {{ busy ? '同步中…' : '立即同步' }}
        </button>
      </div>

      <div v-if="result" class="panel p-5 text-sm space-y-2">
        <div class="font-bold text-brand">同步完成</div>
        <div class="text-ink-soft">
          {{ result.pulled ? '已从云端拉取并合并' : '云端暂无备份，已首次上传' }}
          <template v-if="result.merged">
            （合并后共 {{ result.merged.records }} 词、{{ result.merged.logs }} 条学习记录）
          </template>
        </div>
        <a v-if="result.htmlUrl" class="text-brand break-all text-xs" :href="result.htmlUrl" target="_blank">
          {{ result.htmlUrl }}
        </a>
      </div>
      <div v-if="msg" class="text-xs text-ink-soft">{{ msg }}</div>
    </div>

    <!-- 未登录：表单 -->
    <div v-else class="panel p-6 mt-8 space-y-4">
      <div>
        <label class="block text-xs text-ink-soft mb-1">GitHub 用户名</label>
        <input v-model="cfg.owner" placeholder="你的 GitHub 用户名"
               class="w-full border border-line rounded-sm px-3 py-2 text-sm bg-card">
      </div>
      <div>
        <label class="block text-xs text-ink-soft mb-1">GitHub Token</label>
        <div class="flex gap-2">
          <input :type="showToken ? 'text' : 'password'" v-model="cfg.token"
                 placeholder="github_pat_..."
                 class="flex-1 border border-line rounded-sm px-3 py-2 text-sm bg-card">
          <button type="button" class="text-xs border border-line rounded-sm px-3 text-ink-soft"
                  @click="showToken = !showToken">{{ showToken ? '隐藏' : '显示' }}</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-ink-soft mb-1">数据仓库</label>
          <input v-model="cfg.repo" class="w-full border border-line rounded-sm px-3 py-2 text-sm bg-card">
        </div>
        <div>
          <label class="block text-xs text-ink-soft mb-1">分支</label>
          <input v-model="cfg.branch" class="w-full border border-line rounded-sm px-3 py-2 text-sm bg-card">
        </div>
      </div>

      <button class="btn btn-hl w-full py-2.5" :disabled="busy" @click="loginAndSync">
        {{ busy ? '登录同步中…' : '登录并立即同步' }}
      </button>
      <div v-if="msg" class="text-xs text-red-700 leading-relaxed">{{ msg }}</div>

      <!-- 如何获取 token -->
      <div class="border-t border-line pt-3">
        <button class="text-sm text-brand font-bold w-full flex justify-between items-center"
                @click="showHelp = !showHelp">
          如何获取 Token（手机/电脑通用）
          <span>{{ showHelp ? '−' : '+' }}</span>
        </button>
        <ol v-if="showHelp" class="text-xs text-ink-soft mt-3 space-y-2 list-decimal list-inside leading-relaxed">
          <li>先在 GitHub 新建一个与上方同名的数据仓库（可设为私有），默认名 <b>wordmate-data</b></li>
          <li>浏览器打开（手机登录 GitHub 后同样可开）：<br>
            <a class="text-brand break-all" href="https://github.com/settings/personal-access-tokens/new" target="_blank">
              github.com/settings/personal-access-tokens/new</a></li>
          <li>Token name 填 wordmate；Expiration 选 90 天；Repository access 选 Only select repositories，勾选数据仓库</li>
          <li>展开 Repository permissions，把 <b>Contents</b> 设为 <b>Read and write</b></li>
          <li>Generate token 后复制 <b>github_pat_...</b>，粘贴到上方 Token 框即可</li>
        </ol>
      </div>
    </div>
  </div>
</template>
