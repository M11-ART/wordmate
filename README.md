# 词记 WordMate

一个运行在浏览器里的背单词工具，数据默认存在本机；登录 GitHub 后可在手机和电脑间云同步。打字跟打、听写、默写三种学习方式，FSRS 间隔重复算法安排复习，错词自动归集，并可一键导出为 Anki `.apkg` 牌组。

## 功能

- **打字跟打**：看单词和释义，逐字母键入，敲错不前进，敲对自动进入下一词（参考 QwertyLearner）。
- **听写**：听发音（英式/美式），键盘拼出单词，回车提交。
- **默写**：看中文释义，默写英文单词。
- **FSRS 复习**：学过的词按 [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) 算法在快要忘记时回到复习队列，翻面后按「重来 / 困难 / 良好 / 简单」自评；支持键盘快捷键 1–4、空格翻面。
- **错词本**：学习中拼错的词自动入库，可按错词听写 / 错词默写专项巩固。
- **Anki 导出**：把任意词库、章节范围、错词本、已学词汇导出为 `.apkg`，含「认读卡（英→中）」和「拼写卡（中→英，Anki 自动批改）」两种卡片，牌组内置 FSRS 调度参数；可直接上传到 GitHub 仓库存档。
- **云同步（多设备互通）**：用 GitHub 账号登录，学习数据存到你自己的 GitHub 仓库，手机浏览器和电脑登录同一账号自动互通；打开应用自动拉取、学习后自动上传。
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

## 部署你自己的实例（GitHub Pages）

仓库已内置 GitHub Actions 工作流（`.github/workflows/deploy.yml`），推送即自动构建并发布 Pages，无需本地构建：

1. Fork 本仓库到你的账号（页面右上 Fork）。
2. 在你 Fork 的仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 任意推送一次（或在 Actions 页手动触发 Deploy），等待工作流完成，即可通过 `https://<你的用户名>.github.io/wordmate/` 访问。

路由使用 hash history（`#/...`），不依赖服务端 rewrite；`vite.config.ts` 已设相对 base，部署到任意子路径都不会 404。

## 云同步：手机 / 电脑数据互通

云同步不依赖自建后端，直接把学习数据读写到**你自己的 GitHub 仓库**：

1. 在 GitHub 新建一个数据仓库（可设为私有），默认名 `wordmate-data`。
2. 打开 <https://github.com/settings/personal-access-tokens/new>：
   - Repository access 选 **Only select repositories**，勾选刚建的数据仓库；
   - 展开 Repository permissions，把 **Contents** 设为 **Read and write**；
   - 生成并复制 `github_pat_...`。
3. 在应用侧边栏「云同步」填入 GitHub 用户名、Token、数据仓库名，点「登录并立即同步」。

之后打开应用会自动拉取云端数据，学习后约 8 秒自动上传；手机和电脑登录同一账号即互通。Token 仅保存在各自浏览器的 localStorage，不会随应用源码传播，因此每个人都用自己的账号、互不可见。

## 数据与隐私

- 学习记录、错词、复习卡片默认保存在浏览器 **IndexedDB**（库名 `wordmate`）。
- 未开启云同步时不上传任何数据；开启云同步后，数据通过 GitHub Contents API 存入你自己指定的仓库（建议设为私有），Token 仅保存在本机 localStorage。
- 清除浏览器站点数据会同时清除本机学习进度（重新登录同步即可从云端恢复）；词库 JSON 与 sql.js 的 WASM 文件随应用加载，可离线使用。
- 发音使用有道 `dictvoice` 接口，联网时可用；不联网或失败时回退到浏览器内置语音合成。

## 技术栈

Vue 3 + TypeScript + Vite + Tailwind CSS；Vue Router（hash 模式）；IndexedDB 经 `idb` 访问；FSRS 经 `ts-fsrs`；Anki 牌组经 `ankipack` + `sql.js` 在浏览器端打包；图表用 ECharts 按需引入。
