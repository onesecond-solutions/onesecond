#!/usr/bin/env python3
# 소식지 표지 썸네일 생성·업로드 (2026-08-03)
# published + source_path 있는 소식지의 PDF 1페이지 → 작은 JPG → newsletters 버킷 thumbs/<hash>.jpg
# service_role 값 미출력. 신버전 프로젝트 가드. 재실행 시 x-upsert 멱등.
import os, sys, io, re, json, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = os.path.join(ROOT, ".env.local")

def load_env():
    url = key = None
    with open(ENV, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_URL="): url = line.split("=", 1)[1].strip()
            elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="): key = line.split("=", 1)[1].strip()
    if not url or not key:
        sys.exit("STOP: .env.local URL/KEY 없음")
    if "pdnwgzneooyygfejrvbg" not in url:
        sys.exit("STOP: 신버전 프로젝트 아님")
    return url, key

URL, KEY = load_env()
H = {"apikey": KEY, "Authorization": "Bearer " + KEY}
BUCKET = "newsletters"

def req(method, path, data=None, headers=None, timeout=120):
    hh = dict(H); hh.update(headers or {})
    r = urllib.request.Request(URL + path, data=data, headers=hh, method=method)
    return urllib.request.urlopen(r, timeout=timeout)

def list_rows():
    # published + source_path not null
    q = "/rest/v1/newsletters?status=eq.published&source_path=not.is.null&select=source_path,file_hash&limit=2000"
    with req("GET", q) as r:
        return json.load(r)

def existing_thumbs():
    body = json.dumps({"prefix": "thumbs/", "limit": 2000}).encode()
    try:
        with req("POST", "/storage/v1/object/list/" + BUCKET, data=body,
                 headers={"Content-Type": "application/json"}) as r:
            return set(o["name"] for o in json.load(r))
    except Exception:
        return set()

def download_pdf(path):
    enc = "/".join(urllib.parse.quote(p) for p in path.split("/"))
    with req("GET", "/storage/v1/object/" + BUCKET + "/" + enc, timeout=300) as r:
        return r.read()

def upload_jpg(name, data):
    enc = "/".join(urllib.parse.quote(p) for p in name.split("/"))
    r = req("POST", "/storage/v1/object/" + BUCKET + "/" + enc, data=data,
            headers={"Content-Type": "image/jpeg", "x-upsert": "true"})
    with r as resp:
        return resp.status

import urllib.parse
import fitz  # PyMuPDF

def render_cover(pdf_bytes, target_w=320, quality=72):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[0]
    scale = target_w / page.rect.width if page.rect.width else 1.0
    scale = min(scale, 2.0)
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    jpg = pix.tobytes(output="jpg", jpg_quality=quality)
    doc.close()
    return jpg

def main():
    force = "--force" in sys.argv
    rows = list_rows()
    have = set() if force else existing_thumbs()  # {'thumbs/<hash>.jpg'}
    print(f"대상 {len(rows)}건 / 기존 thumbs {len(have)}건 / force={force}")
    done = skip = fail = 0
    for i, row in enumerate(rows, 1):
        sp = row.get("source_path") or ""
        base = sp.split("/")[-1]
        h = re.sub(r"\.pdf$", "", base, flags=re.I)
        thumb = "thumbs/" + h + ".jpg"
        if thumb in have:
            skip += 1; continue
        try:
            pdf = download_pdf(sp)
            jpg = render_cover(pdf)
            st = upload_jpg(thumb, jpg)
            if st in (200, 201):
                done += 1
                print(f"  [{i}/{len(rows)}] OK {h[:10]} ({len(jpg)//1024}KB)")
            else:
                fail += 1; print(f"  [{i}/{len(rows)}] UPLOAD FAIL http={st} {h[:10]}")
        except Exception as e:
            fail += 1; print(f"  [{i}/{len(rows)}] ERR {h[:10]} {str(e)[:80]}")
    print(f"== 완료: 생성 {done} / 스킵 {skip} / 실패 {fail} ==")

if __name__ == "__main__":
    main()
