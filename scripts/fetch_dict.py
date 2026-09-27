# 下载 ECDICT 主数据文件 ecdict.csv，GitHub 失败则回退 Gitee 镜像
import os, sys, urllib.request, time

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
os.makedirs(DATA_DIR, exist_ok=True)
OUT = os.path.join(DATA_DIR, "ecdict.csv")

URLS = [
    "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv",
    "https://gitee.com/dochuang/ECDICT/raw/master/ecdict.csv",
]

def download(url):
    print("尝试下载:", url, flush=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        total = int(resp.headers.get("Content-Length", 0))
        done = 0
        tmp = OUT + ".tmp"
        t0 = time.time()
        with open(tmp, "wb") as f:
            while True:
                chunk = resp.read(1 << 16)
                if not chunk:
                    break
                f.write(chunk)
                done += len(chunk)
                if total:
                    pct = done * 100 // total
                    sys.stdout.write("\r进度: %d/%d MB (%d%%)" % (done >> 20, total >> 20, pct))
                    sys.stdout.flush()
        print("\n下载耗时 %.1f 秒" % (time.time() - t0))
    os.replace(tmp, OUT)
    return done

if os.path.exists(OUT) and os.path.getsize(OUT) > 5_000_000:
    print("已存在 ecdict.csv，大小 %.1f MB，跳过" % (os.path.getsize(OUT) / 1048576))
else:
    last_err = None
    for u in URLS:
        try:
            n = download(u)
            if n > 5_000_000:
                print("成功，大小 %.1f MB" % (n / 1048576))
                break
        except Exception as e:
            print("\n失败:", e, flush=True)
            last_err = e
    else:
        print("全部源均失败:", last_err)
        sys.exit(1)
