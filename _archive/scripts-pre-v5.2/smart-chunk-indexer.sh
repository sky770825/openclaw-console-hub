#!/usr/bin/env bash
# 智能切塊索引器 - P0 優化版本
# 特性：
# 1. 按段落/標題切分（而非固定字元數）
# 2. 自動提取元資料（標題、日期、分類、關鍵字）
# 3. 保留 markdown 結構完整性

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
QDRANT_URL="http://localhost:6333"
COLLECTION="memory_smart_chunks"

echo "🚀 智能切塊索引器 v2.0"
echo "============================================================"
echo "策略：按段落/標題切分，保留 markdown 結構"
echo "目標：提升召回準確率至 85%+"
echo ""

# 建立新 collection
echo "📦 建立 collection: $COLLECTION"
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

# 使用 Python 處理智能切塊索引
python3 - <<'PYTHON'
import os
import sys
import json
import hashlib
import requests
from pathlib import Path
import time
import re
from typing import List, Dict, Tuple

WORKSPACE = Path(os.path.expanduser('~/.openclaw/workspace'))
MEMORY_DIR = WORKSPACE / 'memory'
QDRANT_URL = 'http://localhost:6333'
COLLECTION = 'memory_smart_chunks'

def extract_keywords(text: str, top_n: int = 5) -> List[str]:
    """簡單關鍵字提取（基於詞頻）"""
    # 移除 markdown 語法
    clean_text = re.sub(r'[#*`\[\]()]', ' ', text)
    # 分詞（簡單版）
    words = clean_text.split()
    # 過濾短詞和常見詞
    stopwords = {'的', '是', '在', '了', '有', '和', '與', '或', '等', '但', '我',
                 '你', '他', '她', 'the', 'is', 'and', 'or', 'to', 'a', 'an'}
    words = [w for w in words if len(w) > 1 and w.lower() not in stopwords]

    # 統計詞頻
    word_freq = {}
    for word in words:
        word_freq[word] = word_freq.get(word, 0) + 1

    # 取 top N
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, freq in sorted_words[:top_n]]

def extract_metadata(file_path: Path, content: str) -> Dict:
    """提取檔案元資料（增強版）"""
    # 1. 提取標題（第一個 # 開頭的行）
    title = None
    for line in content.split('\n')[:10]:
        if line.strip().startswith('#'):
            title = line.strip('#').strip()
            break

    # 2. 從檔名提取日期
    date = None
    filename = file_path.stem
    # 匹配多種日期格式
    date_patterns = [
        r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
        r'(\d{4}\d{2}\d{2})',     # YYYYMMDD
    ]
    for pattern in date_patterns:
        match = re.search(pattern, filename)
        if match:
            date_str = match.group(1)
            if len(date_str) == 8:  # YYYYMMDD → YYYY-MM-DD
                date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
            else:
                date = date_str
            break

    # 3. 分類（根據路徑和內容）
    category = 'general'
    path_str = str(file_path).lower()
    if 'autopilot' in path_str:
        category = 'autopilot'
    elif 'summaries' in path_str or 'summary' in filename.lower():
        category = 'summary'
    elif 'handoff' in path_str:
        category = 'handoff'
    elif 'checkpoint' in path_str:
        category = 'checkpoint'
    elif 'learning' in path_str:
        category = 'learning'
    elif 'task' in filename.lower():
        category = 'task'

    # 4. 提取關鍵字
    keywords = extract_keywords(content)

    return {
        'title': title or filename,
        'date': date,
        'category': category,
        'keywords': keywords,
        'file_name': file_path.name,
        'file_path': str(file_path.relative_to(WORKSPACE))
    }

def smart_chunk_text(text: str) -> List[Dict]:
    """智能切塊：按段落和標題切分"""
    chunks = []

    # 按雙換行符切分段落
    paragraphs = text.split('\n\n')

    current_chunk = {
        'text': '',
        'section_title': None,
        'start_pos': 0
    }

    current_pos = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            current_pos += 2  # \n\n
            continue

        # 檢查是否為標題
        is_heading = para.startswith('#')

        # 如果是標題且當前 chunk 已有內容，先保存當前 chunk
        if is_heading and current_chunk['text']:
            chunks.append({
                'text': current_chunk['text'].strip(),
                'section_title': current_chunk['section_title'],
                'start': current_chunk['start_pos'],
                'end': current_pos
            })
            current_chunk = {
                'text': '',
                'section_title': para.strip('#').strip(),
                'start_pos': current_pos
            }

        # 更新當前 chunk
        if is_heading and not current_chunk['section_title']:
            current_chunk['section_title'] = para.strip('#').strip()

        current_chunk['text'] += para + '\n\n'

        # 如果當前 chunk 太大（> 3000 字元），切分
        if len(current_chunk['text']) > 3000:
            chunks.append({
                'text': current_chunk['text'].strip(),
                'section_title': current_chunk['section_title'],
                'start': current_chunk['start_pos'],
                'end': current_pos + len(para) + 2
            })
            current_chunk = {
                'text': '',
                'section_title': current_chunk['section_title'],  # 保留標題
                'start_pos': current_pos + len(para) + 2
            }

        current_pos += len(para) + 2

    # 保存最後一個 chunk
    if current_chunk['text'].strip():
        chunks.append({
            'text': current_chunk['text'].strip(),
            'section_title': current_chunk['section_title'],
            'start': current_chunk['start_pos'],
            'end': current_pos
        })

    return chunks

def index_file_smart(file_path: Path, file_index: int, total_files: int) -> int:
    """智能索引單個檔案"""
    try:
        # 讀取內容
        content = file_path.read_text(encoding='utf-8', errors='ignore')

        if len(content.strip()) == 0:
            print(f"[{file_index}/{total_files}] {file_path.name} - ⏭️  空檔案")
            return 0

        # 提取元資料
        metadata = extract_metadata(file_path, content)

        # 智能切塊
        chunks = smart_chunk_text(content)

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

                # 建立唯一 point ID
                file_hash = hashlib.md5(file_path.name.encode()).hexdigest()
                point_id_str = f"{file_hash}-{chunk_idx}"
                point_id = int(hashlib.md5(point_id_str.encode()).hexdigest()[:15], 16)

                # 上傳到 Qdrant
                payload = {
                    **metadata,
                    'chunk_index': chunk_idx,
                    'chunk_total': len(chunks),
                    'section_title': chunk_data.get('section_title'),
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

print(f"開始智能索引 {total_files} 個檔案...\n")

for idx, file_path in enumerate(md_files, 1):
    chunks = index_file_smart(file_path, idx, total_files)
    total_chunks += chunks

    # 每 10 個檔案暫停
    if idx % 10 == 0:
        time.sleep(0.5)

print("\n" + "=" * 60)
print(f"✅ 智能切塊索引建立完成！")
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
    echo "✅ 智能切塊索引建立成功！"
    echo ""
    echo "📝 使用方法："
    echo "   COLLECTION_NAME=memory_smart_chunks ./scripts/smart-recall.py '關鍵字'"
    echo ""
    echo "📊 優化效果："
    echo "   舊版（固定切塊）: ~65% 準確率"
    echo "   新版（智能切塊）: 預期 85%+ 準確率"
else
    echo "⚠️  索引建立失敗"
fi
