#!/usr/bin/env python3
"""
混合檢索模組 (Hybrid Search)
結合向量搜尋 + 關鍵詞搜尋，使用 RRF 融合

RRF 公式：score = Σ 1/(k + rank)
預設 k = 60（標準值）
"""

import sys
import os
import re
import subprocess
import requests
from typing import List, Dict, Tuple
from collections import defaultdict

# 配置
WORKSPACE = os.environ.get('OPENCLAW_WORKSPACE', os.path.expanduser('~/.openclaw/workspace'))
QDRANT_URL = os.environ.get('QDRANT_URL', 'http://localhost:6333')
COLLECTION_NAME = os.environ.get('COLLECTION_NAME', 'memory_smart_chunks')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'nomic-embed-text')

def generate_query_embedding(query_text: str) -> List[float]:
    """生成查詢向量"""
    try:
        response = requests.post(
            'http://localhost:11434/api/embeddings',
            json={'model': OLLAMA_MODEL, 'prompt': query_text},
            timeout=30
        )
        if response.status_code == 200:
            return response.json().get('embedding', [])
        return []
    except Exception as e:
        print(f"❌ Embedding 失敗: {e}", file=sys.stderr)
        return []

def vector_search(query: str, limit: int = 20) -> List[Dict]:
    """向量搜尋 - 使用 Qdrant"""
    print(f"🔍 向量搜尋: {query}")
    
    query_vector = generate_query_embedding(query)
    if not query_vector:
        return []
    
    try:
        response = requests.post(
            f"{QDRANT_URL}/collections/{COLLECTION_NAME}/points/search",
            json={'vector': query_vector, 'limit': limit, 'with_payload': True},
            timeout=10
        )
        
        if response.status_code == 200:
            results = response.json().get('result', [])
            print(f"  ✅ 找到 {len(results)} 個向量結果")
            return results
        return []
    except Exception as e:
        print(f"❌ 向量搜尋失敗: {e}", file=sys.stderr)
        return []

def keyword_search(query: str, limit: int = 20) -> List[Dict]:
    """
    關鍵詞搜尋 - 使用 grep + 自訂評分
    實作簡化版 BM25 邏輯
    """
    print(f"🔍 關鍵詞搜尋: {query}")
    
    memory_dir = os.path.join(WORKSPACE, 'memory')
    
    # 提取關鍵詞（移除停用詞）
    stopwords = {'的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '個', '上', '也', '很', '到', '說', '要', '去', '你', '會', '著', '沒有', '看', '好', '自己', '這', '那'}
    keywords = [w for w in re.findall(r'\w+', query) if w not in stopwords and len(w) >= 2]
    
    if not keywords:
        keywords = [query]
    
    print(f"  📝 提取關鍵詞: {keywords}")
    
    # 使用 grep 搜尋
    results = []
    try:
        # 建構 grep 命令
        grep_pattern = '|'.join(keywords)
        cmd = ['grep', '-ri', '-l', grep_pattern, memory_dir]
        
        output = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        files = output.stdout.strip().split('\n')[:limit]
        
        for rank, file_path in enumerate(files, 1):
            if file_path and os.path.exists(file_path):
                # 讀取文件內容計算分數
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()[:1000]  # 限制長度
                    
                    # 計算關鍵詞匹配次數
                    score = sum(content.lower().count(kw.lower()) for kw in keywords)
                    
                    results.append({
                        'id': f"file_{rank}",
                        'score': score,
                        'rank': rank,
                        'payload': {
                            'file_path': file_path,
                            'title': os.path.basename(file_path),
                            'content': content[:300],
                            'search_type': 'keyword'
                        }
                    })
                except:
                    continue
        
        print(f"  ✅ 找到 {len(results)} 個關鍵詞結果")
        return results
    except Exception as e:
        print(f"⚠️ 關鍵詞搜尋失敗: {e}", file=sys.stderr)
        return []

def rrf_fusion(vector_results: List[Dict], keyword_results: List[Dict], k: int = 60) -> List[Dict]:
    """
    RRF (Reciprocal Rank Fusion) 融合演算法
    
    公式: score = Σ 1/(k + rank)
    k 通常設為 60
    """
    print(f"🔄 RRF 融合 (k={k})...")
    
    # 建立分數字典
    scores = defaultdict(float)
    result_map = {}
    
    # 向量結果貢獻分數
    for rank, result in enumerate(vector_results, 1):
        doc_id = result.get('payload', {}).get('file_path', result.get('id'))
        scores[doc_id] += 1.0 / (k + rank)
        result_map[doc_id] = result
    
    # 關鍵詞結果貢獻分數
    for rank, result in enumerate(keyword_results, 1):
        doc_id = result.get('payload', {}).get('file_path', result.get('id'))
        scores[doc_id] += 1.0 / (k + rank)
        if doc_id not in result_map:
            result_map[doc_id] = result
    
    # 按 RRF 分數排序
    fused_results = []
    for doc_id, rrf_score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        result = result_map[doc_id].copy()
        result['rrf_score'] = rrf_score
        result['final_score'] = rrf_score
        fused_results.append(result)
    
    print(f"  ✅ 融合完成，共 {len(fused_results)} 個結果")
    return fused_results

def hybrid_search(query: str, limit: int = 10) -> List[Dict]:
    """
    混合搜尋主函數
    
    流程:
    1. 並行執行向量搜尋 + 關鍵詞搜尋（各取 Top 20）
    2. 使用 RRF 融合結果
    3. 返回 Top N
    """
    print(f"\n🚀 混合搜尋: {query}")
    print("=" * 60)
    
    # 步驟 1: 雙路搜尋（各取 Top 20）
    vector_results = vector_search(query, limit=20)
    keyword_results = keyword_search(query, limit=20)
    
    # 步驟 2: RRF 融合
    fused_results = rrf_fusion(vector_results, keyword_results, k=60)
    
    # 步驟 3: 返回 Top N
    return fused_results[:limit]

def display_hybrid_results(results: List[Dict]):
    """顯示混合搜尋結果"""
    if not results:
        print("\n⚠️ 沒有找到相關結果")
        return
    
    print(f"\n📋 混合搜尋結果（Top {len(results)}）:")
    print("=" * 60)
    
    for idx, result in enumerate(results, 1):
        rrf_score = result.get('rrf_score', 0)
        payload = result.get('payload', {})
        
        title = payload.get('title', '未命名')
        file_path = payload.get('file_path', '')
        content = payload.get('content', '')[:150]
        search_type = payload.get('search_type', 'vector')
        
        print(f"\n{idx}. {title}")
        print(f"   📊 RRF 分數: {rrf_score:.4f}")
        print(f"   🔍 來源: {search_type}")
        print(f"   📁 {file_path}")
        print(f"   📝 {content}...")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = ' '.join(sys.argv[1:])
    else:
        query = "成本優化方案"
    
    results = hybrid_search(query, limit=10)
    display_hybrid_results(results)
