#!/usr/bin/env python3
"""
高含量索引重建器 (Enhanced Indexer v2)
功能：
1. 智能切塊（保留原有）
2. 自動生成 100 字摘要
3. TF-IDF 關鍵詞提取
4. 向量去重（相似度 > 0.95 合併）
5. 增強元資料
"""

import os
import sys
import json
import hashlib
import requests
import re
import math
from pathlib import Path
from typing import List, Dict, Tuple, Set
from collections import Counter, defaultdict

# 配置
WORKSPACE = Path(os.path.expanduser('~/.openclaw/workspace'))
MEMORY_DIR = WORKSPACE / 'memory'
QDRANT_URL = 'http://localhost:6333'
COLLECTION = 'memory_smart_chunks_v2'  # 新版本 collection

def generate_summary(text: str, max_length: int = 100) -> str:
    """
    生成文本摘要（提取式）
    
    策略：
    1. 取前幾句有意義的句子
    2. 優先選包含關鍵詞的句子
    """
    # 清理文本
    clean_text = re.sub(r'[#*`\[\]()]', ' ', text)
    
    # 按句號、問號、驚嘆號分句
    sentences = re.split(r'[。！？\n]+', clean_text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    
    if not sentences:
        return text[:max_length] + "..." if len(text) > max_length else text
    
    # 提取關鍵詞
    keywords = extract_keywords(text, top_n=10)
    keyword_set = set(keywords)
    
    # 為每個句子打分（含關鍵詞越多分數越高）
    scored_sentences = []
    for sent in sentences[:5]:  # 只看前 5 句
        score = sum(1 for kw in keyword_set if kw in sent)
        scored_sentences.append((sent, score))
    
    # 按分數排序
    scored_sentences.sort(key=lambda x: x[1], reverse=True)
    
    # 組合摘要
    summary = ""
    for sent, _ in scored_sentences:
        if len(summary) + len(sent) < max_length:
            summary += sent + "。"
        else:
            break
    
    return summary if summary else sentences[0][:max_length]


def extract_keywords_tfidf(text: str, top_n: int = 5) -> List[str]:
    """
    TF-IDF 關鍵詞提取（簡化版）
    
    使用整個語料庫計算 IDF
    """
    # 清理和分詞
    clean_text = re.sub(r'[^\w\s]', ' ', text.lower())
    words = clean_text.split()
    
    # 停用詞
    stopwords = {'the', 'is', 'and', 'or', 'to', 'a', 'an', 'of', 'in', 'for', 
                 'on', 'with', 'at', 'by', '的', '是', '在', '和', '了', '有',
                 '我', '你', '他', '她', '它', '們', '這', '那', '個', '們'}
    
    words = [w for w in words if len(w) > 1 and w not in stopwords]
    
    # 計算 TF
    word_counts = Counter(words)
    total_words = len(words)
    
    tf_scores = {word: count / total_words for word, count in word_counts.items()}
    
    # 簡化 IDF（假設語料庫均勻分布）
    # 實際應該遍歷所有文件計算，這裡用啟發式
    idf_scores = {}
    for word in tf_scores:
        # 常見詞 IDF 低，罕見詞 IDF 高
        freq = word_counts[word]
        idf_scores[word] = math.log(1 + total_words / freq)
    
    # 計算 TF-IDF
    tfidf_scores = {word: tf_scores[word] * idf_scores[word] for word in tf_scores}
    
    # 取 Top N
    top_keywords = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)
    return [word for word, score in top_keywords[:top_n]]


def extract_keywords(text: str, top_n: int = 5) -> List[str]:
    """提取關鍵詞（簡化版詞頻）"""
    clean_text = re.sub(r'[#*`\[\]()]', ' ', text)
    words = clean_text.split()
    
    stopwords = {'的', '是', '在', '了', '有', '和', '與', '或', '等', '但', 
                 'the', 'is', 'and', 'or', 'to', 'a', 'an'}
    words = [w for w in words if len(w) > 1 and w.lower() not in stopwords]
    
    word_freq = Counter(words)
    return [word for word, freq in word_freq.most_common(top_n)]


