#!/bin/bash
# 高含量索引重建 - 簡化版
# 分批處理，避免記憶體問題

set -e

WORKSPACE="$HOME/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
QDRANT_URL="http://localhost:6333"
COLLECTION="memory_smart_chunks_v2"

echo "🚀 高含量索引重建（簡化版）"
echo "=========================================="

# 建立 collection
echo "📦 建立 collection: $COLLECTION"
curl -s -X DELETE "$QDRANT_URL/collections/$COLLECTION" > /dev/null 2>&1 || true
curl -s -X PUT "$QDRANT_URL/collections/$COLLECTION" \
    -H 'Content-Type: application/json' \
    -d '{"vectors":{"size":768,"distance":"Cosine"},"hnsw_config":{"m":16,"ef_construct":100}}' > /dev/null

# 統計檔案
TOTAL=$(find "$MEMORY_DIR" -name "*.md" -type f | wc -l | tr -d ' ')
echo "📊 總共 $TOTAL 個記憶檔案"
echo ""

# 使用 Python 批次處理
python3 << 'PYTHON'
import os
import sys
import json
import hashlib
import requests
import re
from pathlib import Path
from collections import Counter

WORKSPACE = Path(os.path.expanduser('~/.openclaw/workspace'))
MEMORY_DIR = WORKSPACE / 'memory'
QDRANT_URL = 'http://localhost:6333'
COLLECTION = 'memory_smart_chunks_v2'

def extract_keywords(text, top_n=5):
    """提取關鍵詞"""
    clean = re.sub(r'[#*`\[\]()]', ' ', text)
    words = [w for w in clean.split() if len(w) > 1]
    stopwords = {'的', '是', '在', '了', '有', '和', 'the', 'is', 'and'}
    words = [w for w in words if w.lower() not in stopwords]
    freq = Counter(words)
    return [w for w, _ in freq.most_common(top_n)]

def smart_chunk(text):
    """簡單切塊"""
    chunks = []
    paras = text.split('\n\n')
    current = {'text': '', 'title': None}
    
    for para in paras:
        para = para.strip()
        if not para:
            continue
        if para.startswith('#') and current['text']:
            chunks.append(current)
            current = {'text': '', 'title': para.strip('#').strip()}
        current['text'] += para + '\n'
        if len(current['text']) > 2000:
            chunks.append(current)
            current = {'text': '', 'title': current['title']}
    
    if current['text'].strip():
        chunks.append(current)
    return chunks

# 收集檔案
files = list(MEMORY_DIR.glob('**/*.md'))
print(f"處理 {len(files)} 個檔案...\n")

all_points = []
processed = 0

for idx, fp in enumerate(files, 1):
    try:
        content = fp.read_text(encoding='utf-8', errors='ignore')
        if len(content.strip()) == 0:
            continue
        
        # 提取標題
        title = fp.stem
        for line in content.split('\n')[:5]:
            if line.strip().startswith('#'):
                title = line.strip('#').strip()
                break
        
        # 切塊
        chunks = smart_chunk(content)
        if not chunks:
            continue
        
        for ci, chunk in enumerate(chunks):
            # 生成 embedding
            try:
                resp = requests.post(
                    'http://localhost:11434/api/embeddings',
                    json={'model': 'nomic-embed-text', 'prompt': chunk['text'][:500]},
                    timeout=10
                )
                if resp.status_code != 200:
                    continue
                emb = resp.json().get('embedding')
                if not emb:
                    continue
                
                # 生成關鍵詞
                keywords = extract_keywords(chunk['text'])
                
                # 建立 point
                content_hash = hashlib.md5(chunk['text'][:100].encode()).hexdigest()
                point_id = int(content_hash[:15], 16)
                
                all_points.append({
                    'id': point_id,
                    'vector': emb,
                    'payload': {
                        'file_path': str(fp.relative_to(WORKSPACE)),
                        'title': title,
                        'section_title': chunk['title'],
                        'content_preview': chunk['text'][:200],
                        'keywords': keywords,
                        'size': len(chunk['text'])
                    }
                })
                
            except Exception as e:
                continue
        
        processed += 1
        if processed % 10 == 0:
            print(f"  [{idx}/{len(files)}] {fp.name} - {len(chunks)} chunks")
            
            # 每 100 個 points 上傳一次
            if len(all_points) >= 100:
                print(f"  上傳 {len(all_points)} points...")
                requests.put(
                    f"{QDRANT_URL}/collections/{COLLECTION}/points",
                    json={'points': all_points},
                    timeout=30
                )
                all_points = []
                
    except Exception as e:
        print(f"  [{idx}] {fp.name} - 錯誤: {e}")
        continue

# 上傳剩餘 points
if all_points:
    print(f"\n上傳最後 {len(all_points)} points...")
    requests.put(
        f"{QDRANT_URL}/collections/{COLLECTION}/points",
        json={'points': all_points},
        timeout=30
    )

print(f"\n✅ 完成！處理了 {processed} 個檔案")
PYTHON

echo ""
echo "📈 檢查結果..."
curl -s "$QDRANT_URL/collections/$COLLECTION" | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(f\"總計 Points: {d['result']['points_count']}\")
print(f\"索引狀態: {d['result']['status']}\")
"
