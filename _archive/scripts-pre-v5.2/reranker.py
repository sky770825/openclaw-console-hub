#!/usr/bin/env python3
"""
重排序模組 (Reranker) - 本地免費版
使用 nomic-embed-text 做二次相似度計算

功能：
1. 對初步檢索結果進行精細重排序
2. 使用「點積重排序」演算法
3. 無需額外模型，$0 成本
"""

import sys
import os
import requests
from typing import List, Dict, Tuple

# 配置
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_RERANK_MODEL', 'nomic-embed-text')


def get_embedding(text: str) -> List[float]:
    """使用 Ollama 獲取文本 embedding"""
    try:
        response = requests.post(
            f'{OLLAMA_URL}/api/embeddings',
            json={'model': OLLAMA_MODEL, 'prompt': text},
            timeout=30
        )
        if response.status_code == 200:
            return response.json().get('embedding', [])
        return []
    except Exception as e:
        print(f"❌ Embedding 失敗: {e}", file=sys.stderr)
        return []


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """計算兩個向量的餘弦相似度"""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    return dot_product / (magnitude1 * magnitude2)


def dot_product_similarity(vec1: List[float], vec2: List[float]) -> float:
    """計算點積相似度（更快，無需開方）"""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    return sum(a * b for a, b in zip(vec1, vec2))


def rerank_results(query: str, results: List[Dict], method: str = "cosine") -> List[Dict]:
    """
    對檢索結果進行重排序
    
    Args:
        query: 查詢文本
        results: 初步檢索結果（來自 Qdrant）
        method: "cosine" 或 "dot"
    
    Returns:
        重排序後的結果（包含新的 similarity_score）
    """
    if not results:
        return []
    
    print(f"🔄 重排序 {len(results)} 個結果...")
    
    # 獲取查詢的 embedding
    query_embedding = get_embedding(query)
    if not query_embedding:
        print("⚠️ 無法獲取查詢 embedding，返回原始排序")
        return results
    
    # 為每個結果計算精確相似度
    reranked = []
    for idx, result in enumerate(results):
        payload = result.get('payload', {})
        
        # 優先使用已儲存的 embedding（如果有的話）
        stored_embedding = payload.get('embedding')
        
        if stored_embedding and len(stored_embedding) == len(query_embedding):
            # 使用已儲存的 embedding
            if method == "cosine":
                score = cosine_similarity(query_embedding, stored_embedding)
            else:
                score = dot_product_similarity(query_embedding, stored_embedding)
        else:
            # 即時計算 embedding（較慢）
            content = payload.get('content', '')
            if len(content) > 500:
                content = content[:500]  # 限制長度以加速
            
            result_embedding = get_embedding(content)
            if result_embedding:
                if method == "cosine":
                    score = cosine_similarity(query_embedding, result_embedding)
                else:
                    score = dot_product_similarity(query_embedding, result_embedding)
            else:
                # 回退到原始分數
                score = result.get('score', 0)
        
        # 合併結果
        new_result = result.copy()
        new_result['original_score'] = result.get('score', 0)
        new_result['rerank_score'] = score
        # 最終分數 = 0.3 * 原始分數 + 0.7 * 重排序分數
        new_result['final_score'] = 0.3 * result.get('score', 0) + 0.7 * score
        reranked.append(new_result)
        
        if (idx + 1) % 5 == 0:
            print(f"  已處理 {idx + 1}/{len(results)}...")
    
    # 按最終分數排序
    reranked.sort(key=lambda x: x['final_score'], reverse=True)
    
    print(f"✅ 重排序完成")
    return reranked


def rerank_with_cross_encoder(query: str, results: List[Dict]) -> List[Dict]:
    """
    使用交叉編碼器（Cross-Encoder）風格的重排序
    更精確但更慢，適合 Top 10 精排
    """
    if not results:
        return []
    
    print(f"🔄 交叉編碼器重排序 {len(results)} 個結果...")
    
    reranked = []
    for result in results:
        payload = result.get('payload', {})
        content = payload.get('content', '')
        title = payload.get('title', '')
        
        # 構造「查詢+文檔」組合文本
        combined_query = f"查詢: {query} 相關內容: {title} {content[:200]}"
        
        # 獲取組合文本的 embedding
        combined_embedding = get_embedding(combined_query)
        
        # 獲取查詢單獨的 embedding
        query_embedding = get_embedding(query)
        
        if combined_embedding and query_embedding:
            # 交叉相似度 = 組合文本 vs 查詢的相似度
            cross_score = cosine_similarity(combined_embedding, query_embedding)
        else:
            cross_score = result.get('score', 0)
        
        new_result = result.copy()
        new_result['cross_score'] = cross_score
        new_result['final_score'] = 0.5 * result.get('score', 0) + 0.5 * cross_score
        reranked.append(new_result)
    
    reranked.sort(key=lambda x: x['final_score'], reverse=True)
    return reranked


if __name__ == "__main__":
    # 測試用例
    test_results = [
        {
            'id': 1,
            'score': 0.85,
            'payload': {
                'title': '成本優化方案',
                'content': '這是一份關於成本優化的詳細報告...'
            }
        },
        {
            'id': 2,
            'score': 0.82,
            'payload': {
                'title': 'Codex 使用指南',
                'content': 'Codex 是一個強大的程式開發助手...'
            }
        }
    ]
    
    reranked = rerank_results("如何節省開支", test_results)
    for r in reranked:
        print(f"{r['payload']['title']}: {r['final_score']:.3f}")
