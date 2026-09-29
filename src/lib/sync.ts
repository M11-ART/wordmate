// 云账号与多设备同步：学习数据存档在用户自己的 GitHub 仓库，手机/电脑登录后互通
import { exportData, importMerge } from './db'
import {
  downloadText,
  uploadText,
  getConfig as getDeckConfig,
  type GhConfig,
} from './github'

const CFG_KEY = 'wordmate_sync'
const AT_KEY = 'wordmate_sync_at'
const DATA_PATH = 'wordmate-data.json'

export const SYNC_DEFAULT: GhConfig = {
  token: '',
  owner: '',
  repo: 'wordmate-data',
  branch: 'main',
}

export function getSyncConfig(): GhConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) return { ...SYNC_DEFAULT, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  // 首次：若 Anki 配置里已有 token / 用户名，借用预填
  const deck = getDeckConfig()
  return { ...SYNC_DEFAULT, token: deck.token, owner: deck.owner }
}

export function saveSyncConfig(c: GhConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(c))
}

export function isLoggedIn(c: GhConfig = getSyncConfig()): boolean {
  return !!(c.token && c.owner && c.repo)
}

export function lastSyncAt(): number | null {
  const v = localStorage.getItem(AT_KEY)
  return v ? Number(v) : null
}

// 互斥锁：所有云端操作串行执行，避免并发拉取/上传使文件 sha 过期（HTTP 409）
let chain: Promise<unknown> = Promise.resolve()
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(() => fn())
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export interface SyncResult {
  pulled: boolean
  merged: { records: number; logs: number } | null
  pushed: boolean
  htmlUrl?: string
}

async function doFullSync(c: GhConfig): Promise<SyncResult> {
  if (!isLoggedIn(c)) throw new Error('请先登录（填写 Token 与 GitHub 用户名）')
  let merged: { records: number; logs: number } | null = null
  const remote = await downloadText(c, DATA_PATH)
  if (remote) merged = await importMerge(JSON.parse(remote))

  const payload = await exportData()
  const up = await uploadText(
    c,
    DATA_PATH,
    JSON.stringify(payload),
    `sync wordmate data ${new Date().toISOString()}`,
  )
  localStorage.setItem(AT_KEY, String(Date.now()))
  return { pulled: !!remote, merged, pushed: true, htmlUrl: up.htmlUrl }
}

/** 完整同步：先拉取合并，再把并集上传（加锁串行） */
export function fullSync(c = getSyncConfig()): Promise<SyncResult> {
  return withLock(() => doFullSync(c))
}

async function doAutoPull(): Promise<boolean> {
  const c = getSyncConfig()
  if (!isLoggedIn(c)) return false
  const remote = await downloadText(c, DATA_PATH)
  if (remote) await importMerge(JSON.parse(remote))
  localStorage.setItem(AT_KEY, String(Date.now()))
  return !!remote
}

/** 启动时静默拉取合并（失败不打扰） */
export function autoPullOnStart(): Promise<boolean> {
  return withLock(doAutoPull)
}

async function doPush(): Promise<void> {
  const c = getSyncConfig()
  if (!isLoggedIn(c)) return
  const p = await exportData()
  await uploadText(
    c,
    DATA_PATH,
    JSON.stringify(p),
    `auto sync ${new Date().toISOString()}`,
  )
  localStorage.setItem(AT_KEY, String(Date.now()))
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
/** 学习动作后防抖自动上传（与其它同步操作互斥） */
export function scheduleAutoPush(delay = 8000) {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    withLock(doPush).catch(() => {})
  }, delay)
}

/** 退出登录：清除 Token（保留用户名/仓库，便于下次登录） */
export function logout() {
  const c = getSyncConfig()
  c.token = ''
  saveSyncConfig(c)
}
