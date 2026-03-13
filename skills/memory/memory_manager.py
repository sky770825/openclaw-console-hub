"""
MemGPT-Style Layered Memory System for OpenClaw

Memory Manager - 統一記憶管理器
協調 Core / Recall / Archival 三層記憶
"""

import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

try:
    from .core_memory import CoreMemory
    from .recall_memory import RecallMemory
    from .archival_memory import ArchivalMemory
    from .auto_summarize import AutoSummarizer
except ImportError:
    from core_memory import CoreMemory
    from recall_memory import RecallMemory
    from archival_memory import ArchivalMemory
    from auto_summarize import AutoSummarizer


@dataclass
class MemoryContext:
    """完整的記憶上下文"""
    core_prompt: str
    recall_messages: List[Dict[str, str]]
    archival_results: List[Dict[str, Any]]
    total_tokens_estimate: int


class MemoryManager:
    """
    記憶管理器
    
    協調三層記憶：
    1. Core Memory - 核心記憶（總是存在）
    2. Recall Memory - 召回記憶（對話歷史）
    3. Archival Memory - 存檔記憶（長期知識）
    
    提供統一接口：
    - 載入完整上下文
    - 存儲消息
    - 搜索記憶
    - 自動摘要
    """
    
    def __init__(
        self,
        workspace_path: Optional[str] = None,
        recall_db_path: Optional[str] = None,
        archival_db_path: Optional[str] = None,
        max_context_tokens: int = 8000,
        enable_auto_summarize: bool = True
    ):
        self.workspace_path = workspace_path or os.getcwd()
        self.max_context_tokens = max_context_tokens
        self.enable_auto_summarize = enable_auto_summarize
        
        # 初始化三層記憶
        self.core = CoreMemory(self.workspace_path).load()
        self.recall = RecallMemory(recall_db_path)
        self.archival = ArchivalMemory(archival_db_path)
        
        # 初始化摘要器
        self.summarizer = AutoSummarizer(
            recall_memory=self.recall
        ) if enable_auto_summarize else None
    
    def get_full_context(
        self,
        session_id: str,
        query: Optional[str] = None
    ) -> MemoryContext:
        """獲取完整的記憶上下文"""
        core_prompt = self.core.get_context_prompt()
        
        recall_messages = self.recall.get_messages_for_context(
            session_id,
            max_tokens=self.max_context_tokens // 3
        )
        
        archival_results = []
        if query:
            archival_results = self.archival.search(query=query, limit=3)
        
        total_chars = len(core_prompt) + sum(len(m['content']) for m in recall_messages)
        total_tokens_estimate = total_chars // 4
        
        return MemoryContext(
            core_prompt=core_prompt,
            recall_messages=recall_messages,
            archival_results=archival_results,
            total_tokens_estimate=total_tokens_estimate
        )
    
    def format_context_for_llm(
        self,
        context: MemoryContext,
        include_archival: bool = True
    ) -> List[Dict[str, str]]:
        """格式化記憶上下文為 LLM 消息格式"""
        messages = []
        
        messages.append({
            'role': 'system',
            'content': context.core_prompt
        })
        
        if include_archival and context.archival_results:
            archival_context = "=== RELEVANT MEMORIES ===\n"
            for mem in context.archival_results:
                archival_context += f"- {mem['content']}\n"
            messages.append({'role': 'system', 'content': archival_context})
        
        messages.extend(context.recall_messages)
        return messages
    
    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> int:
        """添加消息到記憶"""
        msg_id = self.recall.add_message(
            session_id=session_id,
            role=role,
            content=content,
            metadata=metadata
        )
        return msg_id
    
    def search_all_memories(
        self,
        query: str,
        session_id: Optional[str] = None,
        limit: int = 5
    ) -> Dict[str, List[Dict]]:
        """搜索所有記憶層"""
        return {
            'core_facts': self.core.extract_facts()[:limit],
            'recall_messages': [
                m.to_dict() for m in self.recall.search(query, session_id, limit)
            ],
            'archival_memories': self.archival.search(query, limit=limit)
        }
    
    def end_session(
        self,
        session_id: str,
        generate_summary: bool = True
    ) -> Optional[Any]:
        """結束會話並生成摘要"""
        if generate_summary and self.summarizer:
            return self.summarizer.summarize_session(session_id)
        return None
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取記憶統計"""
        return {
            'core': self.core.get_stats(),
            'recall': self.recall.get_session_stats('global'),
            'archival': self.archival.get_stats()
        }


def create_memory_manager(
    workspace_path: Optional[str] = None
) -> MemoryManager:
    """創建記憶管理器實例"""
    return MemoryManager(workspace_path=workspace_path)
