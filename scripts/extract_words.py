# 从 ecdict.csv 提取考试词库，生成 public/data/*.json；并拷贝 sql-wasm.wasm
import csv, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, "data", "ecdict.csv")
APP_DIR = os.path.dirname(HERE)
DATA_OUT = os.path.join(APP_DIR, "public", "data")
os.makedirs(DATA_OUT, exist_ok=True)

CHAPTER_SIZE = 30

DECKS = {
    "gk":    ("高考词汇", "Gaokao", "高中大纲词汇"),
    "cet4":  ("CET-4", "Band 4", "大学英语四级词汇"),
    "cet6":  ("CET-6", "Band 6", "大学英语六级词汇"),
    "ky":    ("考研英语", "Postgraduate", "研究生入学考试词汇"),
    "ielts": ("雅思", "IELTS", "IELTS 核心词汇"),
    "toefl": ("托福", "TOEFL", "TOEFL 核心词汇"),
    "gre":   ("GRE", "GRE", "GRE 考试词汇"),
}

WORD_RE = re.compile(r"^[a-zA-Z][a-zA-Z'’\-. ]{0,38}$")
buckets: dict[str, list] = {k: [] for k in DECKS}
tag_counts: dict[str, int] = {}

csv.field_size_limit(10_000_000)

def clean(s: str, limit: int = 300) -> str:
    s = (s or "").replace("\r", "").strip()
    s = s.replace("\\n", "\n")  # ECDICT 用字面 \n 表示换行，转为真换行
    s = re.sub(r"\n{2,}", "\n", s)
    return s[:limit]

with open(CSV_PATH, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        word = row["word"].strip()
        tags = (row["tag"] or "").lower()
        if not WORD_RE.match(word):
            continue
        translation = clean(row.get("translation", ""))
        if not translation:
            continue
        for t in tags.split():
            tag_counts[t] = tag_counts.get(t, 0) + 1
        item = {
            "w": word,
            "p": clean(row.get("phonetic", ""), 60),
            "t": translation,
            "f": int(row["frq"]) if row.get("frq", "").isdigit() else 999999,
        }
        d = clean(row.get("definition", ""), 200)
        if d:
            item["d"] = d
        for k in buckets:
            if re.search(r"(^|\s)%s(\s|$)" % k, tags):
                buckets[k].append(item)

meta_summary = []
for key, (name, en, desc) in DECKS.items():
    words = buckets[key]
    # 同词可能有大小写重复条目，按小写去重保留词频高（f 小）的
    seen = {}
    for it in words:
        low = it["w"].lower()
        if low not in seen or it["f"] < seen[low]["f"]:
            seen[low] = it
    words = sorted(seen.values(), key=lambda x: x["f"])
    # 词频占位字段：无真实词频的保留 999999，前端不展示即可
    chapters = []
    for i in range(0, len(words), CHAPTER_SIZE):
        no = i // CHAPTER_SIZE
        ch_words = words[i : i + CHAPTER_SIZE]
        chapters.append({
            "id": no,
            "title": "第 %d 章" % (no + 1),
            "words": ch_words,
        })
    payload = {
        "id": key, "name": name, "enName": en, "desc": desc,
        "total": len(words), "chapters": chapters,
    }
    out_path = os.path.join(DATA_OUT, key + ".json")
    with open(out_path, "w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, separators=(",", ":"))
    size_kb = os.path.getsize(out_path) / 1024
    meta_summary.append((key, name, len(words), len(chapters), round(size_kb)))
    print("%-6s %-8s %5d 词 %3d 章 %6d KB" % (key, name, len(words), len(chapters), size_kb))

# 拷贝 sql-wasm.wasm 到 public
wasm_src = os.path.join(APP_DIR, "node_modules", "sql.js", "dist", "sql-wasm.wasm")
wasm_dst = os.path.join(APP_DIR, "public", "sql-wasm.wasm")
if os.path.exists(wasm_src):
    shutil.copyfile(wasm_src, wasm_dst)
    print("sql-wasm.wasm 已拷贝 (%.0f KB)" % (os.path.getsize(wasm_dst) / 1024))

print("\n常见标签分布:", sorted(tag_counts.items(), key=lambda x: -x[1])[:12])
