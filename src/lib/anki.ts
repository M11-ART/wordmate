// Anki .apkg 牌组生成（ankipack + sql.js，纯浏览器端）
import initSqlJs from 'sql.js'
import { Package, Deck, DeckConfig, Notetype, Note } from 'ankipack'
import type { WordItem } from './types'

export interface AnkiOptions {
  deckName: string
  tag: string
  recognize: boolean // 认读卡：英文 → 中文
  spelling: boolean // 拼写卡：中文 → 键盘拼写英文
  newPerDay: number
  desiredRetention: number
}

let sqlPromise: Promise<any> | null = null

function getSQL() {
  if (!sqlPromise) {
    const base = import.meta.env.BASE_URL
    sqlPromise = (async () => {
      // 直接取 wasm 字节传入，避免 locateFile 路径在预构建/部署子路径下解析错误
      const resp = await fetch(base + 'sql-wasm.wasm')
      const wasmBinary = await resp.arrayBuffer()
      return initSqlJs({ wasmBinary })
    })().catch((e) => {
      sqlPromise = null // 失败后允许重试
      throw e
    })
  }
  return sqlPromise
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function html(s: string): string {
  return esc(s).replace(/\n/g, '<br>')
}

const CARD_CSS = `
.card{font-family:-apple-system,"Noto Sans SC",sans-serif;font-size:22px;text-align:center;color:#222C24;background:#FCFBF5;}
.w{font-size:34px;font-weight:700;color:#26503F;font-family:Georgia,serif;}
.ph{color:#5A6659;font-size:17px;margin-top:4px;}
.t{text-align:left;display:inline-block;max-width:560px;margin-top:10px;line-height:1.6;}
.d{color:#8A9385;font-size:14px;text-align:left;display:inline-block;max-width:560px;margin-top:8px;}
.snd{display:inline-block;margin-top:12px;}
hr{border:none;border-top:1px solid #D3DAC6;margin:14px 0;}
input{font-size:20px;padding:6px 10px;border:2px solid #26503F;border-radius:4px;text-align:center;}
.typeGood{color:#26503F}.typeBad{color:#C2563A}
.typeMissed{color:#C2563A}
`

const SPEAKER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#26503F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>'

function buildModel(opt: AnkiOptions): Notetype {
  const fields = [
    { name: '单词' },
    { name: '音标' },
    { name: '释义' },
    { name: '英文释义' },
  ]
  const templates = []
  if (opt.recognize) {
    templates.push({
      name: '认词（英→中）',
      questionFormat:
        '<div class=w>{{单词}}</div><div class=ph>/{{音标}}/</div>' +
        '<a class=snd href="https://dict.youdao.com/dictvoice?audio={{单词}}&type=1">' +
        SPEAKER_SVG + '</a>',
      answerFormat:
        '{{FrontSide}}<hr id=answer><div class=t>{{释义}}</div>' +
        '<div class=d>{{英文释义}}</div>',
    })
  }
  if (opt.spelling) {
    templates.push({
      name: '拼写（中→英）',
      questionFormat: '<div class=t>{{释义}}</div><br>{{type:单词}}',
      answerFormat:
        '<div class=t>{{释义}}</div><hr id=answer>{{type:单词}}' +
        '<div class=ph>/{{音标}}/</div>',
    })
  }
  return new Notetype({
    name: 'WordMate 单词卡',
    css: CARD_CSS,
    fields,
    templates,
  })
}

/** 生成 apkg 的字节内容 */
export async function buildApkg(words: WordItem[], opt: AnkiOptions): Promise<Uint8Array> {
  const SQL = await getSQL()
  const model = buildModel(opt)
  const deck = new Deck({
    name: `WordMate::${opt.deckName}`,
    description: `由词记 WordMate 生成，共 ${words.length} 词`,
    config: new DeckConfig({
      name: `WordMate · ${opt.deckName}`,
      desiredRetention: opt.desiredRetention,
      newPerDay: opt.newPerDay,
    }),
  })
  for (const item of words) {
    deck.addNote(
      new Note({
        notetype: model,
        fields: [
          esc(item.w),
          esc(item.p),
          html(item.t),
          item.d ? html(item.d) : '',
        ],
        tags: ['WordMate', opt.tag],
      }),
    )
  }
  const pkg = new Package()
  pkg.addDeck(deck)
  return pkg.toUint8Array(SQL)
}
