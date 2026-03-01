#!/usr/bin/env python3
"""
向量化核心知識庫 → Qdrant memory_smart_chunks
使用 Ollama nomic-embed-text (768 維)，完全本地，不花錢。

用法：
  python3 scripts/vectorize-knowledge.py           # 追加/更新模式
  python3 scripts/vectorize-knowledge.py --rebuild  # 清空重建模式（推薦）

v2.0 升級：
  - 新增 --rebuild 模式：先刪 collection 再重建，確保乾淨
  - 過濾 ≤50 字元的短 chunk（空標題殺手）
  - content 全文存入 payload（不只 preview）
  - 新增 memory/PROFILE.md 為索引來源
  - 統計報告更詳細

v2.1 升級：
  - Embedding 前加結構化前綴：[檔名 | 章節標題] 內容
  - 從 markdown 檔案的 # 標題提取文件名稱作為前綴
  - 提升 nomic-embed-text 在中文語義搜尋的鑑別力
"""

import os
import re
import sys
import json
import hashlib
import time
import urllib.request

WORKSPACE = os.path.expanduser("~/.openclaw/workspace")
PROJECT_ROOT = "/Users/caijunchang/openclaw任務面版設計"
OLLAMA_URL = "http://localhost:11434/api/embed"
QDRANT_URL = "http://localhost:6333"
COLLECTION = "memory_smart_chunks"
EMBED_MODEL = "bge-m3"        # 多語言 embedding，中文能力遠超 nomic-embed-text
EMBED_DIM = 1024              # bge-m3 = 1024 維, nomic-embed-text = 768 維
CHUNK_MAX = 500  # 每個 chunk 最大字元數
CHUNK_MIN = 50   # 低於此字元數的 chunk 直接丟棄

# 要向量化的目錄/檔案（workspace 下的子目錄）
TARGETS = [
    ("sop-知識庫", "sop"),
    ("xiaocai-指令集", "instruction"),
    ("knowledge", "knowledge"),
]

# 專案根目錄下的目錄（cookbook 等）
PROJECT_TARGETS = [
    ("cookbook", "cookbook"),
]

SINGLE_FILES = [
    ("AGENTS.md", "core-rule"),
    ("memory/PROFILE.md", "profile"),
    ("HEARTBEAT.md", "core-rule"),
    ("SOUL.md", "core-soul"),
]

# 工具文件（armory + skills 的 README/SKILL.md）
def collect_tool_docs():
    """掃描 armory 和 skills 目錄，收集所有工具文件"""
    tool_files = []

    # armory — 武器庫（每個子目錄的 README.md / SKILL.md）
    armory_dir = os.path.join(WORKSPACE, "armory")
    if os.path.isdir(armory_dir):
        for sub in sorted(os.listdir(armory_dir)):
            sub_path = os.path.join(armory_dir, sub)
            if not os.path.isdir(sub_path):
                continue
            for doc in ["SKILL.md", "README.md"]:
                doc_path = os.path.join(sub_path, doc)
                if os.path.isfile(doc_path):
                    tool_files.append((doc_path, f"armory/{sub}/{doc}", "tool-armory"))

    # skills — 技能包（每個子目錄的 SKILL.md / README.md）
    skills_dir = os.path.join(WORKSPACE, "skills")
    if os.path.isdir(skills_dir):
        for sub in sorted(os.listdir(skills_dir)):
            sub_path = os.path.join(skills_dir, sub)
            if not os.path.isdir(sub_path):
                continue
            for doc in ["SKILL.md", "README.md"]:
                doc_path = os.path.join(sub_path, doc)
                if os.path.isfile(doc_path):
                    tool_files.append((doc_path, f"skills/{sub}/{doc}", "tool-skill"))

    # 專案根 scripts 的 README（如果有）
    proj_scripts = os.path.join(PROJECT_ROOT, "scripts")
    if os.path.isdir(proj_scripts):
        for doc in ["README.md"]:
            doc_path = os.path.join(proj_scripts, doc)
            if os.path.isfile(doc_path):
                tool_files.append((doc_path, f"scripts/{doc}", "tool-script"))

    return tool_files


def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def extract_doc_title(content):
    """從 markdown 內容提取文件標題（# 開頭的第一行）"""
    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("# ") and not line.startswith("## "):
            return line.replace("# ", "").strip()
    return None


def make_embed_text(doc_title, section_title, content, file_name):
    """為 embedding 建構帶前綴的文字，提升語義鑑別力。

    格式：[文件名稱 | 章節標題] 原始內容
    例如：[SOP-10: 跨 Agent 協作 | 核心原則] 1. 一個任務一個 Agent...
    """
    prefix_parts = []
    if doc_title:
        prefix_parts.append(doc_title)
    else:
        # fallback: 用檔名（去掉 .md）
        prefix_parts.append(file_name.replace(".md", ""))

    if section_title and section_title != doc_title:
        prefix_parts.append(section_title)

    prefix = " | ".join(prefix_parts)
    return f"[{prefix}] {content}"


