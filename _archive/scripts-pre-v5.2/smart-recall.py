#!/usr/bin/env python3
"""
智能召回系統 (Smart Recall) v3
核心邏輯：
1. 查詢擴展 (LLM/Rule-based)
2. 混合檢索 (Vector + Keyword)
3. 多路召回融合 (RRF)
4. 精細重排序 (Reranker)
"""

import sys
import os
import json
import requests
import re
import subprocess
import concurrent.futures
from pathlib import Path
from typing import List, Dict, Any
from collections import defaultdict

# --- 配置 ---
WORKSPACE = os.environ.get('OPENCLAW_WORKSPACE', os.path.expanduser('~/.openclaw/workspace'))
QDRANT_URL = os.environ.get('QDRANT_URL', 'http://localhost:6333')
COLLECTION_NAME = os.environ.get('COLLECTION_NAME', 'memory_smart_chunks')
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')

# 模型選擇
EMBED_MODEL = "nomic-embed-text"
LLM_MODEL = "qwen3:4b"  # 使用較小的模型

# --- 1. 查詢擴展 ---
def expand_query(query: str, use_llm: bool = False) -> List[str]:
    """將原始查詢擴展為多個相關查詢"""
    queries = [query]
    
    # 基於規則的簡單擴展（避免 Ollama timeout 阻塞）
    synonyms = {
        '成本': ['費用', '預算'],
        '優化': ['改善', '提升'],
        '任務': ['工作', '進度'],
        '系統': ['架構', '配置'],
    }
    
    for word, syns in synonyms.items():
        if word in query:
            for syn in syns[:1]:
                queries.append(query.replace(word, syn))
                
    return list(dict.fromkeys(queries))[:3]

# --- 2. 檢索核心 ---
def get_embedding(text: str) -> List[float]:
    """獲取文本向量"""
    try:
        response = requests.post(f"{OLLAMA_URL}/api/embeddings",
                               json={"model": EMBED_MODEL, "prompt": text},
                               timeout=30)
        return response.json().get('embedding', [])
    except Exception:
        return []

def vector_search(query: str, limit: int = 20) -> List[Dict]:
    """Qdrant 向量搜尋"""
    vector = get_embedding(query)
    if not vector: return []
    
    try:
        response = requests.post(f"{QDRANT_URL}/collections/{COLLECTION_NAME}/points/search",
                               json={"vector": vector, "limit": limit, "with_payload": True},
                               timeout=5)
        return response.json().get('result', [])
    except Exception:
        return []

def keyword_search(query: str, limit: int = 20) -> List[Dict]:
    """基於 grep 的關鍵詞搜尋"""
    # 搜尋多個可能的目錄，包含根目錄
    search_dirs = [
        WORKSPACE, # 根目錄
        os.path.join(WORKSPACE, 'memory'),
        os.path.join(WORKSPACE, 'sop-知識庫'),
        os.path.join(WORKSPACE, 'projects')
    ]
    # 提取有意義的關鍵詞
    keywords = [w for w in re.findall(r'\w+', query) if len(w) >= 2]
    if not keywords: return []
    
    # 將查詢整體也加入關鍵詞
    phrase = query.strip()
    if phrase and phrase not in keywords:
        keywords.insert(0, phrase)
        
    pattern = '|'.join(keywords)
    results = []
    seen_files = set()
    
    # 排除清單
    exclude_patterns = ["*.js", "*.map", "*.css", "*.png", "*.jpg", "*.svg", ".json", "archive", "node_modules", "dist", ".git"]
    
    for memory_dir in search_dirs:
        if not os.path.exists(memory_dir): continue
        try:
            is_root = (memory_dir == WORKSPACE)
            
            if is_root:
                # 根目錄：只搜尋 .md 檔案，不遞迴
                grep_cmd = ["find", memory_dir, "-maxdepth", "1", "-name", "*.md", "-exec", "grep", "-iIl", pattern, "{}", "+"]
            else:
                # 子目錄：遞迴搜尋，排除特定檔案類型
                grep_cmd = ["grep", "-riIl"]
                for p in exclude_patterns:
                    if '*' in p:
                        grep_cmd.append(f"--exclude={p}")
                    else:
                        grep_cmd.append(f"--exclude-dir={p}")
                grep_cmd.extend([pattern, memory_dir])
            
            output = subprocess.run(grep_cmd, capture_output=True, text=True, timeout=5)
            files = output.stdout.strip().split('\n')
            
            for f in files:
                if not f or not os.path.exists(f): continue
                if os.path.isdir(f): continue
                
                rel_path = os.path.relpath(f, WORKSPACE)
                if rel_path in seen_files: continue
                seen_files.add(rel_path)
                
                # 優先權設定
                priority = 1.0
                if "memory/" in rel_path: priority = 1.5
                elif "sop-" in rel_path: priority = 1.3
                elif rel_path in ["AGENTS.md", "MEMORY.md", "README.md"]: priority = 2.0
                
                # 讀取內容預覽並計算命中分數
                content_preview = ""
                hit_score = 1
                try:
                    with open(f, 'r', encoding='utf-8', errors='ignore') as f_obj:
                        content = f_obj.read(2000)
                        content_preview = content[:200]
                        hit_score = sum(1 for kw in keywords if kw.lower() in content.lower())
                except:
                    pass
                
                results.append({
                    "id": f"kw_{os.path.basename(f)}",
                    "score": (0.5 + (hit_score * 0.1)) * priority, 
                    "payload": {
                        "file_path": rel_path,
                        "title": os.path.basename(f),
                        "content_preview": content_preview,
                        "search_type": "keyword",
                        "category": rel_path.split('/')[0] if '/' in rel_path else "root"
                    }
                })
        except Exception:
            continue
            
    # 按命中分數排序
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:limit]

