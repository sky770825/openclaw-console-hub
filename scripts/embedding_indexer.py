#!/usr/bin/env python3
"""
EmbeddingGemma 記憶索引建立器
使用 Google 的 EmbeddingGemma-300m 模型為 OpenClaw 記憶檔案建立語意索引

使用方式：
    python embedding_indexer.py --build   # 建立索引
    python embedding_indexer.py --search "查詢內容"  # 搜索
"""

import json
import os
import glob
from pathlib import Path
from datetime import datetime

# 嘗試載入 sentence-transformers
try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False
    print("⚠️ 請先安裝依賴套件：")
    print("pip install git+https://github.com/huggingface/transformers@v4.56.0-Embedding-Gemma-preview")
    print("pip install sentence-transformers>=5.0.0")

# 設定路徑
WORKSPACE = Path(os.environ.get("OPENCLAW_WORKSPACE", Path.home() / ".openclaw" / "workspace"))
MEMORY_DIR = WORKSPACE / "memory"
MEMORY_FILE = WORKSPACE / "MEMORY.md"
INDEX_FILE = WORKSPACE / "memory_index.json"

# 模型設定
MODEL_NAME = "google/embeddinggemma-300m"
TRUNCATE_DIM = 256  # 使用 256 維度以節省空間，同時保持良好的效能

def load_model():
    """載入 EmbeddingGemma 模型"""
    if not HAS_SENTENCE_TRANSFORMERS:
        raise RuntimeError("sentence-transformers 未安裝")
    
    print(f"🔄 載入模型 {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME, truncate_dim=TRUNCATE_DIM)
    print("✅ 模型載入完成")
    return model

def parse_markdown_to_chunks(file_path: Path, chunk_size: int = 500) -> list[dict]:
    """
    將 Markdown 檔案解析成小塊
    每個塊包含：文字內容、來源檔案、行號範圍
    """
    chunks = []
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"⚠️ 無法讀取 {file_path}: {e}")
        return chunks
    
    lines = content.split("\n")
    current_chunk = []
    current_start_line = 1
    current_length = 0
    
    for i, line in enumerate(lines, 1):
        line_length = len(line)
        
        # 如果加上這行會超過 chunk_size，先儲存當前的 chunk
        if current_length + line_length > chunk_size and current_chunk:
            chunk_text = "\n".join(current_chunk).strip()
            if chunk_text:  # 只儲存非空的 chunk
                chunks.append({
                    "text": chunk_text,
                    "source": str(file_path.relative_to(WORKSPACE)),
                    "start_line": current_start_line,
                    "end_line": i - 1
                })
            current_chunk = []
            current_start_line = i
            current_length = 0
        
        current_chunk.append(line)
        current_length += line_length + 1  # +1 for newline
    
    # 儲存最後一個 chunk
    if current_chunk:
        chunk_text = "\n".join(current_chunk).strip()
        if chunk_text:
            chunks.append({
                "text": chunk_text,
                "source": str(file_path.relative_to(WORKSPACE)),
                "start_line": current_start_line,
                "end_line": len(lines)
            })
    
    return chunks

def collect_all_chunks() -> list[dict]:
    """收集所有記憶檔案的內容塊"""
    all_chunks = []
    
    # 處理 MEMORY.md
    if MEMORY_FILE.exists():
        chunks = parse_markdown_to_chunks(MEMORY_FILE)
        all_chunks.extend(chunks)
        print(f"📄 MEMORY.md: {len(chunks)} 個區塊")
    
    # 處理 memory/*.md
    if MEMORY_DIR.exists():
        for md_file in sorted(MEMORY_DIR.glob("*.md")):
            chunks = parse_markdown_to_chunks(md_file)
            all_chunks.extend(chunks)
            print(f"📄 {md_file.name}: {len(chunks)} 個區塊")
    
    return all_chunks

def build_index():
    """建立記憶索引"""
    print("🚀 開始建立記憶索引...")
    
    # 收集所有內容
    chunks = collect_all_chunks()
    if not chunks:
        print("⚠️ 沒有找到任何記憶檔案")
        return
    
    print(f"\n📊 總共 {len(chunks)} 個區塊需要索引")
    
    # 載入模型
    model = load_model()
    
    # 生成 embeddings
    print("🔄 生成 embeddings...")
    texts = [chunk["text"] for chunk in chunks]
    embeddings = model.encode_document(texts, show_progress_bar=True)
    
    # 建立索引
    index = {
        "created_at": datetime.now().isoformat(),
        "model": MODEL_NAME,
        "dimensions": TRUNCATE_DIM,
        "chunks": chunks,
        "embeddings": embeddings.tolist()
    }
    
    # 儲存索引
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 索引已儲存至 {INDEX_FILE}")
    print(f"   - 區塊數量: {len(chunks)}")
    print(f"   - 向量維度: {TRUNCATE_DIM}")
    print(f"   - 檔案大小: {INDEX_FILE.stat().st_size / 1024:.1f} KB")

def cosine_similarity(a, b):
    """計算餘弦相似度"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def search(query: str, top_k: int = 5):
    """語意搜索"""
    if not INDEX_FILE.exists():
        print("⚠️ 索引檔案不存在，請先執行 --build")
        return []
    
    # 載入索引
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        index = json.load(f)
    
    # 載入模型
    model = load_model()
    
    # 生成查詢 embedding
    query_embedding = model.encode_query(query)
    
    # 計算相似度
    embeddings = np.array(index["embeddings"])
    scores = [cosine_similarity(query_embedding, emb) for emb in embeddings]
    
    # 排序並取 top_k
    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:top_k]
    
    results = []
    for idx, score in ranked:
        chunk = index["chunks"][idx]
        results.append({
            "score": float(score),
            "text": chunk["text"],
            "source": chunk["source"],
            "lines": f"{chunk['start_line']}-{chunk['end_line']}"
        })
    
    return results

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="EmbeddingGemma 記憶索引工具")
    parser.add_argument("--build", action="store_true", help="建立索引")
    parser.add_argument("--search", type=str, help="語意搜索")
    parser.add_argument("--top-k", type=int, default=5, help="返回結果數量")
    
    args = parser.parse_args()
    
    if args.build:
        build_index()
    elif args.search:
        results = search(args.search, args.top_k)
        print(f"\n🔍 搜索: {args.search}\n")
        for i, result in enumerate(results, 1):
            print(f"--- 結果 {i} (相似度: {result['score']:.3f}) ---")
            print(f"📍 來源: {result['source']} (行 {result['lines']})")
            print(f"📝 內容: {result['text'][:200]}...")
            print()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
