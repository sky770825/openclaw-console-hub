"""
MemGPT-Style Layered Memory System for OpenClaw

Archival Memory Module - 存檔記憶（向量數據庫）
對應 MemGPT 的 Archival Memory（長期知識存儲）

使用 LanceDB 作為向量存儲後端
"""

import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
import numpy as np

# 可選依賴處理
try:
    import lancedb
    import pyarrow as pa
    HAS_LANCEDB = True
except ImportError:
    HAS_LANCEDB = False

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


@dataclass
class MemoryEntry:
    """存檔記憶條目"""
    id: str
    content: str
    embedding: Optional[List[float]] = None
    source: str = ""  # 來源（session_id / file / manual）
    memory_type: str = "fact"  # fact / summary / preference / event
    created_at: str = ""
    updated_at: str = ""
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()
        if not self.updated_at:
            self.updated_at = self.created_at
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'content': self.content,
            'embedding': self.embedding,
            'source': self.source,
            'memory_type': self.memory_type,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'metadata': json.dumps(self.metadata) if self.metadata else None
        }


class SimpleEmbedding:
    """簡單嵌入實現（當沒有外部嵌入服務時使用）"""
    
    def __init__(self, dim: int = 384):
        self.dim = dim
    
    def embed(self, text: str) -> List[float]:
        """生成簡單嵌入向量"""
        words = text.lower().split()
        vector = [0.0] * self.dim
        
        for word in words:
            h = hashlib.md5(word.encode()).hexdigest()
            for i in range(min(self.dim, len(h))):
                idx = i % self.dim
                val = int(h[i], 16) / 15.0
                vector[idx] += val
        
        # 歸一化
        norm = sum(x ** 2 for x in vector) ** 0.5
        if norm > 0:
            vector = [x / norm for x in vector]
        
        return vector


