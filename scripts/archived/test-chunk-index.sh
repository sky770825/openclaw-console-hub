#!/usr/bin/env bash
# 測試文本切塊索引（只索引 5 個檔案）

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
QDRANT_URL="http://localhost:6333"
COLLECTION="memory_chunks_test"

echo "🧪 測試文本切塊索引"
echo "============================================================"

# 建立測試 collection
curl -X DELETE "$QDRANT_URL/collections/$COLLECTION" 2>/dev/null || true
curl -X PUT "$QDRANT_URL/collections/$COLLECTION" \
    -H 'Content-Type: application/json' \
    -d '{"vectors": {"size": 768, "distance": "Cosine"}}' 2>/dev/null

echo "✅ 測試 collection 建立完成"
echo ""

# 取得最近 5 個檔案測試
python3 - <<'PYTHON'
import os
import hashlib
import requests
from pathlib import Path
import re

WORKSPACE = Path(os.path.expanduser('~/.openclaw/workspace'))
MEMORY_DIR = WORKSPACE / 'memory'
QDRANT_URL = 'http://localhost:6333'
COLLECTION = 'memory_chunks_test'

def chunk_text(text, size=2000, overlap=200):
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append({'text': chunk, 'start': start, 'end': min(end, len(text))})
        start = end - overlap
        if start >= len(text):
            break
    return chunks

# 取最近 5 個檔案
files = sorted(MEMORY_DIR.glob('*.md'), key=lambda p: p.stat().st_mtime, reverse=True)[:5]

print(f"測試索引 {len(files)} 個檔案\n")

total_chunks = 0

for idx, file_path in enumerate(files, 1):
    try:
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        
        if not content.strip():
            print(f"{idx}. {file_path.name} - 空檔案")
            continue
        
        chunks = chunk_text(content)
        print(f"{idx}. {file_path.name} ({len(content)} 字元 → {len(chunks)} chunks)", end=" ")
        
        indexed = 0
        for chunk_idx, chunk_data in enumerate(chunks):
            # 生成 embedding
            response = requests.post(
                'http://localhost:11434/api/embeddings',
                json={'model': 'nomic-embed-text', 'prompt': chunk_data['text']},
                timeout=30
            )
            
            if response.status_code != 200:
                continue
            
            embedding = response.json().get('embedding')
            
            if not embedding or len(embedding) != 768:
                continue
            
            # 上傳
            file_hash = hashlib.md5(file_path.name.encode()).hexdigest()
            point_id_str = f"{file_hash}-{chunk_idx}"
            point_id = int(hashlib.md5(point_id_str.encode()).hexdigest()[:15], 16)
            
            upload_response = requests.put(
                f"{QDRANT_URL}/collections/{COLLECTION}/points",
                json={
                    'points': [{
                        'id': point_id,
                        'vector': embedding,
                        'payload': {
                            'file_name': file_path.name,
                            'chunk_index': chunk_idx,
                            'chunk_total': len(chunks),
                            'content_preview': chunk_data['text'][:200]
                        }
                    }]
                },
                timeout=10
            )
            
            if upload_response.status_code == 200:
                indexed += 1
        
        print(f"✅ ({indexed}/{len(chunks)})")
        total_chunks += indexed
        
    except Exception as e:
        print(f"{idx}. {file_path.name} - ❌ {str(e)[:30]}")

print(f"\n總計: {total_chunks} chunks 索引完成")

PYTHON

# 驗證
POINTS=$(curl -s "$QDRANT_URL/collections/$COLLECTION" | python3 -c "import sys, json; print(json.load(sys.stdin)['result']['points_count'])" 2>/dev/null || echo "0")

echo ""
echo "============================================================"
echo "✅ 測試完成"
echo "   索引 chunks: $POINTS"
echo ""
echo "🔎 測試搜尋："
echo "   COLLECTION_NAME=memory_chunks_test OLLAMA_MODEL=nomic-embed-text ./scripts/smart-recall.py 'n8n'"
