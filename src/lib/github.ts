// GitHub 牌组仓库同步：用 Personal Access Token 把生成的 .apkg 上传到指定仓库存档
export interface GhConfig {
  token: string
  owner: string
  repo: string
  branch: string
}

const KEY = 'wordmate_gh'

export const DEFAULT_CONFIG: GhConfig = {
  token: '',
  owner: '',
  repo: 'wordmate-decks',
  branch: 'main',
}

export function getConfig(): GhConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(c: GhConfig) {
  localStorage.setItem(KEY, JSON.stringify(c))
}

function headers(c: GhConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${c.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function ghError(r: Response): Promise<string> {
  let detail = ''
  try {
    const j = await r.json()
    detail = j.message || ''
  } catch {
    /* ignore */
  }
  if (r.status === 401) return 'Token 无效或已过期（401），请检查后重新填写'
  if (r.status === 403) return `没有权限或被限流（403）：${detail}`
  if (r.status === 404)
    return '找不到仓库（404）：请确认 owner/repo 正确，且 Token 已授权该仓库'
  if (r.status === 422) return `内容校验失败（422）：${detail}`
  return `请求失败（${r.status}）：${detail}`
}

/** 校验连接，返回仓库全名 */
export async function verifyConfig(c: GhConfig): Promise<string> {
  const r = await fetch(
    `https://api.github.com/repos/${c.owner}/${c.repo}`,
    { headers: headers(c), cache: 'no-store' },
  )
  if (!r.ok) throw new Error(await ghError(r))
  const j = await r.json()
  return j.full_name as string
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export interface UploadResult {
  htmlUrl: string
  commitSha: string
  updated: boolean
}

/** 上传 .apkg；同名文件自动取 sha 更新 */
export async function uploadApkg(
  c: GhConfig,
  path: string,
  bytes: Uint8Array,
  message: string,
): Promise<UploadResult> {
  if (!c.token) throw new Error('还没有填写 GitHub Token')
  const api = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}`
  const common = headers(c)

  let sha: string | undefined
  const gr = await fetch(`${api}?ref=${c.branch}`, {
    headers: common,
    cache: 'no-store',
  })
  if (gr.status === 200) {
    sha = (await gr.json()).sha
  } else if (gr.status !== 404) {
    throw new Error(await ghError(gr))
  }

  const body: Record<string, string> = {
    message,
    content: bytesToBase64(bytes),
    branch: c.branch,
  }
  if (sha) body.sha = sha

  const r = await fetch(api, {
    method: 'PUT',
    headers: { ...common, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await ghError(r))
  const j = await r.json()
  return {
    htmlUrl: j.content.html_url,
    commitSha: j.commit.sha,
    updated: !!sha,
  }
}

// ===== 通用文本/JSON 文件读写（云同步用）=====
function textToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}
function base64ToText(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** 拉取文本文件；不存在返回 null */
export async function downloadText(
  c: GhConfig,
  path: string,
): Promise<string | null> {
  const r = await fetch(
    `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}?ref=${c.branch}`,
    { headers: headers(c), cache: 'no-store' },
  )
  if (r.status === 404) return null
  if (!r.ok) throw new Error(await ghError(r))
  const j = await r.json()
  return base64ToText(j.content)
}

/** 上传文本（同名自动取 sha 更新）；遇 409 冲突自动重新取 sha 重试，返回文件链接 */
export async function uploadText(
  c: GhConfig,
  path: string,
  text: string,
  message: string,
): Promise<{ htmlUrl: string; commitSha: string; updated: boolean }> {
  const api = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}`
  const common = headers(c)
  let lastErr = ''

  for (let attempt = 0; attempt < 4; attempt++) {
    let sha: string | undefined
    const gr = await fetch(`${api}?ref=${c.branch}`, {
    headers: common,
    cache: 'no-store',
  })
    if (gr.status === 200) sha = (await gr.json()).sha
    else if (gr.status !== 404) throw new Error(await ghError(gr))

    const body: Record<string, string> = {
      message,
      content: textToBase64(text),
      branch: c.branch,
    }
    if (sha) body.sha = sha

    const r = await fetch(api, {
      method: 'PUT',
      headers: { ...common, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      const j = await r.json()
      return {
        htmlUrl: j.content.html_url,
        commitSha: j.commit.sha,
        updated: !!sha,
      }
    }
    lastErr = await ghError(r)
    // sha 冲突（高频写/副本延迟）：退避后重新取 sha 重试
    if (r.status === 409 && attempt < 3) {
      await new Promise((res) => setTimeout(res, 600 * (attempt + 1)))
      continue
    }
    throw new Error(lastErr)
  }
  throw new Error(lastErr)
}
