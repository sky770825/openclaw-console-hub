#!/usr/bin/env bash
# 為所有記憶檔案建立向量索引

set -euo pipefail

echo "🚀 開始建立完整向量索引"
echo "============================================================"

WORKSPACE="$HOME/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
QDRANT_URL="http://localhost:6333"
COLLECTION="memory_index"

# 統計檔案
TOTAL=$(find "$MEMORY_DIR" -name "*.md" -type f | wc -l | tr -d ' ')
echo "📊 總共 $TOTAL 個記憶檔案"
echo ""

python3 - <<'PYTHON'
import os
import sys
import json
import hashlib
import requests
from pathlib import Path
import time

WORKSPACE = Path(os.path.expanduser('~/.openclaw/workspace'))
MEMORY_DIR = WORKSPACE / 'memory'
QDRANT_URL = 'http://localhost:6333'
COLLECTION = 'memory_index'

# 取得所有 .md 檔案
md_files = list(MEMORY_DIR.glob('**/*.md'))
total_files = len(md_files)

print(f"開始索引 {total_files} 個檔案...\n")

success_count = 0
fail_count = 0

for idx, file_path in enumerate(md_files, 1):
    try:
        # 進度顯示
        progress = (idx / total_files) * 100
        print(f"[{idx}/{total_files}] ({progress:.1f}%) {file_path.name}...", end=" ", flush=True)

        # 讀取內容
        content = file_path.read_text(encoding='utf-8', errors='ignore')[:2000]

        if len(content.strip()) == 0:
            print("⏭️  空檔案")
            continue

        # 生成 embedding
        response = requests.post(
            'http://localhost:11434/api/embeddings',
            json={'model': 'nomic-embed-text', 'prompt': content},
            timeout=30
        )

        if response.status_code != 200:
            print(f"❌ Embedding失敗")
            fail_count += 1
            continue

        embedding = response.json().get('embedding')

        if not embedding or len(embedding) != 768:
            print(f"❌ 維度錯誤")
            fail_count += 1
            continue

        # 建立 point ID
        point_id = int(hashlib.md5(file_path.name.encode()).hexdigest()[:8], 16)

        # 上傳到 Qdrant
        upload_response = requests.put(
            f"{QDRANT_URL}/collections/{COLLECTION}/points",
            json={
                'points': [{
                    'id': point_id,
                    'vector': embedding,
                    'payload': {
                        'file_name': file_path.name,
                        'file_path': str(file_path.relative_to(WORKSPACE)),
                        'size': len(content),
                        'content_preview': content[:200]
                    }
                }]
            },
            timeout=10
        )

        if upload_response.status_code == 200:
            print("✅")
            success_count += 1
        else:
            print(f"❌ 上傳失敗")
            fail_count += 1

        # 每 10 個檔案暫停一下，避免太快
        if idx % 10 == 0:
            time.sleep(0.5)

    except Exception as e:
        print(f"❌ 錯誤: {str(e)[:30]}")
        fail_count += 1

print("\n" + "=" * 60)
print(f"✅ 索引建立完成！")
print(f"   成功: {success_count}")
print(f"   失敗: {fail_count}")
print(f"   總計: {total_files}")
print("=" * 60)

PYTHON

# 檢查結果
echo ""
echo "🔍 驗證索引..."
POINTS=$(curl -s "$QDRANT_URL/collections/$COLLECTION" | python3 -c "import sys, json; print(json.load(sys.stdin)['result']['points_count'])" 2>/dev/null || echo "0")

echo "📊 索引統計："
echo "   Collection: $COLLECTION"
echo "   Points: $POINTS"
echo ""
echo "✅ 完成！可以使用 smart-recall.py 進行搜尋了"
echo ""
echo "使用範例："
echo "  OLLAMA_MODEL=nomic-embed-text ./scripts/smart-recall.py 'n8n'"