class ArchivalMemory:
    """
    存檔記憶管理器
    
    對應 MemGPT 的 Archival Memory：
    - 長期知識存儲
    - 向量搜索
    - 混合檢索（向量 + 關鍵詞）
    - 支持多種記憶類型
    
    存儲：LanceDB（多模態向量數據庫）
    """
    
    def __init__(
        self,
        db_path: Optional[str] = None,
        table_name: str = "archival_memory",
        embedding_dim: int = 384,
        embedding_provider: str = "simple"
    ):
        self.db_path = Path(db_path or "~/.openclaw/memory/archival.lance").expanduser()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.table_name = table_name
        self.embedding_dim = embedding_dim
        self.embedding_provider = embedding_provider
        
        self._db = None
        self._table = None
        self._embedder = None
        
        self._init_embedder()
        self._init_db()
    
    def _init_embedder(self):
        """初始化嵌入生成器"""
        if self.embedding_provider == "openai" and HAS_OPENAI:
            self._embedder = None
        else:
            self._embedder = SimpleEmbedding(self.embedding_dim)
    
    def _get_embedding(self, text: str) -> List[float]:
        """獲取文本嵌入"""
        if self.embedding_provider == "openai" and HAS_OPENAI:
            pass
        
        if self._embedder:
            return self._embedder.embed(text)
        
        return [0.0] * self.embedding_dim
    
    def _init_db(self):
        """初始化 LanceDB"""
        if not HAS_LANCEDB:
            print("Warning: LanceDB not available, using in-memory fallback")
            self._entries: Dict[str, MemoryEntry] = {}
            return
        
        self._db = lancedb.connect(str(self.db_path))
        
        # 定義 schema
        schema = pa.schema([
            pa.field("id", pa.string()),
            pa.field("content", pa.string()),
            pa.field("vector", pa.list_(pa.float32(), self.embedding_dim)),
            pa.field("source", pa.string()),
            pa.field("memory_type", pa.string()),
            pa.field("created_at", pa.string()),
            pa.field("updated_at", pa.string()),
            pa.field("metadata", pa.string())
        ])
        
        if self.table_name in self._db.table_names():
            self._table = self._db.open_table(self.table_name)
        else:
            self._table = self._db.create_table(self.table_name, schema=schema)
    
    def insert(
        self,
        content: str,
        memory_type: str = "fact",
        source: str = "",
        metadata: Optional[Dict] = None,
        memory_id: Optional[str] = None
    ) -> str:
        """插入記憶條目"""
        if memory_id is None:
            memory_id = hashlib.md5(
                f"{content}:{datetime.utcnow().isoformat()}".encode()
            ).hexdigest()[:16]
        
        embedding = self._get_embedding(content)
        
        entry = MemoryEntry(
            id=memory_id,
            content=content,
            embedding=embedding,
            source=source,
            memory_type=memory_type,
            metadata=metadata
        )
        
        if HAS_LANCEDB and self._table is not None:
            import pandas as pd
            df = pd.DataFrame([{
                'id': entry.id,
                'content': entry.content,
                'vector': entry.embedding,
                'source': entry.source,
                'memory_type': entry.memory_type,
                'created_at': entry.created_at,
                'updated_at': entry.updated_at,
                'metadata': json.dumps(entry.metadata) if entry.metadata else None
            }])
            self._table.add(df)
        else:
            self._entries[memory_id] = entry
        
        return memory_id
    
    def search(
        self,
        query: str,
        limit: int = 5,
        memory_type: Optional[str] = None,
        source: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """向量搜索記憶"""
        query_embedding = self._get_embedding(query)
        
        if HAS_LANCEDB and self._table is not None:
            results = self._table.search(query_embedding).limit(limit * 2)
            df = results.to_pandas()
            
            if memory_type:
                df = df[df['memory_type'] == memory_type]
            if source:
                df = df[df['source'] == source]
            
            df = df.head(limit)
            
            return [
                {
                    'id': row['id'],
                    'content': row['content'],
                    'score': float(row.get('_distance', 0)),
                    'memory_type': row['memory_type'],
                    'source': row['source'],
                    'metadata': json.loads(row['metadata']) if row.get('metadata') else None,
                    'created_at': row['created_at']
                }
                for _, row in df.iterrows()
            ]
        else:
            results = []
            for entry in self._entries.values():
                if memory_type and entry.memory_type != memory_type:
                    continue
                if source and entry.source != source:
                    continue
                
                if entry.embedding:
                    dot = sum(a * b for a, b in zip(query_embedding, entry.embedding))
                    results.append((entry, dot))
            
            results.sort(key=lambda x: x[1], reverse=True)
            
            return [
                {
                    'id': entry.id,
                    'content': entry.content,
                    'score': score,
                    'memory_type': entry.memory_type,
                    'source': entry.source,
                    'metadata': entry.metadata,
                    'created_at': entry.created_at
                }
                for entry, score in results[:limit]
            ]
    
    def get_by_id(self, memory_id: str) -> Optional[MemoryEntry]:
        """根據 ID 獲取記憶"""
        if HAS_LANCEDB and self._table is not None:
            results = self._table.search().where(f"id = '{memory_id}'").limit(1).to_pandas()
            if len(results) > 0:
                row = results.iloc[0]
                return MemoryEntry(
                    id=row['id'],
                    content=row['content'],
                    embedding=row['vector'],
                    source=row['source'],
                    memory_type=row['memory_type'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at'],
                    metadata=json.loads(row['metadata']) if row.get('metadata') else None
                )
        else:
            return self._entries.get(memory_id)
        
        return None
    
    def delete(self, memory_id: str) -> bool:
        """刪除記憶條目"""
        if HAS_LANCEDB and self._table is not None:
            self._table.delete(f"id = '{memory_id}'")
        else:
            if memory_id in self._entries:
                del self._entries[memory_id]
                return True
            return False
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        if HAS_LANCEDB and self._table is not None:
            count = len(self._table.to_pandas())
        else:
            count = len(self._entries)
        
        return {
            'total_entries': count,
            'db_type': 'lancedb' if HAS_LANCEDB else 'in-memory',
            'embedding_provider': self.embedding_provider,
            'embedding_dim': self.embedding_dim
        }


def create_archival_memory(db_path: Optional[str] = None, embedding_provider: str = "simple") -> ArchivalMemory:
    """創建存檔記憶實例"""
    return ArchivalMemory(db_path, embedding_provider=embedding_provider)
