#!/usr/bin/env python3
# 소식지 표지 썸네일 생성·업로드 (2026-08-03 v2: id 기준 + source_pdf_url 지원)
# published + (source_path 또는 source_pdf_url) 있는 소식지의 PDF 1페이지 → 작은 JPG
#   → newsletters 버킷 thumbs/<id>.jpg (소식지 id 기준, 항상 있음).
# source_path=private newsletters 버킷(service_role) / source_pdf_url=공개 URL 직접.
# service_role 값 미출력. 신버전 프로젝트 가드. 재실행 시 기존 thumbs 스킵(--force로 강제).
import os, sys, re, json, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = os.path.join(ROOT, ".env.local")

def load_env():
    url = key = None
    with open(ENV, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_URL="): url = line.split("=", 1)[1].strip()
            elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="): key = line.split("=", 1)[1].strip()
    if not url or not key: sys.exit("STOP: .env.local URL/KEY 없음")
    if "pdnwgzneooyygfejrvbg" not in url: sys.exit("STOP: 신버전 프로젝트 아님")
    return url, key

URL, KEY = load_env()
H = {"apikey": KEY, "Authorization": "Bearer " + KEY}
BUCKET = "newsletters"

def req(method, path, data=None, headers=None, timeout=300):
    hh = dict(H); hh.update(headers or {})
    r = urllib.request.Request(URL + path, data=data, headers=hh, method=method)
    return urllib.request.urlopen(r, timeout=timeout)

def list_rows():
    q = ("/rest/v1/newsletters?status=eq.published"
         "&select=id,source_path,source_pdf_url,publish_year,publish_month&limit=3000")
    with req("GET", q) as r: return json.load(r)

def existing_thumbs():
    out = set(); off = 0
    while True:
        body = json.dumps({"prefix": "thumbs/", "limit": 1000, "offset": off}).encode()
        with req("POST", "/storage/v1/object/list/" + BUCKET, data=body,
                 headers={"Content-Type": "application/json"}) as r:
            batch = json.load(r)
        if not batch: break
        for o in batch: out.add("thumbs/" + o["name"])
        if len(batch) < 1000: break
        off += 1000
    return out

def dl_storage(path):
    enc = "/".join(urllib.parse.quote(p) for p in path.split("/"))
    with req("GET", "/storage/v1/object/" + BUCKET + "/" + enc) as r: return r.read()

def dl_url(u):
    rq = urllib.request.Request(u, headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
    with urllib.request.urlopen(rq, timeout=300) as r: return r.read()

def upload_jpg(name, data):
    enc = "/".join(urllib.parse.quote(p) for p in name.split("/"))
    with req("POST", "/storage/v1/object/" + BUCKET + "/" + enc, data=data,
             headers={"Content-Type": "image/jpeg", "x-upsert": "true"}) as resp:
        return resp.status

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError:
    fitz = None

def render_cover(pdf_bytes, target_w=320, quality=72):
    if fitz is not None:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc[0]
        scale = min(target_w / page.rect.width if page.rect.width else 1.0, 2.0)
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        jpg = pix.tobytes(output="jpg", jpg_quality=quality)
        doc.close(); return jpg
    import shutil, subprocess, tempfile
    exe = shutil.which("pdftoppm")
    if not exe: raise RuntimeError("PyMuPDF와 pdftoppm 모두 없음")
    with tempfile.TemporaryDirectory() as td:
        src = os.path.join(td, "cover.pdf"); out = os.path.join(td, "cover")
        with open(src, "wb") as f: f.write(pdf_bytes)
        subprocess.run([exe, "-f", "1", "-l", "1", "-singlefile", "-jpeg", "-jpegopt", f"quality={quality}", "-scale-to-x", str(target_w), "-scale-to-y", "-1", src, out], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        with open(out + ".jpg", "rb") as f: return f.read()

def main():
    force = "--force" in sys.argv
    rows = list_rows()
    if "--month" in sys.argv:
        mi = sys.argv.index("--month")
        wanted = sys.argv[mi + 1]
        yy, mm = [int(x) for x in wanted.split("-", 1)]
        rows = [r for r in rows if int(r.get("publish_year") or 0) == yy and int(r.get("publish_month") or 0) == mm]
    have = set() if force else existing_thumbs()
    todo = [r for r in rows if (r.get("source_path") or r.get("source_pdf_url"))]
    print(f"published {len(rows)} / PDF있음 {len(todo)} / 기존 thumbs {len(have)} / force={force}")
    done = skip = fail = 0
    for i, r in enumerate(todo, 1):
        nid = r.get("id"); thumb = "thumbs/" + nid + ".jpg"
        if thumb in have: skip += 1; continue
        sp = r.get("source_path"); su = r.get("source_pdf_url")
        try:
            pdf = dl_storage(sp) if sp else dl_url(su)
            jpg = render_cover(pdf)
            st = upload_jpg(thumb, jpg)
            if st in (200, 201):
                done += 1
                if done % 25 == 0 or done <= 3: print(f"  [{i}/{len(todo)}] OK {nid[:8]} ({len(jpg)//1024}KB) via {'path' if sp else 'url'}")
            else:
                fail += 1; print(f"  [{i}/{len(todo)}] UPLOAD FAIL http={st} {nid[:8]}")
        except Exception as e:
            fail += 1; print(f"  [{i}/{len(todo)}] ERR {nid[:8]} {str(e)[:70]}")
    print(f"== 완료: 생성 {done} / 스킵 {skip} / 실패 {fail} ==")

if __name__ == "__main__":
    main()
