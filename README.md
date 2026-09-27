# 词记 WordMate

一个运行在浏览器里、数据完全存在本机的背单词工具。打字跟打、听写、默写三种学习方式，FSRS 间隔重复算法安排复习，错词自动归集，并可一键导出为 Anki `.apkg` 牌组。

## 功能

- **打字跟打**：看单词和释义，逐字母键入，敲错不前进，敲对自动进入下一词（参考 QwertyLearner）。
- **听写**：听发音（英式/美式），键盘拼出单词，回车提交。
- **默写**：看中文释义，默写英文单词。
- **FSRS 复习**：学过的词按 [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) 算法在快要忘记时回到复习队列，翻面后按「重来 / 困难 / 良好 / 简单」自评；支持键盘快捷键 1–4、空格翻面。
- **错词本**：学习中拼错的词自动入库，可按错词听写 / 错词默写专项巩固。
- **Anki 导出**：把任意词库、章节范围、错词本、已学词汇导出为 `.apkg`，含「认读卡（英→中）」和「拼写卡（中→英，Anki 自动批改）」两种卡片，牌组内置 FSRS 调度参数。
- **学习统计**：今日/累计学习量、错词数、学习天数、近 7 天学习柱状图、各词库进度。

## 词库

内置 7 个考试词库，数据来自开源词典 [ECDICT](https://github.com/skywind3000/ECDICT)，按 COCA 词频排序、每 30 词一章：

| 词库 | 单词数 | 章节数 |
| --- | --- | --- |
| 高考（gk） | 3677 | 123 |
| CET-4（cet4） | 3849 | 129 |
| CET-6（cet6） | 5407 | 181 |
| 考研（ky） | 4801 | 161 |
| 雅思（ielts） | 5040 | 168 |
| 托福（toefl） | 6974 | 233 |
| GRE（gre） | 7504 | 251 |

词库 JSON 位于 `public/data/`。如需重新生成，先运行 `scripts/fetch_dict.py`（或 `resume_dict.py` 断点续传）下载 ECDICT，再运行 `scripts/extract_words.py`。

## 本地开发

环境要求：Node.js 18+（开发使用 Node 22）。

```bash
npm install
npm run dev      # 启动开发服务器，默认 http://localhost:5173
npm run build    # 类型检查 + 生产构建，产物在 dist/
npm run preview  # 本地预览构建产物
```

## 部署到 GitHub Pages

路由使用 hash history（`#/...`），不依赖服务端 rewrite，构建产物可直接托管到任意静态服务器。

若部署在 `https://<用户名>.github.io/<仓库名>/` 子路径下，构建时指定 base：

```bash
npm run build -- --base=/<仓库名>/
```

然后把 `dist/` 目录推送到 `gh-pages` 分支（或在仓库 Settings → Pages 选择该分支）。

## 数据与隐私

- 学习记录、错词、复习卡片全部保存在浏览器 **IndexedDB**（库名 `wordmate`），不上传任何服务器。
- 清除浏览器站点数据会同时清除学习进度；词库 JSON 与 sql.js 的 WASM 文件随应用加载，可离线使用。
- 发音使用有道 `dictvoice` 接口，联网时可用；不联网或失败时回退到浏览器内置语音合成。

## 技术栈

Vue 3 + TypeScript + Vite + Tailwind CSS；Vue Router（hash 模式）；IndexedDB 经 `idb` 访问；FSRS 经 `ts-fsrs`；Anki 牌组经 `ankipack` + `sql.js` 在浏览器端打包；图表用 ECharts 按需引入。