def chunk_by_section(content, file_path, file_name, category):
    """按 ## 標題切 chunk，太長的再細切，太短的丟棄"""
    chunks = []
    doc_title = extract_doc_title(content)
    sections = re.split(r"(?=^## )", content, flags=re.MULTILINE)

    skipped = 0
    for i, section in enumerate(sections):
        section = section.strip()
        if not section:
            continue

        # 過濾短 chunk（≤50 字元的基本上只有標題沒內容）
        if len(section) <= CHUNK_MIN:
            skipped += 1
            continue

        # 取 section 標題
        lines = section.split("\n")
        title = lines[0].replace("## ", "").replace("#", "").strip()
        if not title:
            title = f"chunk-{i}"

        # 如果太長，再按段落切
        if len(section) > CHUNK_MAX:
            paragraphs = section.split("\n\n")
            sub_chunk = ""
            sub_idx = 0
            for para in paragraphs:
                if len(sub_chunk) + len(para) > CHUNK_MAX and sub_chunk:
                    if len(sub_chunk.strip()) > CHUNK_MIN:
                        sec_title = f"{title} (part {sub_idx+1})"
                        chunks.append({
                            "title": title,
                            "section_title": sec_title,
                            "content": sub_chunk.strip(),
                            "embed_text": make_embed_text(doc_title, sec_title, sub_chunk.strip(), file_name),
                            "doc_title": doc_title or file_name,
                            "file_path": file_path,
                            "file_name": file_name,
                            "category": category,
                            "chunk_index": len(chunks),
                        })
                    else:
                        skipped += 1
                    sub_chunk = para + "\n\n"
                    sub_idx += 1
                else:
                    sub_chunk += para + "\n\n"
            if sub_chunk.strip() and len(sub_chunk.strip()) > CHUNK_MIN:
                sec_title = f"{title} (part {sub_idx+1})" if sub_idx > 0 else title
                chunks.append({
                    "title": title,
                    "section_title": sec_title,
                    "content": sub_chunk.strip(),
                    "embed_text": make_embed_text(doc_title, sec_title, sub_chunk.strip(), file_name),
                    "doc_title": doc_title or file_name,
                    "file_path": file_path,
                    "file_name": file_name,
                    "category": category,
                    "chunk_index": len(chunks),
                })
            elif sub_chunk.strip():
                skipped += 1
        else:
            chunks.append({
                "title": title,
                "section_title": title,
                "content": section,
                "embed_text": make_embed_text(doc_title, title, section, file_name),
                "doc_title": doc_title or file_name,
                "file_path": file_path,
                "file_name": file_name,
                "category": category,
                "chunk_index": len(chunks),
            })

    # 設 chunk_total
    for c in chunks:
        c["chunk_total"] = len(chunks)

    if skipped > 0:
        print(f"    (過濾 {skipped} 個短 chunk ≤{CHUNK_MIN} 字元)")

    return chunks


