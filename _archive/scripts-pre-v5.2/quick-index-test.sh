#!/usr/bin/env bash
# 快速測試：建立向量索引（簡化版）

set -euo pipefail

echo "🚀 快速向量索引測試"
echo "============================================================"

# 配置
QDRANT_URL="http://localhost:6333"
COLLECTION="memory_index"
WORKSPACE="$HOME/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"

# Step 1: 建立 collection (768 維，對應 nomic-embed-text)
echo "📦 建立 collection..."
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

# Step 2: 測試索引 3 個檔案
echo "📄 索引測試檔案..."

python3 - <<'PYTHON'
import os
import sys
import json
import hashlib
import requests
from pathlib import Path

WORKSPACE = Path(os.path.expanduser('~/.openclaw/workspace'))
MEMORY_DIR = WORKSPACE / 'memory'
QDRANT_URL = 'http://localhost:6333'
COLLECTION = 'memory_index'

# 取得最近的 3 個檔案進行測試
md_files = sorted(MEMORY_DIR.glob('*.md'), key=lambda p: p.stat().st_mtime, reverse=True)[:3]

print(f"測試索引 {len(md_files)} 個檔案\n")

for idx, file_path in enumerate(md_files, 1):
    try:
        print(f"{idx}. {file_path.name}")

        # 讀取內容
        content = file_path.read_text(encoding='utf-8', errors='ignore')[:2000]  # 只取前 2000 字元

        if len(content.strip()) == 0:
            print("   ⏭️  空檔案，跳過\n")
            continue

        # 生成 embedding
        response = requests.post(
            'http://localhost:11434/api/embeddings',
            json={'model': 'nomic-embed-text', 'prompt': content},
            timeout=30
        )

        if response.status_code != 200:
            print(f"   ❌ Embedding 失敗: {response.status_code}\n")
            continue

        embedding = response.json().get('embedding')

        if not embedding or len(embedding) != 768:
            print(f"   ❌ Embedding 維度錯誤: {len(embedding) if embedding else 0}\n")
            continue

        print(f"   ✅ Embedding 生成成功 (768 維)")

        # 建立 point
        point_id = int(hashlib.md5(file_path.name.encode()).hexdigest()[:8], 16)

        upload_response = requests.put(
            f"{QDRANT_URL}/collections/{COLLECTION}/points",
            json={
                'points': [{
                    'id': point_id,
                    'vector': embedding,
                    'payload': {
                        'file_name': file_path.name,
                        'file_path': str(file_path.relative_to(WORKSPACE)),
                        'content_preview': content[:200]
                    }
                }]
            },
            timeout=10
        )

        if upload_response.status_code == 200:
            print(f"   ✅ 上傳成功\n")
        else:
            print(f"   ❌ 上傳失敗: {upload_response.status_code}\n")

    except Exception as e:
        print(f"   ❌ 錯誤: {e}\n")

PYTHON

# Step 3: 檢查結果
echo "🔍 檢查索引結果..."
POINTS=$(curl -s "$QDRANT_URL/collections/$COLLECTION" | python3 -c "import sys, json; print(json.load(sys.stdin)['result']['points_count'])" 2>/dev/null || echo "0")

echo "索引完成！Points: $POINTS"
echo ""

# Step 4: 測試搜尋
echo "🔎 測試搜尋功能..."
echo "查詢: n8n"

python3 - <<'PYTHON'
import requests

# 生成查詢向量
response = requests.post(
    'http://localhost:11434/api/embeddings',
    json={'model': 'nomic-embed-text', 'prompt': 'n8n'},
    timeout=30
)

if response.status_code != 200:
    print(f"❌ 查詢向量生成失敗")
    exit(1)

query_vector = response.json().get('embedding')

# 搜尋
search_response = requests.post(
    'http://localhost:6333/collections/memory_index/points/search',
    json={
        'vector': query_vector,
        'limit': 3,
        'with_payload': True
    },
    timeout=10
)

if search_response.status_code == 200:
    results = search_response.json().get('result', [])
    print(f"\n找到 {len(results)} 個結果：\n")

    for i, result in enumerate(results, 1):
        score = result.get('score', 0)
        payload = result.get('payload', {})
        print(f"{i}. {payload.get('file_name', '未知')}")
        print(f"   相似度: {score:.4f}")
        print(f"   預覽: {payload.get('content_preview', '')[:100]}...\n")
else:
    print(f"❌ 搜尋失敗: {search_response.status_code}")

PYTHON

echo ""
echo "✅ 測試完成！"
echo ""
echo "下一步："
echo "  1. 執行完整索引: ./scripts/build-vector-index.sh"
echo "  2. 使用搜尋工具: ./scripts/smart-recall.py '關鍵字'"
