#!/usr/bin/env bash
# 向量索引建立系統
# 功能：為所有記憶檔案建立向量索引，實現語義搜尋
# 使用：Ollama (免費) + Qdrant

set -euo pipefail

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
MEMORY_DIR="$WORKSPACE/memory"
QDRANT_URL="${QDRANT_URL:-http://localhost:6333}"
COLLECTION_NAME="${COLLECTION_NAME:-memory_index}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:8b}"

echo "🔍 向量索引建立系統"
echo "================================"
echo "記憶目錄: $MEMORY_DIR"
echo "Qdrant URL: $QDRANT_URL"
echo "Collection: $COLLECTION_NAME"
echo "Ollama 模型: $OLLAMA_MODEL"
echo ""

# ============================================
# Step 1: 檢查依賴
# ============================================

echo "📋 檢查依賴..."

# 檢查 Qdrant
if ! curl -sf "$QDRANT_URL/collections" >/dev/null 2>&1; then
    echo "❌ Qdrant 無法連接: $QDRANT_URL"
    echo "   請確認 Qdrant 服務正在運行"
    exit 1
fi
echo "✅ Qdrant 連接正常"

# 檢查 Ollama
if ! command -v ollama >/dev/null 2>&1; then
    echo "❌ Ollama 未安裝"
    exit 1
fi

if ! ollama list | grep -q "$OLLAMA_MODEL"; then
    echo "⚠️  模型 $OLLAMA_MODEL 未安裝，嘗試下載..."
    ollama pull "$OLLAMA_MODEL"
fi
echo "✅ Ollama 模型可用"

# 檢查 Python
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Python3 未安裝"
    exit 1
fi
echo "✅ Python3 可用"

# ============================================
# Step 2: 建立/重建 Collection
# ============================================

echo ""
echo "🗄️  準備 Qdrant Collection..."

# 檢查 collection 是否存在
if curl -sf "$QDRANT_URL/collections/$COLLECTION_NAME" >/dev/null 2>&1; then
    echo "⚠️  Collection '$COLLECTION_NAME' 已存在"
    read -p "是否刪除並重建？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  刪除舊 collection..."
        curl -X DELETE "$QDRANT_URL/collections/$COLLECTION_NAME" >/dev/null 2>&1
        echo "✅ 已刪除"
    else
        echo "ℹ️  將更新現有 collection"
    fi
fi

# 建立 collection（如果不存在）
if ! curl -sf "$QDRANT_URL/collections/$COLLECTION_NAME" >/dev/null 2>&1; then
    echo "🔨 建立新 collection..."
    curl -X PUT "$QDRANT_URL/collections/$COLLECTION_NAME" \
        -H 'Content-Type: application/json' \
        -d '{
            "vectors": {
                "size": 4096,
                "distance": "Cosine"
            }
        }' >/dev/null 2>&1
    echo "✅ Collection 建立完成"
fi

# ============================================
# Step 3: 掃描並索引所有記憶檔案
# ============================================

echo ""
echo "📁 掃描記憶檔案..."

# 統計檔案數
TOTAL_FILES=$(find "$MEMORY_DIR" -name "*.md" -type f | wc -l | tr -d ' ')
echo "📊 找到 $TOTAL_FILES 個記憶檔案"

if [[ $TOTAL_FILES -eq 0 ]]; then
    echo "⚠️  沒有找到記憶檔案"
    exit 0
fi

echo ""
echo "🚀 開始建立索引..."
echo ""

# 使用 Python 處理
python3 - <<'PYTHON_SCRIPT'
import json
import os
import sys
import hashlib
import requests
import subprocess
from pathlib import Path
from datetime import datetime

WORKSPACE = os.environ.get('OPENCLAW_WORKSPACE', os.path.expanduser('~/.openclaw/workspace'))
MEMORY_DIR = Path(WORKSPACE) / 'memory'
QDRANT_URL = os.environ.get('QDRANT_URL', 'http://localhost:6333')
COLLECTION_NAME = os.environ.get('COLLECTION_NAME', 'memory_index')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen3:8b')

