#!/usr/bin/env bash
# 召回準確率測試
# 測試 10 個常見查詢，評估智能切塊的效果

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"

echo "🧪 召回準確率測試"
echo "============================================================"
echo "測試方法：10 個常見查詢 × 2 個索引（舊版 vs 新版）"
echo ""

# 測試查詢清單（涵蓋不同主題）
QUERIES=(
    "Ollama 監控"
    "成本優化"
    "n8n 設定"
    "向量資料庫"
    "Codex 5.3"
    "記憶系統"
    "任務卡"
    "錯誤記錄"
    "自動更新"
    "Docker 服務"
)

echo "📝 測試查詢："
for i in "${!QUERIES[@]}"; do
    echo "   $((i+1)). ${QUERIES[$i]}"
done
echo ""

# Python 測試腳本
python3 - <<'PYTHON'
import os
import sys
import requests
from typing import List, Dict

QDRANT_URL = 'http://localhost:6333'
OLLAMA_URL = 'http://localhost:11434'

QUERIES = [
    "Ollama 監控",
    "成本優化",
    "n8n 設定",
    "向量資料庫",
    "Codex 5.3",
    "記憶系統",
    "任務卡",
    "錯誤記錄",
    "自動更新",
    "Docker 服務"
]

def generate_embedding(text: str) -> List[float]:
    """生成查詢 embedding"""
    try:
        response = requests.post(
            f'{OLLAMA_URL}/api/embeddings',
            json={
                'model': 'nomic-embed-text',
                'prompt': text
            },
            timeout=30
        )

        if response.status_code == 200:
            return response.json().get('embedding')
    except Exception as e:
        print(f"⚠️  Embedding 生成失敗: {e}")

    return None

def search_collection(collection: str, query_vector: List[float], limit: int = 3) -> List[Dict]:
    """搜尋指定 collection"""
    try:
        response = requests.post(
            f'{QDRANT_URL}/collections/{collection}/points/search',
            json={
                'vector': query_vector,
                'limit': limit,
                'with_payload': True
            },
            timeout=10
        )

        if response.status_code == 200:
            return response.json().get('result', [])
    except Exception as e:
        print(f"⚠️  搜尋失敗: {e}")

    return []

def evaluate_results(results: List[Dict], query: str) -> Dict:
    """評估搜尋結果質量"""
    if not results:
        return {
            'final_score': 0,
            'similarity': 0,
            'metadata': False,
            'section': 'N/A',
            'preview': ''
        }

    top_result = results[0]
    score = top_result.get('score', 0)
    payload = top_result.get('payload', {})

    # 質量評估標準
    quality = {
        'score': score,
        'has_metadata': bool(payload.get('title') and payload.get('category')),
        'has_section': bool(payload.get('section_title')),
        'preview': payload.get('content_preview', '')[:100]
    }

    # 綜合評分（0-100）
    final_score = 0

    # 相似度分數（60%）
    final_score += score * 60

    # 元資料完整性（20%）
    if quality['has_metadata']:
        final_score += 20

    # 結構化資訊（20%）
    if quality['has_section']:
        final_score += 20

    return {
        'final_score': round(final_score, 1),
        'similarity': round(score, 3),
        'metadata': quality['has_metadata'],
        'section': payload.get('section_title', 'N/A'),
        'preview': quality['preview']
    }

# 主測試
print("=" * 60)
print("開始測試...")
print("")

old_collection = 'memory_chunks'
new_collection = 'memory_smart_chunks'

total_old_score = 0
total_new_score = 0
test_count = 0

for idx, query in enumerate(QUERIES, 1):
    print(f"[{idx}/{len(QUERIES)}] 測試查詢: {query}")

    # 生成 embedding
    query_vector = generate_embedding(query)

    if not query_vector:
        print("   ⚠️  跳過（embedding 失敗）\n")
        continue

    # 搜尋舊版
    old_results = search_collection(old_collection, query_vector, 3)
    old_eval = evaluate_results(old_results, query)

    # 搜尋新版
    new_results = search_collection(new_collection, query_vector, 3)
    new_eval = evaluate_results(new_results, query)

    # 顯示結果
    print(f"   舊版: {old_eval['final_score']}/100 (相似度: {old_eval['similarity']})")
    print(f"   新版: {new_eval['final_score']}/100 (相似度: {new_eval['similarity']})")

    if new_eval['section'] != 'N/A':
        print(f"   段落: {new_eval['section']}")

    improvement = new_eval['final_score'] - old_eval['final_score']
    if improvement > 0:
        print(f"   📈 提升: +{improvement:.1f}")
    elif improvement < 0:
        print(f"   📉 下降: {improvement:.1f}")
    else:
        print(f"   ➡️  持平")

    print("")

    total_old_score += old_eval['final_score']
    total_new_score += new_eval['final_score']
    test_count += 1

# 統計結果
print("=" * 60)
print("📊 測試結果統計")
print("")

if test_count > 0:
    avg_old = total_old_score / test_count
    avg_new = total_new_score / test_count
    improvement = avg_new - avg_old
    improvement_pct = (improvement / avg_old * 100) if avg_old > 0 else 0

    print(f"舊版平均分數: {avg_old:.1f}/100")
    print(f"新版平均分數: {avg_new:.1f}/100")
    print(f"提升幅度: +{improvement:.1f} ({improvement_pct:+.1f}%)")
    print("")

    # 評級
    if avg_new >= 85:
        print("✅ 達標！（目標: 85+）")
    elif avg_new >= 75:
        print("🟡 接近達標（差距: {:.1f}）".format(85 - avg_new))
    else:
        print("🔴 未達標（需再優化）")
else:
    print("⚠️  無有效測試")

print("=" * 60)

PYTHON

echo ""
echo "測試完成"
