#!/usr/bin/env bash
# 文本切塊索引系統（提升召回準確率）
# 將每個檔案切分成多個 chunks，獨立索引

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
QDRANT_URL="http://localhost:6333"
COLLECTION="memory_chunks"

echo "🚀 文本切塊索引系統"
echo "============================================================"
echo "策略：每個檔案切分成多個 2000 字元 chunks"
echo "目標：提升召回準確率至 85%+"
echo ""

# 建立新 collection（避免覆蓋舊的）
echo "📦 建立新 collection: $COLLECTION"
curl -X DELETE "$QDRANT_URL/collections/$COLLECTION" 2>/dev/null || true

curl -X PUT "$QDRANT_URL/collections/$COLLECTION" \
    -H 'Content-Type: application/json' \
    -d '{
        "vectors": {
            "size": 768,
            "distance": "Cosine"
        }
    }' 2>/dev/null

echo "✅ Collection 建立完成"
echo ""

# 統計檔案
TOTAL=$(find "$MEMORY_DIR" -name "*.md" -type f | wc -l | tr -d ' ')
echo "📊 總共 $TOTAL 個記憶檔案"
echo ""

# 使用 Python 處理切塊索引
python3 - <<'PYTHON'
import os
import sys
import json
import hashlib
import requests
from pathlib import Path
import time
import re

WORKSPACE = Path(os.path.expanduser('~/.openclaw/workspace'))
MEMORY_DIR = WORKSPACE / 'memory'
QDRANT_URL = 'http://localhost:6333'
COLLECTION = 'memory_chunks'
CHUNK_SIZE = 2000  # 每個 chunk 2000 字元
CHUNK_OVERLAP = 200  # 重疊 200 字元

def extract_metadata(file_path, content):
    """提取檔案 metadata"""
    # 提取標題（第一個 # 開頭的行）
    title = None
    for line in content.split('\n')[:10]:  # 只看前 10 行
        if line.strip().startswith('#'):
            title = line.strip('# ').strip()
            break

    # 從檔名提取日期
    date = None
    filename = file_path.stem
    # 匹配 YYYY-MM-DD 格式
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if date_match:
        date = date_match.group(1)

    # 分類（根據路徑或內容）
    category = 'general'
    if 'autopilot' in str(file_path):
        category = 'autopilot'
    elif 'summaries' in str(file_path):
        category = 'summary'
    elif 'handoff' in str(file_path):
        category = 'handoff'
    elif 'checkpoint' in str(file_path).lower():
        category = 'checkpoint'

    return {
        'title': title or filename,
        'date': date,
        'category': category,
        'file_name': file_path.name,
        'file_path': str(file_path.relative_to(WORKSPACE))
    }

def chunk_text(text, chunk_size=2000, overlap=200):
    """切分文本為多個 chunks，帶重疊"""
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]

        if chunk.strip():
            chunks.append({
                'text': chunk,
                'start': start,
                'end': min(end, len(text))
            })

        # 下一個 chunk 的起點（帶重疊）
        start = end - overlap

        # 避免無限循環
        if start >= len(text):
            break

    return chunks

def index_file_with_chunks(file_path, file_index, total_files):
    """為單個檔案建立切塊索引"""
    try:
        # 讀取內容
        content = file_path.read_text(encoding='utf-8', errors='ignore')

        if len(content.strip()) == 0:
            print(f"[{file_index}/{total_files}] {file_path.name} - ⏭️  空檔案")
            return 0

        # 提取 metadata
        metadata = extract_metadata(file_path, content)

        # 切分文本
        chunks = chunk_text(content, CHUNK_SIZE, CHUNK_OVERLAP)

        if not chunks:
            print(f"[{file_index}/{total_files}] {file_path.name} - ⚠️  無法切分")
            return 0

        print(f"[{file_index}/{total_files}] {file_path.name} ({len(content)} 字元 → {len(chunks)} chunks)", end=" ", flush=True)

        indexed_count = 0

        for chunk_idx, chunk_data in enumerate(chunks):
            try:
                # 生成 embedding
                response = requests.post(
                    'http://localhost:11434/api/embeddings',
                    json={
                        'model': 'nomic-embed-text',
                        'prompt': chunk_data['text']
                    },
                    timeout=30
                )

                if response.status_code != 200:
                    continue

                embedding = response.json().get('embedding')

                if not embedding or len(embedding) != 768:
                    continue

                # 建立唯一 point ID（檔案 hash + chunk index）
                file_hash = hashlib.md5(file_path.name.encode()).hexdigest()
                point_id_str = f"{file_hash}-{chunk_idx}"
                point_id = int(hashlib.md5(point_id_str.encode()).hexdigest()[:15], 16)

                # 上傳到 Qdrant
                payload = {
                    **metadata,
                    'chunk_index': chunk_idx,
                    'chunk_total': len(chunks),
                    'chunk_start': chunk_data['start'],
                    'chunk_end': chunk_data['end'],
                    'content_preview': chunk_data['text'][:200],
                    'size': len(chunk_data['text'])
                }

                upload_response = requests.put(
                    f"{QDRANT_URL}/collections/{COLLECTION}/points",
                    json={
                        'points': [{
                            'id': point_id,
                            'vector': embedding,
                            'payload': payload
                        }]
                    },
                    timeout=10
                )

                if upload_response.status_code == 200:
                    indexed_count += 1

            except Exception as e:
                continue

        print(f"✅ ({indexed_count}/{len(chunks)})")
        return indexed_count

    except Exception as e:
        print(f"[{file_index}/{total_files}] {file_path.name} - ❌ {str(e)[:30]}")
        return 0

# 主程序
md_files = list(MEMORY_DIR.glob('**/*.md'))
total_files = len(md_files)
total_chunks = 0

print(f"開始索引 {total_files} 個檔案...\n")

for idx, file_path in enumerate(md_files, 1):
    chunks = index_file_with_chunks(file_path, idx, total_files)
    total_chunks += chunks

    # 每 10 個檔案暫停
    if idx % 10 == 0:
        time.sleep(0.5)

print("\n" + "=" * 60)
print(f"✅ 切塊索引建立完成！")
print(f"   檔案數: {total_files}")
print(f"   總 chunks: {total_chunks}")
print(f"   平均每檔案: {total_chunks/total_files if total_files > 0 else 0:.1f} chunks")
print("=" * 60)

PYTHON

# 驗證索引
echo ""
echo "🔍 驗證索引..."
POINTS=$(curl -s "$QDRANT_URL/collections/$COLLECTION" | python3 -c "import sys, json; print(json.load(sys.stdin)['result']['points_count'])" 2>/dev/null || echo "0")

echo "📊 索引統計："
echo "   Collection: $COLLECTION"
echo "   Points: $POINTS"
echo ""

if [[ $POINTS -gt 0 ]]; then
    echo "✅ 切塊索引建立成功！"
    echo ""
    echo "📝 使用方法："
    echo "   COLLECTION_NAME=memory_chunks OLLAMA_MODEL=nomic-embed-text ./scripts/smart-recall.py '關鍵字'"
    echo ""
    echo "📊 對比："
    echo "   舊索引: 221 points（每檔案 1 個）"
    echo "   新索引: $POINTS points（每檔案多個 chunks）"
    echo "   提升: $((POINTS / 221))x"
else
    echo "⚠️  索引建立失敗"
fi
