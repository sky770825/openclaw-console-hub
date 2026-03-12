"""
MemGPT-Style Layered Memory System for OpenClaw

Recall Memory Module - 召回記憶（對話歷史）
對應 MemGPT 的 Recall Memory（可搜索的完整交互記錄）
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Iterator
from dataclasses import dataclass, asdict
from enum import Enum
import threading


class MessageRole(Enum):
    """消息角色"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


@dataclass
class Message:
    """對話消息"""
    id: Optional[int] = None
    session_id: str = ""
    role: str = ""
    content: str = ""
    timestamp: Optional[str] = None
    metadata: Optional[str] = None  # JSON string
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'session_id': self.session_id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp,
            'metadata': json.loads(self.metadata) if self.metadata else {}
        }


@dataclass
class ConversationSummary:
    """對話摘要"""
    session_id: str
    summary: str
    key_points: List[str]
    start_time: str
    end_time: str
    message_count: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'session_id': self.session_id,
            'summary': self.summary,
            'key_points': self.key_points,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'message_count': self.message_count
        }


class RecallMemory:
    """
    召回記憶管理器
    
    對應 MemGPT 的 Recall Memory：
    - 存儲完整的對話歷史
    - 支持按 session 查詢
    - 自動壓縮舊對話
    - 支持關鍵字搜索
    
    存儲：SQLite（輕量、快速）
    """
    
    def __init__(
        self,
        db_path: Optional[str] = None,
        max_context_messages: int = 20,
        auto_compress_threshold: int = 50
    ):
        self.db_path = Path(db_path or "~/.openclaw/memory/recall.db").expanduser()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.max_context_messages = max_context_messages
        self.auto_compress_threshold = auto_compress_threshold
        
        self._local = threading.local()
        self._init_db()
    
    def _get_conn(self) -> sqlite3.Connection:
        """獲取線程安全的連接"""
        if not hasattr(self._local, 'conn') or self._local.conn is None:
            self._local.conn = sqlite3.connect(str(self.db_path))
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn
    
    def _init_db(self):
        """初始化數據庫表"""
        conn = self._get_conn()
        
        # 消息表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        """)
        
        # 摘要表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL UNIQUE,
                summary TEXT NOT NULL,
                key_points TEXT,
                start_time TEXT,
                end_time TEXT,
                message_count INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 創建索引
        conn.execute("CREATE INDEX IF NOT EXISTS idx_msg_session ON messages(session_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_msg_time ON messages(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sum_session ON summaries(session_id)")
        
        conn.commit()
    
    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> int:
        """
        添加消息到記憶
        
        Returns:
            int: 消息 ID
        """
        conn = self._get_conn()
        cursor = conn.execute(
            """INSERT INTO messages (session_id, role, content, metadata)
               VALUES (?, ?, ?, ?)""",
            (session_id, role, content, json.dumps(metadata) if metadata else None)
        )
        conn.commit()
        
        # 檢查是否需要壓縮
        self._maybe_compress(session_id)
        
        return cursor.lastrowid
    
    def get_recent_messages(
        self,
        session_id: str,
        limit: Optional[int] = None,
        include_summary: bool = True
    ) -> List[Message]:
        """
        獲取最近的對話歷史
        
        Args:
            session_id: 會話 ID
            limit: 限制數量（默認使用 max_context_messages）
            include_summary: 是否包含摘要作為上下文
        """
        limit = limit or self.max_context_messages
        conn = self._get_conn()
        
        messages = []
        
        # 如果有摘要，先添加摘要
        if include_summary:
            summary = self.get_summary(session_id)
            if summary:
                messages.append(Message(
                    session_id=session_id,
                    role='system',
                    content=f"[Previous conversation summary]: {summary.summary}",
                    timestamp=summary.start_time
                ))
        
        # 獲取最近消息
        rows = conn.execute(
            """SELECT * FROM messages 
               WHERE session_id = ? 
               ORDER BY timestamp DESC 
               LIMIT ?""",
            (session_id, limit)
        ).fetchall()
        
        for row in reversed(rows):  # 反轉為正序
            messages.append(Message(
                id=row['id'],
                session_id=row['session_id'],
                role=row['role'],
                content=row['content'],
                timestamp=row['timestamp'],
                metadata=row['metadata']
            ))
        
        return messages
    
    def get_messages_for_context(
        self,
        session_id: str,
        max_tokens: int = 4000
    ) -> List[Dict[str, str]]:
        """
        獲取用於 LLM 上下文的消息列表
        
        智能選擇：優先保留最近消息，舊消息用摘要替代
        """
        messages = self.get_recent_messages(session_id, limit=self.max_context_messages)
        
        # 轉換為 OpenAI 格式
        context = []
        total_chars = 0
        
        for msg in messages:
            char_count = len(msg.content)
            if total_chars + char_count > max_tokens * 4:  # 粗略估算 1 token ≈ 4 chars
                break
            
            context.append({
                'role': msg.role,
                'content': msg.content
            })
            total_chars += char_count
        
        return context
    
    def search(
        self,
        query: str,
        session_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Message]:
        """
        關鍵字搜索對話歷史
        """
        conn = self._get_conn()
        
        if session_id:
            rows = conn.execute(
                """SELECT * FROM messages 
                   WHERE session_id = ? AND content LIKE ? 
                   ORDER BY timestamp DESC 
                   LIMIT ?""",
                (session_id, f'%{query}%', limit)
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT * FROM messages 
                   WHERE content LIKE ? 
                   ORDER BY timestamp DESC 
                   LIMIT ?""",
                (f'%{query}%', limit)
            ).fetchall()
        
        return [
            Message(
                id=row['id'],
                session_id=row['session_id'],
                role=row['role'],
                content=row['content'],
                timestamp=row['timestamp'],
                metadata=row['metadata']
            )
            for row in rows
        ]
    
    def save_summary(self, summary: ConversationSummary) -> bool:
        """保存對話摘要"""
        conn = self._get_conn()
        
        try:
            conn.execute(
                """INSERT OR REPLACE INTO summaries 
                   (session_id, summary, key_points, start_time, end_time, message_count)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    summary.session_id,
                    summary.summary,
                    json.dumps(summary.key_points),
                    summary.start_time,
                    summary.end_time,
                    summary.message_count
                )
            )
            conn.commit()
            return True
        except Exception as e:
            print(f"Error saving summary: {e}")
            return False
    
    def get_summary(self, session_id: str) -> Optional[ConversationSummary]:
        """獲取對話摘要"""
        conn = self._get_conn()
        
        row = conn.execute(
            "SELECT * FROM summaries WHERE session_id = ?",
            (session_id,)
        ).fetchone()
        
        if row:
            return ConversationSummary(
                session_id=row['session_id'],
                summary=row['summary'],
                key_points=json.loads(row['key_points']) if row['key_points'] else [],
                start_time=row['start_time'],
                end_time=row['end_time'],
                message_count=row['message_count']
            )
        return None
    
    def _maybe_compress(self, session_id: str):
        """檢查並壓縮舊對話"""
        conn = self._get_conn()
        
        count = conn.execute(
            "SELECT COUNT(*) FROM messages WHERE session_id = ?",
            (session_id,)
        ).fetchone()[0]
        
        if count > self.auto_compress_threshold:
            # 標記需要壓縮，實際壓縮由 auto_summarize 處理
            pass
    
    def get_session_stats(self, session_id: str) -> Dict[str, Any]:
        """獲取會話統計"""
        conn = self._get_conn()
        
        stats = conn.execute(
            """SELECT 
                COUNT(*) as message_count,
                MIN(timestamp) as start_time,
                MAX(timestamp) as end_time,
                SUM(LENGTH(content)) as total_chars
               FROM messages 
               WHERE session_id = ?""",
            (session_id,)
        ).fetchone()
        
        return {
            'session_id': session_id,
            'message_count': stats['message_count'],
            'start_time': stats['start_time'],
            'end_time': stats['end_time'],
            'total_chars': stats['total_chars']
        }
    
    def clear_session(self, session_id: str) -> bool:
        """清除特定會話的記憶"""
        conn = self._get_conn()
        
        try:
            conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM summaries WHERE session_id = ?", (session_id,))
            conn.commit()
            return True
        except Exception:
            return False
    
    def list_sessions(self, limit: int = 100) -> List[Dict[str, Any]]:
        """列出所有會話"""
        conn = self._get_conn()
        
        rows = conn.execute(
            """SELECT 
                session_id,
                COUNT(*) as message_count,
                MIN(timestamp) as first_message,
                MAX(timestamp) as last_message
               FROM messages 
               GROUP BY session_id 
               ORDER BY last_message DESC 
               LIMIT ?""",
            (limit,)
        ).fetchall()
        
        return [
            {
                'session_id': row['session_id'],
                'message_count': row['message_count'],
                'first_message': row['first_message'],
                'last_message': row['last_message']
            }
            for row in rows
        ]


# 便捷函數
def create_recall_memory(db_path: Optional[str] = None) -> RecallMemory:
    """創建召回記憶實例"""
    return RecallMemory(db_path)


if __name__ == '__main__':
    # 測試
    recall = RecallMemory()
    
    # 添加測試消息
    session = "test-session"
    recall.add_message(session, "user", "Hello!")
    recall.add_message(session, "assistant", "Hi there!")
    
    # 獲取消息
    messages = recall.get_recent_messages(session)
    for msg in messages:
        print(f"[{msg.role}] {msg.content}")
