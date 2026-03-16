"""
MemGPT-Style Layered Memory System for OpenClaw

Core Memory Module - 固定載入的核心記憶
對應 MemGPT 的 Core Memory (Persona + Human)
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


@dataclass
class CoreMemorySection:
    """核心記憶區塊"""
    name: str
    content: str
    priority: int = 0  # 優先級，數字越小越重要
    mutable: bool = False  # 是否可被 Agent 修改
    max_chars: int = 5000


class CoreMemory:
    """
    核心記憶管理器
    
    對應 MemGPT 的 Core Memory：
    - Persona (人設/個性) -> SOUL.md
    - Human (用戶資訊) -> USER.md + MEMORY.md
    
    特性：
    - 總是存在於上下文
    - 固定載入，不會被洗掉
    - 可設定為唯讀或由 Agent 管理
    """
    
    # 預設核心記憶檔案路徑（相對於 workspace）
    DEFAULT_FILES = {
        'soul': 'SOUL.md',
        'user': 'USER.md',
        'memory': 'MEMORY.md',
    }
    
    def __init__(
        self,
        workspace_path: Optional[str] = None,
        custom_files: Optional[Dict[str, str]] = None,
        allow_agent_edit: bool = False
    ):
        self.workspace = Path(workspace_path or os.getcwd())
        self.files = {**self.DEFAULT_FILES, **(custom_files or {})}
        self.allow_agent_edit = allow_agent_edit
        self._sections: Dict[str, CoreMemorySection] = {}
        self._loaded = False
        
    def load(self) -> 'CoreMemory':
        """載入所有核心記憶檔案"""
        if self._loaded:
            return self
            
        # 載入 SOUL.md (Persona - 最高優先級)
        self._load_section('soul', priority=1, mutable=self.allow_agent_edit)
        
        # 載入 USER.md (Human 基礎資訊)
        self._load_section('user', priority=2, mutable=self.allow_agent_edit)
        
        # 載入 MEMORY.md (擴展記憶)
        self._load_section('memory', priority=3, mutable=True)
        
        self._loaded = True
        return self
    
    def _load_section(
        self,
        key: str,
        priority: int = 0,
        mutable: bool = False
    ) -> Optional[CoreMemorySection]:
        """載入單個記憶區塊"""
        filename = self.files.get(key)
        if not filename:
            return None
            
        filepath = self.workspace / filename
        
        if filepath.exists():
            content = filepath.read_text(encoding='utf-8')
        else:
            # 檔案不存在，創建預設內容
            content = self._default_content(key)
            # 可選：自動創建檔案
            # filepath.write_text(content, encoding='utf-8')
            
        section = CoreMemorySection(
            name=key,
            content=content,
            priority=priority,
            mutable=mutable,
            max_chars=5000
        )
        self._sections[key] = section
        return section
    
    def _default_content(self, key: str) -> str:
        """獲取預設內容模板"""
        templates = {
            'soul': """# SOUL - Agent 核心人設

## 身份
我是 OpenClaw 的智能助手，專注於協助用戶完成各種任務。

## 個性
- 專業且友善
- 喜歡學習和改進
- 重視效率和準確性

## 核心原則
- 安全第一，不干擾用戶系統
- 尊重用戶隱私
- 持續學習和優化
""",
            'user': """# USER - 用戶資訊

## 基本資料
- 名稱：待填寫
- 偏好：待填寫
- 常用工具：待填寫

## 使用習慣
- 待觀察記錄

## 重要資訊
- 待添加
""",
            'memory': """# MEMORY - 重要記憶

## 長期記憶
<!-- 此區塊會被自動更新 -->

## 偏好設定
<!-- 用戶偏好會記錄在這裡 -->

## 重要事件
<!-- 重要事件時間線 -->
"""
        }
        return templates.get(key, f"# {key.upper()}\n\n")
    
    def get_section(self, name: str) -> Optional[CoreMemorySection]:
        """獲取特定記憶區塊"""
        return self._sections.get(name)
    
    def get_content(self, name: str) -> str:
        """獲取特定區塊的內容"""
        section = self._sections.get(name)
        return section.content if section else ""
    
    def get_all_content(self) -> str:
        """獲取所有核心記憶內容（按優先級排序）"""
        sorted_sections = sorted(
            self._sections.values(),
            key=lambda s: s.priority
        )
        return "\n\n---\n\n".join(s.content for s in sorted_sections)
    
    def get_context_prompt(self) -> str:
        """生成用於 LLM 上下文的提示格式"""
        parts = ["=== CORE MEMORY ==="]
        
        for section in sorted(self._sections.values(), key=lambda s: s.priority):
            parts.append(f"\n[{section.name.upper()}]\n{section.content}")
            
        return "\n".join(parts)
    
    def update_section(
        self,
        name: str,
        content: str,
        operation: str = 'replace'
    ) -> bool:
        """
        更新核心記憶區塊
        
        Args:
            name: 區塊名稱
            content: 新內容
            operation: 'replace' | 'append'
            
        Returns:
            bool: 是否成功
        """
        section = self._sections.get(name)
        if not section:
            return False
            
        if not section.mutable and not self.allow_agent_edit:
            return False
        
        if operation == 'append':
            section.content = section.content + "\n" + content
        else:
            section.content = content
            
        # 截斷過長內容
        if len(section.content) > section.max_chars:
            section.content = section.content[:section.max_chars]
            
        # 同步到檔案
        self._persist_section(name)
        return True
    
    def _persist_section(self, name: str) -> bool:
        """將記憶區塊持久化到檔案"""
        section = self._sections.get(name)
        if not section:
            return False
            
        filename = self.files.get(name)
        if not filename:
            return False
            
        filepath = self.workspace / filename
        try:
            filepath.write_text(section.content, encoding='utf-8')
            return True
        except Exception:
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計資訊"""
        return {
            'total_sections': len(self._sections),
            'total_chars': sum(len(s.content) for s in self._sections.values()),
            'sections': {
                name: {
                    'chars': len(s.content),
                    'priority': s.priority,
                    'mutable': s.mutable
                }
                for name, s in self._sections.items()
            }
        }
    
    def extract_facts(self) -> List[Dict[str, str]]:
        """從核心記憶提取結構化事實"""
        facts = []
        
        for section in self._sections.values():
            # 提取列表項目
            list_items = re.findall(r'^-\s+(.+)$', section.content, re.MULTILINE)
            for item in list_items:
                facts.append({
                    'source': section.name,
                    'type': 'list_item',
                    'content': item.strip()
                })
            
            # 提取標題
            headers = re.findall(r'^##+\s+(.+)$', section.content, re.MULTILINE)
            for header in headers:
                facts.append({
                    'source': section.name,
                    'type': 'header',
                    'content': header.strip()
                })
                
        return facts


# 便捷函數
def load_core_memory(
    workspace_path: Optional[str] = None
) -> CoreMemory:
    """快速載入核心記憶"""
    return CoreMemory(workspace_path).load()


def get_core_memory_context(workspace_path: Optional[str] = None) -> str:
    """獲取核心記憶上下文字串"""
    core = load_core_memory(workspace_path)
    return core.get_context_prompt()


if __name__ == '__main__':
    # 測試
    core = CoreMemory()
    core.load()
    print(core.get_context_prompt())
    print("\nStats:", core.get_stats())
