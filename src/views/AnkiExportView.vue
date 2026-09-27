<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DECKS, loadDeck, deckMeta } from '../lib/words'
import { getAllRecords } from '../lib/db'
import { buildApkg } from '../lib/anki'
import { saveAs } from 'file-saver'
import type { WordItem } from '../lib/types'

type Source = 'deck' | 'wrong' | 'studied'
const source = ref<Source>('deck')
const deckId = ref('cet4')
const allChapters = ref(true)
const fromCh = ref(0)
const toCh = ref(999)

const recognize = ref(true)
const spelling = ref(true)
const newPerDay = ref(20)
const desiredRetention = ref(0.9)

const deck = ref()
const wrongCount = ref(0)
const studiedCount = ref(0)
const generating = ref(false)
const previewFlip = ref(false)
const previewType = ref<'rec' | 'spell'>('rec')

onMounted(async () => {
  await selectDeck(deckId.value)
  const recs = await getAllRecords()
  wrongCount.value = recs.filter((r) => r.wrongCount > 0).length
  studiedCount.value = recs.filter((r) => r.studied).length
})

async function selectDeck(id: string) {
  deckId.value = id
  deck.value = await loadDeck(id)
  toCh.value = deck.value.chapters.length - 1
}

function onAllChaptersChange(e: Event) {
  if (!(e.target as HTMLInputElement).checked) toCh.value = fromCh.value
}

const words = computed<WordItem[]>(() => {
  if (source.value === 'deck' && deck.value) {
    const start = allChapters.value ? 0 : fromCh.value
    const end = allChapters.value ? deck.value.chapters.length - 1 : toCh.value
    const out: WordItem[] = []
    for (let i = start; i <= end; i++) out.push(...deck.value.chapters[i].words)
    return out
  }
  return []
})

const dynamicWords = ref<WordItem[]>([])
async function ensureDynamic() {
  if (source.value !== 'deck') {
    const recs = await getAllRecords()
    dynamicWords.value = recs
      .filter((r) => (source.value === 'wrong' ? r.wrongCount > 0 : r.studied))
      .map((r) => ({ w: r.word, p: r.phonetic ?? '', t: r.translation ?? '' }))
  }
}

const effectiveWords = computed(() =>
  source.value === 'deck' ? words.value : dynamicWords.value,
)
const cardKinds = computed(() => (recognize.value ? 1 : 0) + (spelling.value ? 1 : 0))
const totalCards = computed(() => effectiveWords.value.length * cardKinds.value)

const sample = computed(() => effectiveWords.value[0])
const deckName = computed(() => {
  if (source.value === 'wrong') return '错词本'
  if (source.value === 'studied') return '已学词汇'
  return deckMeta(deckId.value)?.name ?? '词库'
})