def calculate_similarity(vec1: List[float], vec2: List[float]) -> float:
    """計算餘弦相似度"""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    return dot_product / (magnitude1 * magnitude2)


def deduplicate_chunks(chunks_data: List[Dict], threshold: float = 0.95) -> List[Dict]:
    """
    去重：相似度 > threshold 的 chunks 合併
    
    策略：貪婪算法，保留第一個，後續相似的丟棄
    """
    if not chunks_data:
        return []
    
    print(f"🔄 去重處理 {len(chunks_data)} 個 chunks...")
    
    unique_chunks = []
    embeddings = []  # 儲存已保留的 embedding
    
    for chunk in chunks_data:
        embedding = chunk.get('embedding')
        if not embedding:
            continue
        
        # 檢查是否與已保留的相似
        is_duplicate = False
        for existing_emb in embeddings:
            sim = calculate_similarity(embedding, existing_emb)
            if sim > threshold:
                is_duplicate = True
                break
        
        if not is_duplicate:
            unique_chunks.append(chunk)
            embeddings.append(embedding)
    
    removed = len(chunks_data) - len(unique_chunks)
    print(f"  ✅ 去重完成：{len(chunks_data)} → {len(unique_chunks)} (移除 {removed} 個重複)")
    
    return unique_chunks


def smart_chunk_text(text: str) -> List[Dict]:
    """智能切塊（與原版相同）"""
    chunks = []
    paragraphs = text.split('\n\n')
    
    current_chunk = {'text': '', 'section_title': None, 'start_pos': 0}
    current_pos = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            current_pos += 2
            continue
        
        is_heading = para.startswith('#')
        
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
        
        if is_heading and not current_chunk['section_title']:
            current_chunk['section_title'] = para.strip('#').strip()
        
        current_chunk['text'] += para + '\n\n'
        
        if len(current_chunk['text']) > 3000:
            chunks.append({
                'text': current_chunk['text'].strip(),
                'section_title': current_chunk['section_title'],
                'start': current_chunk['start_pos'],
                'end': current_pos + len(para) + 2
            })
            current_chunk = {
                'text': '',
                'section_title': current_chunk['section_title'],
                'start_pos': current_pos + len(para) + 2
            }
        
        current_pos += len(para) + 2
    
    if current_chunk['text'].strip():
        chunks.append({
            'text': current_chunk['text'].strip(),
            'section_title': current_chunk['section_title'],
            'start': current_chunk['start_pos'],
            'end': current_pos
        })
    
    return chunks


def extract_metadata(file_path: Path, content: str) -> Dict:
    """提取檔案元資料"""
    title = None
    for line in content.split('\n')[:10]:
        if line.strip().startswith('#'):
            title = line.strip('#').strip()
            break
    
    filename = file_path.stem
    date = None
    for pattern in [r'(\d{4}-\d{2}-\d{2})', r'(\d{8})']:
        match = re.search(pattern, filename)
        if match:
            date_str = match.group(1)
            date = date_str if len(date_str) == 10 else f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
            break
    
    category = 'general'
    path_str = str(file_path).lower()
    if 'autopilot' in path_str:
        category = 'autopilot'
    elif 'learning' in path_str:
        category = 'learning'
    elif 'checkpoint' in path_str:
        category = 'checkpoint'
    
    return {
        'title': title or filename,
        'date': date,
        'category': category,
        'file_name': file_path.name,
        'file_path': str(file_path.relative_to(WORKSPACE))
    }


