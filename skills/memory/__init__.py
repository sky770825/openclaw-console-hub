"""
MemGPT-Style Layered Memory System

OpenClaw 分層記憶系統 - 統一入口
"""

from .core_memory import CoreMemory, load_core_memory, get_core_memory_context
from .recall_memory import RecallMemory, Message, ConversationSummary, create_recall_memory
from .archival_memory import ArchivalMemory, MemoryEntry, create_archival_memory
from .auto_summarize import AutoSummarizer, SummaryConfig, summarize_conversation
from .memory_manager import MemoryManager, MemoryContext, create_memory_manager

__version__ = "1.0.0"
__all__ = [
    # Core
    'CoreMemory',
    'load_core_memory',
    'get_core_memory_context',
    
    # Recall
    'RecallMemory',
    'Message',
    'ConversationSummary',
    'create_recall_memory',
    
    # Archival
    'ArchivalMemory',
    'MemoryEntry',
    'create_archival_memory',
    
    # Auto Summarize
    'AutoSummarizer',
    'SummaryConfig',
    'summarize_conversation',
    
    # Manager
    'MemoryManager',
    'MemoryContext',
    'create_memory_manager',
]
