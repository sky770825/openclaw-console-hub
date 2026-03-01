#!/usr/bin/env python3
"""
智能召回 v2 - 整合版
結合：向量搜尋 + 重排序 + 混合檢索 + 查詢擴展

使用方式：
./smart-recall-v2.py "查詢內容"
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from reranker import rerank_results
from hybrid_search import hybrid_search
from query_expansion import expand_query

import requests
from typing import List, Dict

QDRANT_URL = os.environ.get('QDRANT_URL', 'http://localhost:6333')
COLLECTION = os.environ.get('COLLECTION', 'memory_smart_chunks_v2')

def smart_recall_v2(query: str, final_limit: int = 5) -> List[Dict]:
    """
    智能召回 v2 主函數
    
    流程：
    1. 查詢擴展（生成 3-5 個相關查詢）
    2. 混合檢索（向量 + 關鍵詞，各取 Top 20）
    3. RRF 融合
    4. 重排序（Top 20 → Top 5）
    """
    print(f"🚀 智能召回 v2: {query}")
    print("=" * 60)
    
    # Step 1: 查詢擴展
    print("\n📚 Step 1: 查詢擴展")
    expanded_queries = expand_query(query, use_llm=False)  # 使用規則擴展更快
    print(f"   擴展: {expanded_queries}")
    
    # Step 2: 對每個擴展查詢執行混合檢索
    print("\n🔍 Step 2: 混合檢索")
    all_results = []
    
    for q in expanded_queries[:3]:  # 最多 3 個查詢
        results = hybrid_search(q, limit=20)
        for r in results:
            r['source_query'] = q
        all_results.extend(results)
    
    # Step 3: 去重
    print("\n🔄 Step 3: 去重")
    seen = set()
    unique_results = []
    for r in all_results:
        doc_id = r.get('payload', {}).get('file_path', r.get('id'))
        if doc_id and doc_id not in seen:
            seen.add(doc_id)
            unique_results.append(r)
    print(f"   合併: {len(all_results)} → {len(unique_results)} 個唯一結果")
    
    # Step 4: 重排序（取 Top 20 精排為 Top 5）
    print("\n🎯 Step 4: 重排序")
    top_candidates = unique_results[:20]
    reranked = rerank_results(query, top_candidates)
    
    return reranked[:final_limit]

def display_v2_results(results: List[Dict]):
    """顯示 v2 結果"""
    if not results:
        print("\n⚠️ 沒有找到相關結果")
        return
    
    print(f"\n📋 最終結果（Top {len(results)}）:")
    print("=" * 60)
    
    for idx, result in enumerate(results, 1):
        final_score = result.get('final_score', result.get('score', 0))
        payload = result.get('payload', {})
        
        title = payload.get('title', '未命名')
        file_path = payload.get('file_path', '')
        summary = payload.get('summary', '')
        keywords = payload.get('keywords', [])
        
        print(f"\n{idx}. {title}")
        print(f"   📊 分數: {final_score:.4f}")
        print(f"   📁 {file_path}")
        if summary:
            print(f"   📝 摘要: {summary}")
        if keywords:
            print(f"   🏷️  關鍵詞: {', '.join(keywords[:3])}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = ' '.join(sys.argv[1:])
    else:
        query = "成本優化方案"
    
    results = smart_recall_v2(query, final_limit=5)
    display_v2_results(results)