def get_embedding(text):
    """呼叫 Ollama nomic-embed-text"""
    data = json.dumps({"model": EMBED_MODEL, "input": text}).encode()
    req = urllib.request.Request(OLLAMA_URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return result["embeddings"][0]
    except Exception as e:
        print(f"  ❌ Embedding 失敗: {e}")
        return None


def make_point_id(file_path, chunk_index):
    """用 file_path + chunk_index 產生穩定的 point ID"""
    h = hashlib.md5(f"{file_path}:{chunk_index}".encode()).hexdigest()
    return int(h[:15], 16)  # 取前 15 hex 字元轉 int


def upsert_points(points):
    """批次寫入 Qdrant"""
    data = json.dumps({"points": points}).encode()
    req = urllib.request.Request(
        f"{QDRANT_URL}/collections/{COLLECTION}/points",
        data=data,
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return result.get("status") == "ok" or result.get("result", {}).get("status") == "ok"
    except Exception as e:
        print(f"  ❌ Qdrant upsert 失敗: {e}")
        return False


def delete_collection():
    """刪除整個 collection"""
    req = urllib.request.Request(
        f"{QDRANT_URL}/collections/{COLLECTION}",
        method="DELETE",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            return result.get("result") is True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return True  # 本來就不存在
        print(f"  ❌ 刪除 collection 失敗: {e}")
        return False
    except Exception as e:
        print(f"  ❌ 刪除 collection 失敗: {e}")
        return False


def create_collection():
    """建立 collection（768 維, Cosine）"""
    data = json.dumps({
        "vectors": {
            "size": EMBED_DIM,
            "distance": "Cosine",
        }
    }).encode()
    req = urllib.request.Request(
        f"{QDRANT_URL}/collections/{COLLECTION}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            return result.get("result") is True
    except Exception as e:
        print(f"  ❌ 建立 collection 失敗: {e}")
        return False


def get_collection_info():
    """取得 collection 資訊"""
    req = urllib.request.Request(f"{QDRANT_URL}/collections/{COLLECTION}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            return result.get("result", {})
    except Exception:
        return None


def process_file(file_path, rel_path, category):
    """處理單一檔案：切 chunk → embed → upsert"""
    content = read_file(file_path)
    file_name = os.path.basename(file_path)
    chunks = chunk_by_section(content, rel_path, file_name, category)

    if not chunks:
        return 0

    points = []
    for chunk in chunks:
        # 用帶前綴的 embed_text 做 embedding，提升語義鑑別力
        embed_text = chunk.get("embed_text", chunk["content"])
        vec = get_embedding(embed_text)
        if vec is None:
            continue

        point_id = make_point_id(rel_path, chunk["chunk_index"])
        points.append({
            "id": point_id,
            "vector": vec,
            "payload": {
                "title": chunk["title"],
                "section_title": chunk["section_title"],
                "doc_title": chunk.get("doc_title", file_name),
                "content": chunk["content"],
                "content_preview": chunk["content"][:200],
                "file_path": chunk["file_path"],
                "file_name": chunk["file_name"],
                "category": chunk["category"],
                "chunk_index": chunk["chunk_index"],
                "chunk_total": chunk["chunk_total"],
                "size": len(chunk["content"]),
                "date": time.strftime("%Y-%m-%d"),
                "keywords": [],
            },
        })

    # 批次 upsert（每 20 個一批）
    ok_count = 0
    for i in range(0, len(points), 20):
        batch = points[i : i + 20]
        if upsert_points(batch):
            ok_count += len(batch)

    return ok_count


def main():
    rebuild = "--rebuild" in sys.argv

    print("=" * 50)
    if rebuild:
        print("🔄 重建模式：清空 collection 再重建")
    else:
        print("📝 追加模式：更新/新增 chunks")
    print(f"Collection: {COLLECTION}")
    print(f"Embedding: {EMBED_MODEL} ({EMBED_DIM} 維, 本地)")
    print(f"最小 chunk: {CHUNK_MIN} 字元")
    print("=" * 50)

    # --rebuild 模式：先清空
    if rebuild:
        print("\n🗑️  刪除舊 collection...")
        if delete_collection():
            print("  ✅ 已刪除")
        else:
            print("  ❌ 刪除失敗，中止")
            return

        print("🏗️  建立新 collection...")
        if create_collection():
            print(f"  ✅ 已建立 ({EMBED_DIM} 維, Cosine)")
        else:
            print("  ❌ 建立失敗，中止")
            return

    total = 0
    file_count = 0

    # 處理目錄
    for dir_name, category in TARGETS:
        dir_path = os.path.join(WORKSPACE, dir_name)
        if not os.path.isdir(dir_path):
            print(f"\n⚠️  目錄不存在: {dir_name}")
            continue

        md_files = sorted([f for f in os.listdir(dir_path) if f.endswith(".md")])
        print(f"\n📁 {dir_name}/ ({len(md_files)} 檔)")

        for fname in md_files:
            fpath = os.path.join(dir_path, fname)
            rel_path = f"{dir_name}/{fname}"
            count = process_file(fpath, rel_path, category)
            total += count
            file_count += 1
            print(f"  ✅ {fname} → {count} chunks")

    # 處理專案根目錄下的目錄（cookbook 等）
    for dir_name, category in PROJECT_TARGETS:
        dir_path = os.path.join(PROJECT_ROOT, dir_name)
        if not os.path.isdir(dir_path):
            print(f"\n⚠️  目錄不存在: {PROJECT_ROOT}/{dir_name}")
            continue

        md_files = sorted([f for f in os.listdir(dir_path) if f.endswith(".md")])
        print(f"\n📁 {dir_name}/ ({len(md_files)} 檔) [專案根目錄]")

        for fname in md_files:
            fpath = os.path.join(dir_path, fname)
            rel_path = f"{dir_name}/{fname}"
            count = process_file(fpath, rel_path, category)
            total += count
            file_count += 1
            print(f"  ✅ {fname} → {count} chunks")

    # 處理工具文件（armory + skills）
    tool_docs = collect_tool_docs()
    if tool_docs:
        print(f"\n🔧 工具文件 ({len(tool_docs)} 檔)")
        for fpath, rel_path, category in tool_docs:
            count = process_file(fpath, rel_path, category)
            total += count
            file_count += 1
            print(f"  ✅ {rel_path} → {count} chunks")

    # 處理單一檔案
    for fname, category in SINGLE_FILES:
        fpath = os.path.join(WORKSPACE, fname)
        if not os.path.isfile(fpath):
            print(f"\n⚠️  檔案不存在: {fname}")
            continue

        print(f"\n📄 {fname}")
        count = process_file(fpath, fname, category)
        total += count
        file_count += 1
        print(f"  ✅ {fname} → {count} chunks")

    # 最終統計
    print(f"\n{'=' * 50}")
    print(f"✅ 完成！")
    print(f"   檔案數：{file_count}")
    print(f"   Chunks：{total}")
    print(f"   Collection：{COLLECTION}")

    info = get_collection_info()
    if info:
        points_count = info.get("points_count", "?")
        print(f"   Qdrant 總點數：{points_count}")

    print("=" * 50)


if __name__ == "__main__":
    main()