# --- 3. 融合與排序 ---
def rrf_fusion(search_results_list: List[List[Dict]], k: int = 60) -> List[Dict]:
    """Reciprocal Rank Fusion (RRF)"""
    scores = defaultdict(float)
    payloads = {}
    
    for results in search_results_list:
        for rank, res in enumerate(results, 1):
            # 使用 file_path 作為唯一識別碼
            doc_id = res.get('payload', {}).get('file_path')
            if not doc_id: continue
            
            scores[doc_id] += 1.0 / (k + rank)
            if doc_id not in payloads or res.get('score', 0) > payloads[doc_id].get('_max_score', 0):
                payloads[doc_id] = res
                payloads[doc_id]['_max_score'] = res.get('score', 0)
                
    fused = []
    for doc_id, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        res = payloads[doc_id]
        res['rrf_score'] = score
        fused.append(res)
    return fused

def rerank(query: str, results: List[Dict], top_n: int = 5) -> List[Dict]:
    """重排序：計算查詢與內容預覽的向量相似度"""
    if not results: return []
    
    query_vec = get_embedding(query)
    if not query_vec: return results[:top_n]
    
    for res in results[:10]: # 只對前 10 個進行精排
        content = res.get('payload', {}).get('content_preview', '')
        if not content:
            content = res.get('payload', {}).get('title', '')
            
        doc_vec = get_embedding(content[:500])
        if doc_vec:
            # 餘弦相似度
            dot = sum(a*b for a,b in zip(query_vec, doc_vec))
            norm_q = sum(a*a for a in query_vec)**0.5
            norm_d = sum(a*a for a in doc_vec)**0.5
            res['rerank_score'] = dot / (norm_q * norm_d) if norm_q*norm_d > 0 else 0
        else:
            res['rerank_score'] = 0
            
    # 結合 RRF 分數和重排序分數
    for res in results[:10]:
        res['final_score'] = (res.get('rrf_score', 0) * 0.3) + (res.get('rerank_score', 0) * 0.7)
        
    return sorted(results[:10], key=lambda x: x.get('final_score', 0), reverse=True)[:top_n]

# --- 主接口 ---
def smart_recall(query: str, limit: int = 5) -> List[Dict]:
    """完整的智能召回流程"""
    # 1. 查詢擴展
    queries = expand_query(query)
    
    # 2. 多路並行檢索
    all_runs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        v_futures = [executor.submit(vector_search, q) for q in queries]
        k_futures = [executor.submit(keyword_search, q) for q in queries]
        
        for f in v_futures + k_futures:
            all_runs.append(f.result())
            
    # 3. RRF 融合
    fused = rrf_fusion(all_runs)
    
    # 4. 重排序
    final = rerank(query, fused, top_n=limit)
    
    return final

def display_results(results: List[Dict]):
    if not results:
        print("⚠️ 未找到相關內容。")
        return
        
    print(f"\n✨ 智能召回結果 ({len(results)}):")
    print("-" * 60)
    for i, res in enumerate(results, 1):
        p = res.get('payload', {})
        score = res.get('final_score', res.get('rrf_score', 0))
        print(f"{i}. [{p.get('category', 'N/A')}] {p.get('title', 'Unknown')}")
        print(f"   路徑: {p.get('file_path')}")
        print(f"   得分: {score:.4f}")
        preview = p.get('content_preview', '')
        if preview:
            print(f"   內容: {preview[:120]}...")
        print("-" * 60)

if __name__ == "__main__":
    test_query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "目前的成本優化進度"
    print(f"🔍 啟動智能召回: {test_query}")
    results = smart_recall(test_query)
    display_results(results)
