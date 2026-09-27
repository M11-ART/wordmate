# 把 examples.json（例句）与 tips.json（记忆提示）注入 public/data/*.json 的每个词条
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
APP_DIR = os.path.dirname(HERE)
PUB_DATA = os.path.join(APP_DIR, "public", "data")
DECKS = ["gk", "cet4", "cet6", "ky", "ielts", "toefl", "gre"]

with open(os.path.join(DATA, "examples.json"), encoding="utf-8") as f:
    examples = json.load(f)
with open(os.path.join(DATA, "tips.json"), encoding="utf-8") as f:
    tips = json.load(f)

for k in DECKS:
    path = os.path.join(PUB_DATA, k + ".json")
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    n_ex = n_tip = 0
    for ch in d["chapters"]:
        for it in ch["words"]:
            low = it["w"].lower()
            if low in examples:
                it["examples"] = examples[low]
                n_ex += 1
            if low in tips:
                it["tip"] = tips[low]
                n_tip += 1
    with open(path, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print("%-6s 例句 %5d 提示 %5d  %.0f KB" %
          (k, n_ex, n_tip, os.path.getsize(path) / 1024))
