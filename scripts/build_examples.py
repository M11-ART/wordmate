# 用 ManyThings/Tatoeba 中英句对为词库匹配例句，输出 examples.json（lemma -> [{en,zh}]）
# 先以 --analyze 运行查看覆盖率
import csv, json, os, re, sys
from opencc import OpenCC

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
APP_DIR = os.path.dirname(HERE)
PUB_DATA = os.path.join(APP_DIR, "public", "data")
CSV_PATH = os.path.join(DATA, "ecdict.csv")
PAIRS = os.path.join(DATA, "tatoeba_pairs.txt")

t2s = OpenCC("t2s")
DECKS = ["gk", "cet4", "cet6", "ky", "ielts", "toefl", "gre"]
MAX_EX = 3

# 1) 目标词
targets = set()
for k in DECKS:
    with open(os.path.join(PUB_DATA, k + ".json"), encoding="utf-8") as f:
        d = json.load(f)
    for ch in d["chapters"]:
        for w in ch["words"]:
            targets.add(w["w"].lower())
print("目标词数:", len(targets))

# 2) 形态变化 surface -> lemma（含原形）
surface2lemma = {w: w for w in targets}
csv.field_size_limit(10_000_000)
with open(CSV_PATH, encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        lemma = row["word"].strip().lower()
        if lemma not in targets:
            continue
        ex = row.get("exchange", "") or ""
        for part in ex.split("/"):
            if ":" in part:
                _, forms = part.split(":", 1)
                for form in forms.split(","):
                    form = form.strip().lower()
                    if form:
                        surface2lemma.setdefault(form, lemma)
print("形态映射条数:", len(surface2lemma))

# 3) 解析句对并倒排
token_re = re.compile(r"[a-z][a-z'.\-]*")
inverted = {}
n_pairs = 0
with open(PAIRS, encoding="utf-8") as f:
    for line in f:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 2:
            continue
        en, zh = parts[0], parts[1]  # tatoeba_pairs 已是简体中文
        n_pairs += 1
        low = en.lower()
        lemmas = set()
        for tok in token_re.findall(low):
            lm = surface2lemma.get(tok)
            if lm:
                lemmas.add(lm)
        for lm in lemmas:
            inverted.setdefault(lm, []).append((en, zh, len(en)))
print("有效句对:", n_pairs)

# 4) 每词选最短的 MAX_EX 条，去重中文
examples = {}
for lm, cands in inverted.items():
    cands.sort(key=lambda x: x[2])
    picked, seen_zh = [], set()
    for en, zh, _ in cands:
        if zh in seen_zh:
            continue
        seen_zh.add(zh)
        picked.append({"en": en, "zh": zh})
        if len(picked) >= MAX_EX:
            break
    examples[lm] = picked

covered = len(examples)
print("有例句的目标词: %d / %d = %.1f%%" % (covered, len(targets), 100 * covered / len(targets)))

# 各词库覆盖率
for k in DECKS:
    with open(os.path.join(PUB_DATA, k + ".json"), encoding="utf-8") as f:
        d = json.load(f)
    ws = [w["w"].lower() for ch in d["chapters"] for w in ch["words"]]
    c = sum(1 for w in ws if w in examples)
    print("  %-6s %.1f%% (%d/%d)" % (k, 100 * c / len(ws), c, len(ws)))

if "--analyze" in sys.argv:
    sys.exit(0)

out = os.path.join(DATA, "examples.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(examples, f, ensure_ascii=False, separators=(",", ":"))
print("已写出", out, "%.1f KB" % (os.path.getsize(out) / 1024))
