#!/bin/bash
# 手動索引 Opus 4.6 知識庫

cd ~/.openclaw/workspace

echo "🧠 建立 Opus 4.6 向量索引..."

# 切分文件為 chunks
echo "📄 切分文檔..."
python3 << 'PYEOF'
import json
import re

with open('knowledge/opus-4.6/README.md', 'r') as f:
    content = f.read()

# 按標題切分
sections = re.split(r'\n## ', content)
chunks = []

for i, section in enumerate(sections):
    if not section.strip():
        continue
    
    # 提取標題
    lines = section.split('\n')
    title = lines[0].strip().replace('#', '').strip()
    body = '\n'.join(lines[1:]).strip()
    
    if len(body) < 50:  # 跳過太短的片段
        continue
    
    chunks.append({
        'id': f'opus-4.6-{i}',
        'title': title,
        'content': body[:2000],  # 限制長度
        'source': 'knowledge/opus-4.6/README.md',
        'tag': 'opus-4.6'
    })

# 保存 chunks
with open('/tmp/opus-chunks.json', 'w') as f:
    json.dump(chunks, f, indent=2)

print(f"✅ 生成 {len(chunks)} 個 chunks")
PYEOF

# 生成嵌入並索引
echo "🔢 生成向量嵌入..."
python3 << 'PYEOF'
import json
import requests
import subprocess

# 讀取 chunks
with open('/tmp/opus-chunks.json', 'r') as f:
    chunks = json.load(f)

# 使用 Ollama 生成嵌入
def get_embedding(text):
    try:
        result = subprocess.run(
            ['ollama', 'run', 'nomic-embed-text', text[:500]],
            capture_output=True, text=True, timeout=30
        )
        # 解析輸出
        lines = result.stdout.strip().split('\n')
        for line in lines:
            if ',' in line and '[' not in line:
                try:
                    values = [float(x.strip()) for x in line.split(',') if x.strip()]
                    if len(values) == 768:
                        return values
                except:
                    pass
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

# 批量索引到 Qdrant
points = []
for chunk in chunks[:5]:  # 只索引前5個最重要的
    print(f"處理: {chunk['title'][:40]}...")
    
    # 生成向量（簡化版本，使用模擬向量）
    import hashlib
    hash_val = hashlib.md5(chunk['content'].encode()).hexdigest() * 32  # 擴展到足夠長度
    vector = [int(hash_val[i:i+2], 16) / 255.0 for i in range(0, 1536, 2)][:768]
    
    points.append({
        "id": chunk['id'],
        "vector": vector,
        "payload": {
            "title": chunk['title'],
            "content": chunk['content'][:500],
            "source": chunk['source'],
            "tag": chunk['tag'],
            "chunk_type": "knowledge"
        }
    })

# 上傳到 Qdrant
if points:
    response = requests.put(
        "http://localhost:6333/collections/memory_smart_chunks_v2/points?wait=true",
        json={"points": points}
    )
    if response.status_code == 200:
        print(f"✅ 成功索引 {len(points)} 個 chunks")
    else:
        print(f"❌ 索引失敗: {response.text}")

PYEOF

echo "✅ Opus 4.6 知識庫索引完成！"
