# 为目标词生成"记忆小提示"：词根/词缀拆解为主，无法拆解则给画面感引导。输出 tips.json
import json, os, re
from roots_data import PREFIXES, SUFFIXES, ROOTS

HERE = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(HERE)
PUB_DATA = os.path.join(APP_DIR, "public", "data")
DECKS = ["gk", "cet4", "cet6", "ky", "ielts", "toefl", "gre"]

items = {}
for k in DECKS:
    with open(os.path.join(PUB_DATA, k + ".json"), encoding="utf-8") as f:
        d = json.load(f)
    for ch in d["chapters"]:
        for w in ch["words"]:
            items.setdefault(w["w"].lower(), w)


def core(s: str) -> str:
    s = re.sub(r"^[a-z]+\.\s*", "", s.strip())  # 去 n. / vt. / a. 等英文词性
    s = s.replace("\\n", "\n")  # 字面 \n 转真换行
    s = re.split(r"[，,；;：:（(\n/]", s)[0].strip()
    s = re.sub(r"(名词|动词|形容词|副词).*", "", s)
    return s.strip()


def first_mean(w: str) -> str:
    it = items.get(w)
    return core(it["t"]) if it else ""


def find_prefix(s: str, min_remain: int):
    hits = [(len(p), p, m) for p, m in PREFIXES.items()
            if s.startswith(p) and len(s) - len(p) >= min_remain]
    return max(hits) if hits else None


def find_suffix(s: str, min_remain: int):
    hits = [(len(su), su, m) for su, m in SUFFIXES.items()
            if s.endswith(su) and len(s) - len(su) >= min_remain]
    return max(hits) if hits else None


def stem_to_word(stem: str) -> str:
    """把剥离词缀后的词干还原为一个完整已知词"""
    cands = [stem, stem + "e", stem[:-1], stem[:-1] + "y", stem + "y"]
    for c in cands:
        if c and c in items:
            return c
    return stem


def analyze(w: str):
    if "." in w:
        return "这是带句点的缩写，输入时别漏掉每个点；按字母逐字读、逐字敲，更容易记住。"
    if " " in w:
        return "这是词组，先理解每个词再连读，在句子里记整体。"

    # 1) 词根组合
    best = None
    for r, m in ROOTS.items():
        if len(r) < 3:
            continue
        i = w.find(r)
        while i >= 0:
            pre_str, suf_str = w[:i], w[i + len(r):]
            pre_len, suf_len = i, len(suf_str)
            # 前缀部分非空必须是真实前缀；后缀部分允许单个哑音 e，≥2 必须是真实后缀
            p = find_prefix(pre_str, 0) if pre_str else None
            su = find_suffix(suf_str, 0) if suf_str and not (len(suf_str) == 1 and suf_str == "e") else None
            valid = (not pre_str or p is not None) and (not suf_str or su is not None or suf_str == "e")
            if valid and pre_len <= 5 and suf_len <= 6:
                score = len(r) * 2 - (pre_len + suf_len) * 0.3
                if best is None or score > best[0]:
                    best = (score, p, r, m, su)
            i = w.find(r, i + 1)
    if best:
        _, p, r, rm, su = best
        segs, clue = [], core(rm)
        if p:
            segs.append(f"{p[1]}-（{PREFIXES[p[1]]}）")
            clue = core(PREFIXES[p[1]]) + clue
        segs.append(f"{r}（{rm}）")
        if su:
            segs.append(f"-{su[1]}（{SUFFIXES[su[1]]}）")
        fm = first_mean(w)
        tip = "词根拆解：" + " + ".join(segs)
        if clue and fm:
            tip += f"\n顺着“{clue}”的线索，记住它表示“{fm}”，再在脑中补一个具体画面。"
        return tip

    # 2) 词缀派生：优先"前缀 + 完整词干"
    fm = first_mean(w)
    p = find_prefix(w, 2)
    if p:
        rest = w[p[0]:]
        stemw = stem_to_word(rest)
        # 剩余整体（或加后缀后）能对应一个已知词干
        su_in = find_suffix(rest, 2)
        if rest in items:
            sm = first_mean(rest)
            return (f"构词拆解：{p[1]}-（{PREFIXES[p[1]]}） + {rest}（{sm}）"
                    f"\n在“{sm}”基础上加前缀，对照释义“{fm}”记。")
        if su_in and stem_to_word(rest[: len(rest) - su_in[0]]) in items:
            sw = stem_to_word(rest[: len(rest) - su_in[0]])
            seg = f"{p[1]}-（{PREFIXES[p[1]]}） + {sw}（{first_mean(sw)}） + -{su_in[1]}（{SUFFIXES[su_in[1]]}）"
            return f"构词拆解：{seg}\n对照释义“{fm}”记。"

    su = find_suffix(w, 2)
    if su:
        stem = w[: len(w) - su[0]]
        sw = stem_to_word(stem)
        sm = first_mean(sw)
        return (f"构词拆解：{sw}（{sm}） + -{su[1]}（{SUFFIXES[su[1]]}）"
                f"\n在“{sm}”基础上加后缀，对照释义“{fm}”记。")

    # 3) 降级：画面感引导（不编造谐音）
    return (f"联想记忆：在脑中放一段小短片，把“{fm or w}”和单词 {w} 的发音、拼写、画面绑定，"
            "多感官一起记，比逐字母硬背更牢。")


tips = {w: analyze(w) for w in items}
out = os.path.join(HERE, "data", "tips.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(tips, f, ensure_ascii=False, separators=(",", ":"))

for s in ("revise", "happiness", "unhappy", "acre", "predict", "important", "export", "easier"):
    if s in tips:
        print("·", s, "->", tips[s].replace("\n", " / "))
print("tips:", len(tips), " %.0f KB" % (os.path.getsize(out) / 1024))
