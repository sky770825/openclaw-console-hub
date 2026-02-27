"""
MemGPT-Style Layered Memory System for OpenClaw

Auto Summarize Module - 自動摘要
對應 MemGPT 的自我編輯記憶功能
"""

import json
import re
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

try:
    from .recall_memory import RecallMemory, ConversationSummary
except ImportError:
    from recall_memory import RecallMemory, ConversationSummary


@dataclass
class SummaryConfig:
    """摘要配置"""
    max_summary_length: int = 500
    extract_key_points: bool = True
    key_points_count: int = 5
    preserve_code_blocks: bool = True
    preserve_links: bool = True


class AutoSummarizer:
    """
    自動摘要器
    
    功能：
    - 對話結束時自動生成摘要
    - 提取關鍵信息點
    - 識別用戶偏好和事實
    - 存儲到 Archival Memory
    """
    
    def __init__(
        self,
        recall_memory: Optional[RecallMemory] = None,
        llm_client: Optional[Any] = None,
        config: Optional[SummaryConfig] = None
    ):
        self.recall = recall_memory or RecallMemory()
        self.llm = llm_client
        self.config = config or SummaryConfig()
    
    def summarize_session(
        self,
        session_id: str,
        store_to_archival: bool = True
    ) -> Optional[ConversationSummary]:
        """為整個會話生成摘要"""
        stats = self.recall.get_session_stats(session_id)
        
        if stats['message_count'] == 0:
            return None
        
        all_messages = self.recall.get_recent_messages(
            session_id,
            limit=stats['message_count'],
            include_summary=False
        )
        
        summary_text = self._generate_summary(all_messages)
        key_points = self._extract_key_points(all_messages)
        
        summary = ConversationSummary(
            session_id=session_id,
            summary=summary_text,
            key_points=key_points,
            start_time=stats['start_time'],
            end_time=stats['end_time'],
            message_count=stats['message_count']
        )
        
        self.recall.save_summary(summary)
        
        if store_to_archival:
            self._store_to_archival(summary, all_messages)
        
        return summary
    
    def _generate_summary(self, messages: List[Any]) -> str:
        """生成摘要文本"""
        if not messages:
            return ""
        
        conversation = []
        for msg in messages:
            if msg.role in ['user', 'assistant']:
                conversation.append(f"{msg.role}: {msg.content[:200]}")
        
        if self.llm:
            return self._llm_summarize(conversation)
        else:
            return self._simple_summarize(messages)
    
    def _llm_summarize(self, conversation: List[str]) -> str:
        """使用 LLM 生成摘要"""
        return self._simple_summarize_from_text(conversation)
    
    def _simple_summarize(self, messages: List[Any]) -> str:
        """簡單規則摘要"""
        actions = []
        
        for msg in messages:
            content = msg.content.lower()
            
            if msg.role == 'user':
                if any(word in content for word in ['create', 'build', 'make', 'write']):
                    actions.append('created something')
                elif any(word in content for word in ['fix', 'debug', 'error', 'issue']):
                    actions.append('debugged issues')
                elif any(word in content for word in ['explain', 'what', 'how', 'why']):
                    actions.append('asked questions')
            
            if msg.role == 'assistant':
                if any(word in content for word in ['created', 'completed', 'done', 'finished']):
                    actions.append('completed tasks')
        
        actions = list(set(actions))
        
        if actions:
            return f"Session involved: {', '.join(actions)}."
        return "General conversation session."
    
    def _simple_summarize_from_text(self, conversation: List[str]) -> str:
        """從文本列表生成摘要"""
        return f"Conversation with {len(conversation)} exchanges."
    
    def _extract_key_points(self, messages: List[Any]) -> List[str]:
        """提取關鍵點"""
        key_points = []
        
        # 識別用戶偏好
        preferences = self._extract_preferences(messages)
        key_points.extend(preferences)
        
        # 識別重要事實
        facts = self._extract_facts(messages)
        key_points.extend(facts)
        
        # 識別完成的任務
        tasks = self._extract_completed_tasks(messages)
        key_points.extend(tasks)
        
        return key_points[:self.config.key_points_count]
    
    def _extract_preferences(self, messages: List[Any]) -> List[str]:
        """提取用戶偏好"""
        preferences = []
        
        preference_patterns = [
            r'(?:I|我)\s+(?:like|love|prefer|enjoy|喜歡|偏好)\s+(.+?)[.。!！]',
            r'(?:I|我)\s+(?:don\'t|do not|不)\s+(?:like|want|prefer)\s+(.+?)[.。]',
            r'(?:my|我的)\s+(?:favorite|favourite|最喜歡)\s+(?:is|是)\s+(.+?)[.。]'
        ]
        
        for msg in messages:
            if msg.role == 'user':
                for pattern in preference_patterns:
                    matches = re.findall(pattern, msg.content, re.IGNORECASE)
                    for match in matches:
                        preferences.append(f"User preference: {match.strip()}")
        
        return preferences
    
    def _extract_facts(self, messages: List[Any]) -> List[str]:
        """提取重要事實"""
        facts = []
        
        fact_patterns = [
            r'(?:I|我)\s+(?:am|work as|live in|住在|工作是)\s+(.+?)[.。]',
            r'(?:my|我的)\s+(?:name|姓名|job|工作|company|公司)\s+(?:is|是)\s+(.+?)[.。]'
        ]
        
        for msg in messages:
            if msg.role == 'user':
                for pattern in fact_patterns:
                    matches = re.findall(pattern, msg.content, re.IGNORECASE)
                    for match in matches:
                        facts.append(f"User fact: {match.strip()}")
        
        return facts
    
    def _extract_completed_tasks(self, messages: List[Any]) -> List[str]:
        """提取已完成的任務"""
        tasks = []
        
        task_keywords = ['created', 'built', 'implemented', 'fixed', 'completed', 
                        'generated', 'wrote', 'deployed']
        
        for msg in messages:
            if msg.role == 'assistant':
                content_lower = msg.content.lower()
                for keyword in task_keywords:
                    if keyword in content_lower:
                        # 提取句子
                        sentences = re.findall(r'[^.!?]+[.!?]', msg.content)
                        for sent in sentences:
                            if keyword in sent.lower():
                                tasks.append(f"Task: {sent.strip()}")
                                break
                        break
        
        return tasks
    
    def _store_to_archival(
        self,
        summary: ConversationSummary,
        messages: List[Any]
    ):
        """存儲摘要到存檔記憶"""
        try:
            try:
                from .archival_memory import ArchivalMemory
            except ImportError:
                from archival_memory import ArchivalMemory
            archival = ArchivalMemory()
            
            # 存儲摘要
            archival.insert(
                content=summary.summary,
                memory_type="summary",
                source=summary.session_id,
                metadata={
                    'session_id': summary.session_id,
                    'message_count': summary.message_count,
                    'key_points': summary.key_points
                }
            )
            
            # 存儲關鍵點作為獨立記憶
            for point in summary.key_points:
                archival.insert(
                    content=point,
                    memory_type="key_point",
                    source=summary.session_id
                )
                
        except Exception as e:
            print(f"Error storing to archival: {e}")
    
    def extract_code_blocks(self, messages: List[Any]) -> List[Dict]:
        """提取對話中的代碼塊"""
        code_blocks = []
        
        for msg in messages:
            if msg.role == 'assistant':
                # 匹配 Markdown 代碼塊
                pattern = r'```(\w+)?\n(.*?)```'
                matches = re.findall(pattern, msg.content, re.DOTALL)
                
                for lang, code in matches:
                    code_blocks.append({
                        'language': lang or 'text',
                        'code': code.strip(),
                        'timestamp': msg.timestamp
                    })
        
        return code_blocks
    
    def generate_session_report(self, session_id: str) -> Dict[str, Any]:
        """生成完整的會話報告"""
        stats = self.recall.get_session_stats(session_id)
        summary = self.recall.get_summary(session_id)
        
        all_messages = self.recall.get_recent_messages(
            session_id,
            limit=stats['message_count'],
            include_summary=False
        )
        
        code_blocks = self.extract_code_blocks(all_messages)
        
        return {
            'session_id': session_id,
            'duration': {
                'start': stats['start_time'],
                'end': stats['end_time']
            },
            'statistics': {
                'message_count': stats['message_count'],
                'total_chars': stats['total_chars'],
                'code_blocks': len(code_blocks)
            },
            'summary': summary.to_dict() if summary else None,
            'key_code_blocks': code_blocks[:5],
            'generated_at': datetime.utcnow().isoformat()
        }


def summarize_conversation(
    session_id: str,
    recall_memory: Optional[RecallMemory] = None
) -> Optional[ConversationSummary]:
    """便捷函數：摘要對話"""
    summarizer = AutoSummarizer(recall_memory=recall_memory)
    return summarizer.summarize_session(session_id)
