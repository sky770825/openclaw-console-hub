#!/usr/bin/env python3
import os
import json
import hashlib
from pathlib import Path
import subprocess
from datetime import datetime

# 配置
WORKSPACE = Path(os.environ.get("OPENCLAW_WORKSPACE", Path.home() / ".openclaw" / "workspace"))
MEMORY_DIR = WORKSPACE / "memory"
CORE_FILES = ["AGENTS.md", "MEMORY.md"]
INDEX_FILE = WORKSPACE / "memory_index.json"

def get_file_hash(content):
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def scan_memory():
    """功能 A: 掃描 memory/ 目錄，識別並標記重複或低價值片段"""
    print("🔍 正在掃描 memory 目錄...")
    seen_hashes = {}
    files = list(MEMORY_DIR.glob("*.md"))
    deleted_count = 0
    
    archive_dir = MEMORY_DIR / "archive"
    archive_dir.mkdir(exist_ok=True)
    
    for file_path in files:
        if file_path.is_dir(): continue
        # 不要處理 archive 本身
        if "archive" in str(file_path): continue
        
        # 讀取檔案內容
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
        except Exception as e:
            print(f"⚠️ 無法讀取 {file_path}: {e}")
            continue

        if not content or len(content) < 20:
            print(f"🗑️ 標記低價值檔案 (過短): {file_path.name}")
            archive_path = archive_dir / file_path.name
            file_path.rename(archive_path)
            deleted_count += 1
            continue

        content_hash = get_file_hash(content)
        if content_hash in seen_hashes:
            print(f"🗑️ 發現重複內容: {file_path.name} (與 {seen_hashes[content_hash]} 重複)")
            archive_path = archive_dir / file_path.name
            file_path.rename(archive_path)
            deleted_count += 1
        else:
            seen_hashes[content_hash] = file_path.name
            
    print(f"✅ 掃描完成。清理了 {deleted_count} 個項目。")
    return deleted_count

def reindex_core():
    """功能 B: 針對核心 SOP 與重要決策檔案進行高品質重新向量化"""
    print("🔄 正在重新向量化核心檔案...")
    # 這裡我們調用現有的 embedding_indexer.py (如果存在且可用)
    # 或者是直接觸發重新建立索引流程
    try:
        # 使用現有的 build-vector-index.sh 或 python 腳本
        # 假設 scripts/embedding_indexer.py --build 是建立索引的方式
        # 注意：在某些環境下 python3 可能觸發 Xcode 授權問題
        # 嘗試使用系統默認的 python 獲取更穩定路徑
        python_cmd = "python3"
        indexer_path = str(WORKSPACE / "scripts/embedding_indexer.py")
        
        if not os.path.exists(indexer_path):
             print(f"⚠️ 找不到索引腳本: {indexer_path}")
             return False

        result = subprocess.run([python_cmd, indexer_path, "--build"], 
                                capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ 核心檔案向量化完成。")
            return True
        else:
            # 針對 Xcode 授權錯誤進行降級處理：如果不能重新索引，至少標記失敗但不崩潰
            if "xcodebuild -license" in result.stderr:
                print("⚠️ 系統 Python 需要 Xcode 授權。跳過向量化步驟，僅進行清理。")
                return "SKIPPED_LICENSE"
            print(f"❌ 向量化失敗: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ 執行向量化腳本出錯: {e}")
        return False

def clean_stale_indices():
    """功能 C: 清理向量資料庫中過時的索引條目"""
    print("🧹 清理過時索引...")
    if not INDEX_FILE.exists():
        print("ℹ️ 索引檔案不存在，跳過。")
        return 0
        
    try:
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            index_data = json.load(f)
        
        original_count = len(index_data.get("chunks", []))
        # 過濾掉 source 檔案已不存在的 chunks
        valid_chunks = []
        valid_embeddings = []
        
        chunks = index_data.get("chunks", [])
        embeddings = index_data.get("embeddings", [])
        
        for i, chunk in enumerate(chunks):
            source_path = WORKSPACE / chunk.get("source", "")
            if source_path.exists():
                valid_chunks.append(chunk)
                if i < len(embeddings):
                    valid_embeddings.append(embeddings[i])
        
        index_data["chunks"] = valid_chunks
        index_data["embeddings"] = valid_embeddings
        index_data["updated_at"] = datetime.now().isoformat()
        
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
            
        cleaned_count = original_count - len(valid_chunks)
        print(f"✅ 清理了 {cleaned_count} 個失效索引條目。")
        return cleaned_count
    except Exception as e:
        print(f"❌ 清理索引出錯: {e}")
        return 0

def main():
    print("=== Memory Vacuum System ===")
    deleted_files = scan_memory()
    cleaned_indices = clean_stale_indices()
    reindexed = reindex_core()
    
    # 寫入簡短報告供外部讀取
    report = {
        "timestamp": datetime.now().isoformat(),
        "deleted_files": deleted_files,
        "cleaned_indices": cleaned_indices,
        "reindexed": reindexed
    }
    with open(WORKSPACE / "memory/vacuum_report.json", "w") as f:
        json.dump(report, f)
    
    print("=== Vacuum Completed ===")

if __name__ == "__main__":
    main()