async function generate() {
  if (!recognize.value && !spelling.value) return
  generating.value = true
  try {
    await ensureDynamic()
    const list = source.value === 'deck' ? words.value : dynamicWords.value
    const bytes = await buildApkg(list, {
      deckName: deckName.value,
      tag: source.value === 'deck' ? deckId.value : source.value,
      recognize: recognize.value,
      spelling: spelling.value,
      newPerDay: newPerDay.value,
      desiredRetention: desiredRetention.value,
    })
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' })
    const fileId = source.value === 'deck' ? deckId.value : source.value
    saveAs(blob, `WordMate-${fileId}.apkg`)
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
    <h1 class="font-serif text-2xl md:text-3xl font-bold">生成 Anki 牌组</h1>
    <p class="text-ink-soft text-sm mt-2">纯浏览器端生成，单词不会上传；牌组已内置 FSRS 调度参数</p>

    <div class="grid md:grid-cols-2 gap-6 mt-8">
      <!-- 左：配置 -->
      <div class="space-y-6">
        <!-- 来源 -->
        <div class="panel p-5">
          <div class="text-sm font-bold mb-3">1. 选择要导出的词</div>
          <label class="flex items-center gap-2 text-sm py-1 cursor-pointer">
            <input type="radio" value="deck" v-model="source" class="accent-brand"> 考试词库
          </label>
          <div v-if="source === 'deck'" class="pl-6 mt-2 space-y-2">
            <select class="text-sm border border-line rounded-sm px-2 py-1.5 bg-card w-full"
                    :value="deckId" @change="selectDeck(String(($event.target as HTMLSelectElement).value))">
              <option v-for="d in DECKS" :key="d.id" :value="d.id">{{ d.name }}（{{ d.total }} 词）</option>
            </select>
            <label class="flex items-center gap-2 text-xs text-ink-soft cursor-pointer">
              <input type="checkbox" v-model="allChapters" class="accent-brand"
                     @change="onAllChaptersChange">
              全部章节
            </label>
            <div v-if="!allChapters" class="flex items-center gap-2 text-xs">
              <select v-model.number="fromCh" class="border border-line rounded-sm px-1 py-1 bg-card">
                <option v-for="ch in deck.chapters" :key="ch.id" :value="ch.id">{{ ch.title }}</option>
              </select>
              至
              <select v-model.number="toCh" class="border border-line rounded-sm px-1 py-1 bg-card">
                <option v-for="ch in deck.chapters" :key="ch.id" :value="ch.id">{{ ch.title }}</option>
              </select>
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm py-1 cursor-pointer">
            <input type="radio" value="wrong" v-model="source" class="accent-brand">
            错词本（{{ wrongCount }} 词）
          </label>
          <label class="flex items-center gap-2 text-sm py-1 cursor-pointer">
            <input type="radio" value="studied" v-model="source" class="accent-brand">
            已学词汇（{{ studiedCount }} 词）
          </label>
        </div>

        <!-- 卡片类型 -->
        <div class="panel p-5">
          <div class="text-sm font-bold mb-3">2. 卡片类型</div>
          <label class="flex items-start gap-2 text-sm py-1 cursor-pointer">
            <input type="checkbox" v-model="recognize" class="accent-brand mt-1">
            <span><b>认读卡（英→中）</b><span class="text-ink-soft text-xs block">看单词回忆释义，附音标与发音入口</span></span>
          </label>
          <label class="flex items-start gap-2 text-sm py-1 cursor-pointer">
            <input type="checkbox" v-model="spelling" class="accent-brand mt-1">
            <span><b>拼写卡（中→英）</b><span class="text-ink-soft text-xs block">看释义键盘拼出单词，Anki 自动批改</span></span>
          </label>
        </div>

        <!-- 调度参数 -->
        <div class="panel p-5">
          <div class="text-sm font-bold mb-3">3. FSRS 学习参数</div>
          <div class="flex items-center justify-between text-sm">
            <span>每日新词上限</span>
            <input type="number" v-model.number="newPerDay" min="1" max="200"
                   class="w-20 border border-line rounded-sm px-2 py-1 text-sm bg-card text-center">
          </div>
          <div class="flex items-center justify-between text-sm mt-3">
            <span>目标记忆保留率</span>
            <select v-model.number="desiredRetention" class="border border-line rounded-sm px-2 py-1 text-sm bg-card">
              <option :value="0.85">85%（量大）</option>
              <option :value="0.9">90%（推荐）</option>
              <option :value="0.95">95%（复习多）</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 右：预览 + 生成 -->
      <div>
        <div class="panel p-5 sticky top-4">
          <div class="text-sm font-bold mb-3">卡片预览</div>
          <div class="flex gap-2 mb-3">
            <button class="text-xs px-3 py-1 rounded-sm"
                    :class="previewType === 'rec' ? 'bg-brand text-white' : 'bg-brand-soft text-brand'"
                    @click="previewType = 'rec'; previewFlip = false">认读卡</button>
            <button class="text-xs px-3 py-1 rounded-sm"
                    :class="previewType === 'spell' ? 'bg-brand text-white' : 'bg-brand-soft text-brand'"
                    @click="previewType = 'spell'; previewFlip = false">拼写卡</button>
          </div>

          <div v-if="sample" class="border border-line rounded-sm bg-[#FCFBF5] min-h-[210px] px-5 py-6 text-center cursor-pointer"
               @click="previewFlip = !previewFlip">
            <!-- 认读卡 -->
            <template v-if="previewType === 'rec'">
              <template v-if="!previewFlip">
                <div class="font-mono text-3xl font-bold text-brand">{{ sample.w }}</div>
                <div class="text-ink-soft text-sm mt-1">/ {{ sample.p }} /</div>
                <div class="text-[11px] text-ink-soft mt-6">点击卡片看释义</div>
              </template>
              <template v-else>
                <div class="font-mono text-xl font-bold text-brand">{{ sample.w }}</div>
                <hr class="my-3">
                <div class="text-sm whitespace-pre-line text-left">{{ sample.t }}</div>
              </template>
            </template>
            <!-- 拼写卡 -->
            <template v-else>
              <template v-if="!previewFlip">
                <div class="text-sm text-left whitespace-pre-line">{{ sample.t }}</div>
                <input class="mt-5 text-lg border-2 border-brand rounded px-2 py-1 text-center w-40" placeholder="拼写单词">
                <div class="text-[11px] text-ink-soft mt-5">点击看答案</div>
              </template>
              <template v-else>
                <div class="text-sm text-left whitespace-pre-line">{{ sample.t }}</div>
                <hr class="my-3">
                <div class="font-mono text-2xl font-bold text-brand">{{ sample.w }}</div>
                <div class="text-ink-soft text-sm mt-1">/ {{ sample.p }} /</div>
              </template>
            </template>
          </div>
          <div v-else class="text-xs text-ink-soft py-10 text-center">所选范围内暂无单词</div>

          <div class="text-xs text-ink-soft mt-4 flex justify-between">
            <span>单词 {{ effectiveWords.length }} 个</span>
            <span>共生成卡片 {{ totalCards }} 张</span>
          </div>
          <button class="btn btn-hl w-full mt-4 py-2.5" :disabled="!cardKinds || generating" @click="generate">
            {{ generating ? '生成中…' : '下载 .apkg 牌组' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="panel p-6 mt-8">
      <div class="text-sm font-bold mb-3">如何导入 Anki</div>
      <ol class="text-sm text-ink-soft space-y-2 list-decimal list-inside leading-relaxed">
        <li>电脑端在 <a class="text-brand" href="https://apps.ankiweb.net" target="_blank">apps.ankiweb.net</a> 下载安装 Anki（免费）；Android 在应用商店搜 AnkiDroid（免费），iOS 为 AnkiMobile（收费）</li>
        <li>电脑端：双击下载的 WordMate-xxx.apkg 即自动导入；手机端：把文件发到手机，选择"用 Anki 打开"</li>
        <li>牌组位于 <b>WordMate</b> 父牌组下；每天打开 Anki 刷"到期"卡片，按 重来 / 困难 / 良好 / 简单 自评即可</li>
        <li>同一牌组可重复导出，Anki 按单词识别不会产生重复卡片</li>
      </ol>
    </div>
  </div>
</template>