def index_file_enhanced(file_path: Path, file_index: int, total_files: int) -> Tuple[int, List[Dict]]:
    """增強索引單個檔案"""
    try:
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        
        if len(content.strip()) == 0:
            return 0, []
        
        metadata = extract_metadata(file_path, content)
        chunks = smart_chunk_text(content)
        
        if not chunks:
            return 0, []
        
        print(f"[{file_index}/{total_files}] {file_path.name} ({len(chunks)} chunks)")
        
        # 處理所有 chunks
        chunk_data_list = []
        
        for chunk_idx, chunk_data in enumerate(chunks):
            try:
                # 生成 embedding
                response = requests.post(
                    'http://localhost:11434/api/embeddings',
                    json={'model': 'nomic-embed-text', 'prompt': chunk_data['text']},
                    timeout=30
                )
                
                if response.status_code != 200:
                    continue
                
                embedding = response.json().get('embedding')
                if not embedding or len(embedding) != 768:
                    continue
                
                # 生成摘要和關鍵詞
                summary = generate_summary(chunk_data['text'], max_length=100)
                keywords = extract_keywords_tfidf(chunk_data['text'], top_n=5)
                
                chunk_data_list.append({
                    'embedding': embedding,
                    'metadata': {
                        **metadata,
                        'chunk_index': chunk_idx,
                        'chunk_total': len(chunks),
                        'section_title': chunk_data.get('section_title'),
                        'summary': summary,
                        'keywords': keywords,
                        'content_preview': chunk_data['text'][:200],
                        'size': len(chunk_data['text'])
                    }
                })
                
            except Exception as e:
                continue
        
        # 去重
        unique_chunks = deduplicate_chunks(chunk_data_list, threshold=0.95)
        
        return len(unique_chunks), unique_chunks
        
    except Exception as e:
        print(f"[{file_index}/{total_files}] {file_path.name} - ❌ {str(e)[:30]}")
        return 0, []


def create_collection():
    """建立 Qdrant collection"""
    print(f"📦 建立 collection: {COLLECTION}")
    
    # 刪除舊 collection
    requests.delete(f"{QDRANT_URL}/collections/{COLLECTION}", timeout=5)
    
    # 建立新 collection
    response = requests.put(
        f"{QDRANT_URL}/collections/{COLLECTION}",
        json={
            'vectors': {'size': 768, 'distance': 'Cosine'},
            'hnsw_config': {'m': 16, 'ef_construct': 100}  # 優化檢索性能
        },
        timeout=10
    )
    
    if response.status_code == 200:
        print(f"  ✅ Collection 建立完成")
    else:
        print(f"  ❌ 建立失敗: {response.text}")
        sys.exit(1)


def upload_batch(points: List[Dict]):
    """批次上傳到 Qdrant"""
    if not points:
        return
    
    response = requests.put(
        f"{QDRANT_URL}/collections/{COLLECTION}/points",
        json={'points': points},
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"  ⚠️ 批次上傳失敗: {response.text[:100]}")


def main():
    print("🚀 高含量索引重建器 v2")
    print("=" * 60)
    print("功能：摘要 + TF-IDF 關鍵詞 + 去重")
    print("")
    
    # 建立 collection
    create_collection()
    
    # 收集所有檔案
    md_files = list(MEMORY_DIR.glob('**/*.md'))
    total_files = len(md_files)
    
    print(f"📊 總共 {total_files} 個記憶檔案\n")
    
    all_chunks = []
    
    # 第一輪：處理所有檔案
    for idx, file_path in enumerate(md_files, 1):
        count, chunks = index_file_enhanced(file_path, idx, total_files)
        all_chunks.extend(chunks)
    
    print(f"\n📦 準備上傳 {len(all_chunks)} 個 chunks...")
    
    # 批次上傳（每批 50 個）
    batch_size = 50
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i+batch_size]
        
        points = []
        for chunk in batch:
            # 生成 point ID
            content_hash = hashlib.md5(chunk['metadata']['content_preview'].encode()).hexdigest()
            point_id = int(content_hash[:15], 16)
            
            points.append({
                'id': point_id,
                'vector': chunk['embedding'],
                'payload': chunk['metadata']
            })
        
        upload_batch(points)
        
        if (i // batch_size + 1) % 5 == 0:
            print(f"  已上傳 {min(i + batch_size, len(all_chunks))}/{len(all_chunks)}")
    
    print(f"\n✅ 索引完成！")
    print(f"   檔案數: {total_files}")
    print(f"   Chunks: {len(all_chunks)}")
    print(f"   Collection: {COLLECTION}")


if __name__ == "__main__":
    main()
