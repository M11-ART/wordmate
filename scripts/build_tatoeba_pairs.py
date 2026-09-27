# 用 per_language 的 cmn-eng 直接链接提取中英句对，输出 tatoeba_pairs.txt（英文\t简体中文）
import bz2, os
from opencc import OpenCC

HERE = os.path.dirname(os.path.abspath(__file__))
TAT = os.path.join(HERE, "data", "tatoeba")
t2s = OpenCC("t2s")


def read_tsv(path):
    with bz2.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            yield line.rstrip("\n").split("\t")


# 1) 中文句子（简体化）
cmn = {}
for p in read_tsv(os.path.join(TAT, "cmn_sentences.tsv.bz2")):
    if len(p) >= 3:
        cmn[int(p[0])] = t2s.convert(p[2])
print("中文句:", len(cmn))

# 2) 中英直接链接
links, need = [], set()
for p in read_tsv(os.path.join(TAT, "cmn-eng_links.tsv.bz2")):
    if len(p) >= 2:
        try:
            cid, eid = int(p[0]), int(p[1])
        except ValueError:
            continue
        links.append((cid, eid))
        need.add(eid)
print("中英链接:", len(links))

# 3) 英文句子（只留需要的）
eng = {}
for p in read_tsv(os.path.join(TAT, "eng_sentences.tsv.bz2")):
    if len(p) >= 3:
        sid = int(p[0])
        if sid in need:
            eng[sid] = p[2]
print("匹配英文句:", len(eng))

# 4) 写出
out = os.path.join(HERE, "data", "tatoeba_pairs.txt")
n = 0
with open(out, "w", encoding="utf-8") as fp:
    for cid, eid in links:
        en = eng.get(eid)
        zh = cmn.get(cid)
        if en and zh:
            fp.write(en + "\t" + zh + "\n")
            n += 1
print("中英句对:", n, " %.1f MB" % (os.path.getsize(out) / 1024 / 1024))