def generate_embedding(text):
    """使用 Ollama 生成 embedding"""
    try:
        result = subprocess.run(
            ['ollama', 'run', OLLAMA_MODEL, '--embedding', text],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            # Fallback: 使用 ollama API
            response = requests.post(
                'http://localhost:11434/api/embeddings',
                json={
                    'model': OLLAMA_MODEL,
                    'prompt': text
                },
                timeout=30
            )

            if response.status_code == 200:
                return response.json().get('embedding')
            else:
                print(f"⚠️  API 錯誤: {response.status_code}", file=sys.stderr)
                return None

        # 解析輸出（如果是 JSON）
        try:
            return json.loads(result.stdout)
        except:
            print(f"⚠️  無法解析 embedding 輸出", file=sys.stderr)
            return None

    except Exception as e:
        print(f"⚠️  生成 embedding 失敗: {e}", file=sys.stderr)
        return None

def extract_metadata(file_path):
    """提取檔案 metadata"""
    content = file_path.read_text(encoding='utf-8', errors='ignore')

    # 提取標題（第一行 # 開頭）
    title = None
    for line in content.split('\n'):
        if line.strip().startswith('#'):
            title = line.strip('# ').strip()
            break

    # 提取日期（從檔名或內容）
    date = None
    if file_path.stem.startswith('2026-'):
        try:
            date_str = file_path.stem[:10]  # YYYY-MM-DD
            date = datetime.strptime(date_str, '%Y-%m-%d').isoformat()
        except:
            pass

    # 計算 hash（用於去重）
    content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()

    return {
        'file_path': str(file_path.relative_to(WORKSPACE)),
        'file_name': file_path.name,
        'title': title or file_path.stem,
        'date': date,
        'size': len(content),
        'hash': content_hash,
        'last_modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
    }

def chunk_text(text, max_length=2000):
    """將長文本切分成小塊（每塊 ~2000 字元）"""
    chunks = []
    lines = text.split('\n')

    current_chunk = []
    current_length = 0

    for line in lines:
        line_length = len(line)

        if current_length + line_length > max_length and current_chunk:
            # 儲存當前 chunk
            chunks.append('\n'.join(current_chunk))
            current_chunk = [line]
            current_length = line_length
        else:
            current_chunk.append(line)
            current_length += line_length

    # 儲存最後一個 chunk
    if current_chunk:
        chunks.append('\n'.join(current_chunk))

    return chunks

def index_file(file_path, file_index):
    """為單個檔案建立索引"""
    try:
        # 讀取內容
        content = file_path.read_text(encoding='utf-8', errors='ignore')

        if len(content.strip()) == 0:
            print(f"⏭️  [{file_index}] 跳過空檔案: {file_path.name}")
            return 0

        # 提取 metadata
        metadata = extract_metadata(file_path)

        # 切分文本
        chunks = chunk_text(content, max_length=2000)

        print(f"📄 [{file_index}] {file_path.name} ({len(content)} 字元, {len(chunks)} chunks)")

        indexed_count = 0

        for chunk_idx, chunk in enumerate(chunks):
            # 生成 embedding
            # 注意：Ollama 的 embedding API 可能需要不同的調用方式
            # 這裡使用簡化版本，實際可能需要調整

            # 使用 HTTP API 而不是 CLI
            try:
                response = requests.post(
                    'http://localhost:11434/api/embeddings',
                    json={
                        'model': OLLAMA_MODEL,
                        'prompt': chunk[:1000]  # 限制長度
                    },
                    timeout=30
                )

                if response.status_code != 200:
                    print(f"  ⚠️  Chunk {chunk_idx+1} embedding 失敗: HTTP {response.status_code}")
                    continue

                embedding = response.json().get('embedding')

                if not embedding or len(embedding) != 4096:
                    print(f"  ⚠️  Chunk {chunk_idx+1} embedding 格式錯誤")
                    continue

            except Exception as e:
                print(f"  ⚠️  Chunk {chunk_idx+1} 處理失敗: {e}")
                continue

            # 建立 point ID（使用 hash + chunk_idx）
            point_id = hashlib.md5(f"{metadata['hash']}-{chunk_idx}".encode()).hexdigest()
            point_id_int = int(point_id[:8], 16)  # 轉成整數（Qdrant 需要）

            # 上傳到 Qdrant
            try:
                payload = {
                    **metadata,
                    'chunk_index': chunk_idx,
                    'chunk_total': len(chunks),
                    'content_preview': chunk[:200]  # 只存前 200 字元預覽
                }

                upload_response = requests.put(
                    f"{QDRANT_URL}/collections/{COLLECTION_NAME}/points",
                    json={
                        'points': [
                            {
                                'id': point_id_int,
                                'vector': embedding,
                                'payload': payload
                            }
                        ]
                    },
                    timeout=10
                )

                if upload_response.status_code == 200:
                    indexed_count += 1
                else:
                    print(f"  ⚠️  Chunk {chunk_idx+1} 上傳失敗: HTTP {upload_response.status_code}")

            except Exception as e:
                print(f"  ⚠️  Chunk {chunk_idx+1} 上傳失敗: {e}")
                continue

        print(f"  ✅ 成功索引 {indexed_count}/{len(chunks)} chunks")
        return indexed_count

    except Exception as e:
        print(f"  ❌ 處理失敗: {e}", file=sys.stderr)
        return 0

# ============================================
# 主程序
# ============================================

def main():
    # 掃描所有 .md 檔案
    md_files = sorted(MEMORY_DIR.glob('**/*.md'))

    if not md_files:
        print("⚠️  沒有找到記憶檔案")
        return

    total_files = len(md_files)
    total_indexed = 0

    print(f"開始索引 {total_files} 個檔案...\n")

    for idx, file_path in enumerate(md_files, 1):
        indexed = index_file(file_path, idx)
        total_indexed += indexed

        # 進度顯示
        progress = (idx / total_files) * 100
        print(f"  進度: {idx}/{total_files} ({progress:.1f}%)\n")

    print("")
    print("=" * 50)
    print(f"✅ 索引建立完成！")
    print(f"   總檔案數: {total_files}")
    print(f"   總 chunks: {total_indexed}")
    print("=" * 50)

if __name__ == '__main__':
    main()

PYTHON_SCRIPT

# ============================================
# Step 4: 驗證索引
# ============================================

echo ""
echo "🔍 驗證索引..."

POINT_COUNT=$(curl -s "$QDRANT_URL/collections/$COLLECTION_NAME" | python3 -c "import sys, json; print(json.load(sys.stdin)['result']['points_count'])" 2>/dev/null || echo "0")

echo "📊 索引統計："
echo "   Collection: $COLLECTION_NAME"
echo "   Points: $POINT_COUNT"

if [[ $POINT_COUNT -gt 0 ]]; then
    echo ""
    echo "✅ 向量索引建立成功！"
    echo ""
    echo "📝 下一步："
    echo "   1. 測試搜尋功能: ./scripts/smart-recall.py '關鍵字'"
    echo "   2. 整合到啟動流程: 修改 SOUL.md"
else
    echo ""
    echo "⚠️  索引建立失敗，請檢查日誌"
fi

echo ""
echo "🎉 完成！"
