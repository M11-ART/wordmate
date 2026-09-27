# 断点续传完成 ecdict.csv 下载，支持多次重试
import os, sys, urllib.request, time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "data", "ecdict.csv")
TMP = OUT + ".tmp"
URL = "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv"

for attempt in range(20):
    have = os.path.getsize(TMP) if os.path.exists(TMP) else 0
    print("第 %d 次续传，已有 %.1f MB" % (attempt + 1, have / 1048576), flush=True)
    req = urllib.request.Request(
        URL,
        headers={"User-Agent": "Mozilla/5.0", "Range": "bytes=%d-" % have},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            code = resp.status
            total = have + int(resp.headers.get("Content-Length", 0))
            mode = "ab" if code == 206 else "wb"
            if mode == "wb":
                have = 0
            with open(TMP, mode) as f:
                while True:
                    chunk = resp.read(1 << 15)
                    if not chunk:
                        break
                    f.write(chunk)
                    have += len(chunk)
                    sys.stdout.write("\r%.1f / 62 MB" % (have / 1048576))
                    sys.stdout.flush()
        print()
        if os.path.getsize(TMP) >= 62_000_000:
            os.replace(TMP, OUT)
            print("下载完成，大小 %.1f MB" % (os.path.getsize(OUT) / 1048576))
            break
    except Exception as e:
        print("\n续传中断:", e, flush=True)
        time.sleep(2)
else:
    print("多次续传仍未完成")
    sys.exit(1)
