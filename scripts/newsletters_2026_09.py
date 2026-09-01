#!/usr/bin/env python3
"""2026-09 보험사 소식지 23건 멱등 업로드·등록·발행 파이프라인."""
import argparse, hashlib, json, os, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "scripts" / "data" / "newsletters_2026_09.json"
BUCKET, PREFIX = "newsletters", "2026-09"

def env():
    vals = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        if "=" in line:
            k, v = line.split("=", 1); vals[k.strip()] = v.strip()
    url, key = vals.get("SUPABASE_URL", ""), vals.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if "pdnwgzneooyygfejrvbg" not in url or not key: sys.exit("STOP: 신버전 프로젝트 URL/service_role 없음")
    return url.rstrip("/"), key

def request(url, key, method, path, data=None, extra=None):
    headers = {"apikey": key, "Authorization": "Bearer " + key}
    headers.update(extra or {})
    return urllib.request.urlopen(urllib.request.Request(url + path, data=data, headers=headers, method=method), timeout=600)

def api_path(row, suffix=""):
    return "/rest/v1/newsletters?file_hash=eq." + row["sha256"] + suffix

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["preflight", "verify", "upload", "register", "promote", "postverify"])
    ap.add_argument("--source-dir", default=str(Path.home() / "Downloads"))
    ap.add_argument("--manifest", default=str(MANIFEST))
    args = ap.parse_args()
    rows = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    if not rows or len({r["sha256"] for r in rows}) != len(rows): sys.exit("STOP: manifest 비었음/해시 유일성 실패")
    source = Path(args.source_dir)
    if args.mode == "preflight":
        total = 0
        for r in rows:
            p = source / r["filename"]
            if not p.is_file(): sys.exit("STOP: 파일 없음 " + str(p))
            actual = hashlib.sha256(p.read_bytes()).hexdigest()
            if actual != r["sha256"]: sys.exit("STOP: 해시 불일치 " + r["filename"])
            total += p.stat().st_size
        print(f"PRECHECK OK files={len(rows)} bytes={total}"); return
    url, key = env(); done = skip = fail = 0
    for r in rows:
        try:
            with request(url, key, "GET", api_path(r, "&select=id,status,source_path,title")) as resp: found = json.load(resp)
            if args.mode == "verify":
                print(("EXISTS " + found[0]["status"] if found else "MISSING") + " " + r["title"]); continue
            if args.mode == "upload":
                p = source / r["filename"]
                if hashlib.sha256(p.read_bytes()).hexdigest() != r["sha256"]: raise RuntimeError("해시 불일치")
                sp = f"{PREFIX}/{r['sha256']}.pdf"
                enc = "/".join(urllib.parse.quote(x) for x in sp.split("/"))
                with request(url, key, "POST", f"/storage/v1/object/{BUCKET}/{enc}", p.read_bytes(), {"Content-Type":"application/pdf","x-upsert":"true"}): pass
                done += 1; print("UPLOAD " + r["title"]); continue
            if args.mode == "register":
                if found: skip += 1; print("SKIP " + r["title"]); continue
                body = dict(r)
                for key_name in ("filename", "sha256", "bytes", "pages"):
                    body.pop(key_name)
                body.update({"source_filename":r["filename"], "file_hash":r["sha256"], "source_path":f"{PREFIX}/{r['sha256']}.pdf", "publish_year":2026, "publish_month":9, "status":"reviewing", "page_count":r["pages"]})
                body["full_text"] = r["title"] + "\n" + r["company"] + "\n2026년 9월 " + r["category"]
                body["char_length"] = len(body["full_text"]); body["text_quality"] = "최소등록"; body["ocr_needed"] = True; body["ocr_status"] = "pending"
                with request(url, key, "POST", "/rest/v1/newsletters", json.dumps(body,ensure_ascii=False).encode(), {"Content-Type":"application/json","Prefer":"return=minimal"}): pass
                done += 1; print("REGISTER reviewing " + r["title"]); continue
            if args.mode == "promote":
                if not found: raise RuntimeError("등록행 없음")
                if found[0].get("status") == "published": skip += 1; continue
                with request(url, key, "PATCH", api_path(r, "&status=eq.reviewing"), b'{"status":"published"}', {"Content-Type":"application/json","Prefer":"return=minimal"}): pass
                done += 1; print("PUBLISH " + r["title"]); continue
            if args.mode == "postverify":
                ok = bool(found and found[0].get("status") == "published" and found[0].get("source_path") == f"{PREFIX}/{r['sha256']}.pdf")
                if not ok: fail += 1; print("FAIL " + r["title"])
        except Exception as e:
            fail += 1; print("ERROR " + r["title"] + " " + str(e)[:120])
            if args.mode in ("upload","register","promote"): sys.exit(3)
    print(f"DONE mode={args.mode} done={done} skip={skip} fail={fail}")
    if fail: sys.exit(2)

if __name__ == "__main__": main()
