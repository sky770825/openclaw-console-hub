#!/usr/bin/env python3
"""輕量 batch-index — 用 Python 避免 Node OOM + JSON encoding 問題"""
import os, sys, json, hashlib, time, glob, re
from urllib.request import Request, urlopen
from urllib.error import URLError

DIR = sys.argv[1] if len(sys.argv) > 1 else "/Users/caijunchang/openclaw任務面版設計/cookbook"
CATEGORY = sys.argv[2] if len(sys.argv) > 2 else "cookbook"
GOOGLE_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyDGHy3xWJ91GaSwB9Si6rsUWdA58vJoX6w")
SB_URL = "https://vbejswywswaeyfasnwjq.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZWpzd3l3c3dhZXlmYXNud2pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTg4NywiZXhwIjoyMDg2MTk1ODg3fQ.VHwlh1LZ77B_IIL9tXi3UM-yJKh7LvZMirMH6wfqh_A"

TARGET_CHARS = 1600
MAX_CHARS = 2000
OVERLAP = 200

def google_embed(text):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GOOGLE_KEY}"
    body = json.dumps({"content": {"parts": [{"text": text}]}, "outputDimensionality": 768}).encode()
    req = Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        resp = urlopen(req, timeout=30)
        data = json.loads(resp.read())
        return data.get("embedding", {}).get("values")
    except Exception as e:
        print(f"  embed error: {e}", file=sys.stderr)
        return None

def supabase_delete(file_name):
    url = f"{SB_URL}/rest/v1/openclaw_embeddings?file_name=eq.{file_name}"
    req = Request(url, method="DELETE", headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"})
    try:
        urlopen(req, timeout=15)
    except: pass

def supabase_upsert(row):
    url = f"{SB_URL}/rest/v1/openclaw_embeddings"
    body = json.dumps(row).encode()
    req = Request(url, data=body, method="POST", headers={
        "apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    })
    try:
        resp = urlopen(req, timeout=15)
        return True, ""
    except URLError as e:
        body = e.read().decode() if hasattr(e, 'read') else str(e)
        return False, body[:200]

def parse_tags(content):
    m = re.match(r'^---\n([\s\S]*?)\n---', content)
    if not m: return []
    tm = re.search(r'tags:\s*\[([^\]]+)\]', m.group(1))
    if not tm: return []
    return [t.strip().strip("'\"") for t in tm.group(1).split(',')]

def chunk_document(content, doc_title):
    sections = re.split(r'(?=^## )', content, flags=re.MULTILINE)
    sections = [s for s in sections if len(s.strip()) > 30]
    chunks = []
    for sec in sections:
        m = re.match(r'^## (.+)', sec, re.MULTILINE)
        sec_title = m.group(1).replace('#', '').strip() if m else ''
        body = sec.strip()
        if len(body) <= MAX_CHARS:
            chunks.append({"text": body, "title": sec_title})
        else:
            start = 0
            sub_idx = 0
            while start < len(body):
                end = start + TARGET_CHARS
                if end < len(body):
                    boundary = body.rfind('\n\n', start + int(TARGET_CHARS * 0.5), end)
                    if boundary > 0: end = boundary
                    else:
                        lb = body.rfind('\n', start + int(TARGET_CHARS * 0.3), end)
                        if lb > 0: end = lb
                else:
                    end = len(body)
                txt = body[start:end].strip()
                if len(txt) > 30:
                    t = sec_title if sub_idx == 0 else f"{sec_title} ({sub_idx+1})"
                    chunks.append({"text": txt, "title": t})
                start = max(0, end - OVERLAP)
                if start >= len(body): break
                sub_idx += 1
    return chunks

# Main
md_files = sorted(glob.glob(os.path.join(DIR, "*.md")))
total = len(md_files)
indexed = 0
failed = 0

print(f"=== Batch Index: {DIR} ({total} files, category={CATEGORY}) ===")

for filepath in md_files:
    filename = os.path.basename(filepath)
    content = open(filepath, 'r', encoding='utf-8').read()

    # Parse title
    tm = re.search(r'^# (.+)', content, re.MULTILINE)
    doc_title = tm.group(1).strip() if tm else filename.replace('.md', '')

    tags = parse_tags(content)
    chunks = chunk_document(content, doc_title)

    if not chunks:
        print(f"SKIP: {filename} (no chunks)")
        failed += 1
        continue

    # Delete old
    supabase_delete(filename)

    ok_count = 0
    for i, chunk in enumerate(chunks):
        ctx = f"[{doc_title}] [{CATEGORY}] [{chunk['title']}]"
        embed_text = f"{ctx} {chunk['text'][:1200]}"

        vector = google_embed(embed_text)
        if not vector:
            print(f"  FAIL embed: {filename} chunk-{i}")
            continue

        h = hashlib.md5(f"cookbook/{filename}:v2:{i}".encode()).hexdigest()
        point_id = int(h[:15], 16)

        row = {
            "id": point_id,
            "doc_title": doc_title,
            "section_title": chunk["title"],
            "content": chunk["text"],
            "content_preview": chunk["text"][:200],
            "file_path": f"cookbook/{filename}",
            "file_name": filename,
            "category": CATEGORY,
            "chunk_index": i,
            "chunk_total": len(chunks),
            "size": len(chunk["text"]),
            "date": time.strftime("%Y-%m-%d"),
            "embedding": json.dumps(vector),
            "status": "active",
            "content_type": "reference",
            "zone": "hot",
            "is_pinned": False,
            "indexed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        if tags:
            row["tags"] = tags

        ok, err = supabase_upsert(row)
        if ok:
            ok_count += 1
        else:
            print(f"  FAIL upsert: {filename} chunk-{i}: {err}")

        time.sleep(0.1)  # rate limit

    if ok_count > 0:
        indexed += 1
        print(f"OK: {filename} ({ok_count}/{len(chunks)} chunks)")
    else:
        failed += 1
        print(f"FAIL: {filename} (0 chunks indexed)")

print(f"\n=== Done! total={total} indexed={indexed} failed={failed} ===")
