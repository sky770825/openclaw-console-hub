#!/usr/bin/env python3
"""
查詢擴展模組 (Query Expansion)
使用本地 Ollama LLM 生成相關查詢，提升召回率

功能：
1. 同義詞擴展
2. 相關概念推薦
3. 多查詢並行搜尋
"""

import sys
import os
import json
import requests
import concurrent.futures
from typing import List, Dict

# 配置
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
EXPANSION_MODEL = os.environ.get('EXPANSION_MODEL', 'qwen3:8b')  # 或使用 llama3.2


def expand_query_llm(query: str, num_expansions: int = 3) -> List[str]:
    """
    使用本地 LLM 生成相關查詢
    
    Args:
        query: 原始查詢
        num_expansions: 要生成的擴展查詢數量
    
    Returns:
        擴展後的查詢列表（包含原始查詢）
    """
    prompt = f"""你是一個查詢擴展助手。請為以下查詢生成 {num_expansions} 個相關的同義或延伸查詢。

原始查詢: "{query}"

要求：
1. 生成的查詢應該與原始查詢語義相關
2. 可以使用同義詞、相關概念、不同表達方式
3. 每個查詢不超過 20 個字
4. 直接輸出查詢，不要解釋

格式：每行一個查詢
"""
    
    try:
        print(f"🤖 使用 LLM 擴展查詢: {query}")
        
        response = requests.post(
            f'{OLLAMA_URL}/api/generate',
            json={
                'model': EXPANSION_MODEL,
                'prompt': prompt,
                'stream': False,
                'options': {'temperature': 0.7, 'num_predict': 200}
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json().get('response', '')
            
            # 解析生成的查詢
            expansions = [line.strip().strip('"').strip("'") 
                         for line in result.split('\n') 
                         if line.strip() and len(line.strip()) > 2]
            
            # 過濾掉解釋性文字
            expansions = [e for e in expansions 
                         if not any(x in e.lower() for x in ['生成', '查詢', '以下是', '要求'])]
            
            # 加入原始查詢並去重
            all_queries = [query] + expansions[:num_expansions]
            all_queries = list(dict.fromkeys(all_queries))  # 保留順序去重
            
            print(f"  ✅ 擴展完成，共 {len(all_queries)} 個查詢")
            for i, q in enumerate(all_queries, 1):
                print(f"    {i}. {q}")
            
            return all_queries
        else:
            print(f"  ⚠️ LLM API 錯誤: {response.status_code}")
            return [query]
    
    except Exception as e:
        print(f"  ⚠️ 查詢擴展失敗: {e}")
        return [query]


def expand_query_rules(query: str) -> List[str]:
    """
    基於規則的查詢擴展（備用方案，無需 LLM）
    使用同義詞詞典和簡單替換
    """
    # 同義詞詞典
    synonyms = {
        '成本': ['費用', '開支', '花費', '預算', '價格'],
        '優化': ['改善', '提升', '改進', '精進', '增強'],
        '記憶': ['回憶', '記錄', '儲存', '回顧'],
        '任務': ['工作', '作業', '項目', '使命'],
        '系統': ['平台', '架構', '框架', '機制'],
        '自動': ['自動化', '自主', '智能', '自動執行'],
        '通知': ['提醒', '警示', '訊息', '推送'],
        '修復': ['修復', '修正', '修補', '解決', '排除'],
        '備份': ['備份', '備份', '存檔', '儲存'],
        '索引': ['目錄', '索引', '檢索', '搜索'],
    }
    
    expansions = [query]  # 原始查詢
    
    # 為每個關鍵詞找同義詞
    for word, syns in synonyms.items():
        if word in query:
            for syn in syns[:2]:  # 只取前 2 個同義詞
                new_query = query.replace(word, syn)
                if new_query != query:
                    expansions.append(new_query)
    
    # 去重並限制數量
    expansions = list(dict.fromkeys(expansions))[:5]
    
    if len(expansions) > 1:
        print(f"  ✅ 規則擴展完成，共 {len(expansions)} 個查詢")
    
    return expansions


def expand_query(query: str, use_llm: bool = True, num_expansions: int = 3) -> List[str]:
    """
    查詢擴展主函數
    
    優先使用 LLM，失敗時回退到規則擴展
    """
    if use_llm:
        expansions = expand_query_llm(query, num_expansions)
        if len(expansions) > 1:
            return expansions
    
    # 回退到規則擴展
    print("🔄 使用規則擴展...")
    return expand_query_rules(query)


def multi_query_search(query: str, search_func, max_workers: int = 3) -> List[Dict]:
    """
    多查詢並行搜尋
    
    Args:
        query: 原始查詢
        search_func: 搜尋函數（接收 query 返回結果列表）
        max_workers: 並行執行緒數
    
    Returns:
        合併後的搜尋結果
    """
    # 獲取擴展查詢
    queries = expand_query(query, use_llm=True, num_expansions=3)
    
    print(f"\n🔍 並行搜尋 {len(queries)} 個查詢...")
    
    all_results = []
    
    # 並行執行搜尋
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_query = {executor.submit(search_func, q): q for q in queries}
        
        for future in concurrent.futures.as_completed(future_to_query):
            q = future_to_query[future]
            try:
                results = future.result()
                # 標記每個結果來自哪個查詢
                for r in results:
                    r['source_query'] = q
                all_results.extend(results)
                print(f"  ✅ '{q}' 找到 {len(results)} 個結果")
            except Exception as e:
                print(f"  ❌ '{q}' 搜尋失敗: {e}")
    
    # 去重（根據文件路徑）
    seen = set()
    unique_results = []
    for r in all_results:
        doc_id = r.get('payload', {}).get('file_path', r.get('id'))
        if doc_id and doc_id not in seen:
            seen.add(doc_id)
            unique_results.append(r)
    
    print(f"\n📊 合併結果：{len(all_results)} → {len(unique_results)} 個唯一結果")
    
    return unique_results


def rerank_by_query_relevance(results: List[Dict], original_query: str) -> List[Dict]:
    """
    根據與原始查詢的相關性重新排序
    考慮來源查詢與原始查詢的相似度
    """
    # 這裡可以加入更複雜的重排序邏輯
    # 簡單起見，按原始分數排序
    return sorted(results, key=lambda x: x.get('score', 0), reverse=True)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = ' '.join(sys.argv[1:])
    else:
        query = "成本優化方案"
    
    print(f"🚀 查詢擴展示例")
    print("=" * 60)
    
    # 測試擴展
    expansions = expand_query(query, use_llm=True)
    print(f"\n原始查詢: {query}")
    print(f"擴展查詢: {expansions}")
