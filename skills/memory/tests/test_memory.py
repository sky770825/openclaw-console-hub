"""
Unit Tests for MemGPT-Style Layered Memory System
"""

import unittest
import tempfile
import shutil
from pathlib import Path

# 添加父目錄到路徑
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from memory.core_memory import CoreMemory, CoreMemorySection
from memory.recall_memory import RecallMemory, Message, ConversationSummary
from memory.archival_memory import ArchivalMemory, MemoryEntry, SimpleEmbedding
from memory.auto_summarize import AutoSummarizer, SummaryConfig
from memory.memory_manager import MemoryManager, MemoryContext


class TestCoreMemory(unittest.TestCase):
    """測試核心記憶"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.workspace = Path(self.temp_dir)
        
        # 創建測試檔案
        (self.workspace / "SOUL.md").write_text("# Test SOUL\nTest persona")
        (self.workspace / "USER.md").write_text("# Test USER\nTest user info")
        (self.workspace / "MEMORY.md").write_text("# Test MEMORY\nTest memory")
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir)
    
    def test_load_core_memory(self):
        """測試載入核心記憶"""
        core = CoreMemory(self.workspace).load()
        
        self.assertIn('soul', core._sections)
        self.assertIn('user', core._sections)
        self.assertIn('memory', core._sections)
    
    def test_get_content(self):
        """測試獲取內容"""
        core = CoreMemory(self.workspace).load()
        
        soul_content = core.get_content('soul')
        self.assertIn("Test SOUL", soul_content)
    
    def test_get_context_prompt(self):
        """測試生成上下文提示"""
        core = CoreMemory(self.workspace).load()
        prompt = core.get_context_prompt()
        
        self.assertIn("CORE MEMORY", prompt)
        self.assertIn("SOUL", prompt)
    
    def test_get_stats(self):
        """測試統計信息"""
        core = CoreMemory(self.workspace).load()
        stats = core.get_stats()
        
        self.assertEqual(stats['total_sections'], 3)
        self.assertGreater(stats['total_chars'], 0)
    
    def test_extract_facts(self):
        """測試提取事實"""
        core = CoreMemory(self.workspace).load()
        facts = core.extract_facts()
        
        self.assertIsInstance(facts, list)


class TestRecallMemory(unittest.TestCase):
    """測試召回記憶"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.temp_dir) / "test_recall.db"
        self.recall = RecallMemory(str(self.db_path))
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir)
    
    def test_add_message(self):
        """測試添加消息"""
        msg_id = self.recall.add_message(
            session_id="test-session",
            role="user",
            content="Hello"
        )
        
        self.assertIsInstance(msg_id, int)
        self.assertGreater(msg_id, 0)
    
    def test_get_recent_messages(self):
        """測試獲取最近消息"""
        # 添加測試消息
        self.recall.add_message("test-session", "user", "Hello")
        self.recall.add_message("test-session", "assistant", "Hi!")
        
        messages = self.recall.get_recent_messages("test-session")
        
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0].role, "user")
        self.assertEqual(messages[1].role, "assistant")
    
    def test_search(self):
        """測試搜索"""
        self.recall.add_message("test-session", "user", "I love Python")
        self.recall.add_message("test-session", "user", "I like JavaScript")
        
        results = self.recall.search("Python")
        
        self.assertGreater(len(results), 0)
        self.assertIn("Python", results[0].content)
    
    def test_save_and_get_summary(self):
        """測試保存和獲取摘要"""
        summary = ConversationSummary(
            session_id="test-session",
            summary="Test summary",
            key_points=["point1", "point2"],
            start_time="2026-01-01T00:00:00",
            end_time="2026-01-01T01:00:00",
            message_count=10
        )
        
        self.recall.save_summary(summary)
        retrieved = self.recall.get_summary("test-session")
        
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.summary, "Test summary")
        self.assertEqual(len(retrieved.key_points), 2)
    
    def test_get_session_stats(self):
        """測試會話統計"""
        self.recall.add_message("test-session", "user", "Hello")
        
        stats = self.recall.get_session_stats("test-session")
        
        self.assertEqual(stats['message_count'], 1)
        self.assertIn('start_time', stats)


class TestArchivalMemory(unittest.TestCase):
    """測試存檔記憶"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.temp_dir) / "test_archival"
        self.archival = ArchivalMemory(str(self.db_path))
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir)
    
    def test_insert(self):
        """測試插入記憶"""
        memory_id = self.archival.insert(
            content="Test memory content",
            memory_type="fact",
            source="test"
        )
        
        self.assertIsInstance(memory_id, str)
        self.assertEqual(len(memory_id), 16)
    
    def test_search(self):
        """測試搜索"""
        self.archival.insert("Python is great", "fact", "test")
        self.archival.insert("JavaScript is good", "fact", "test")
        
        results = self.archival.search("Python", limit=5)
        
        self.assertIsInstance(results, list)
        # 可能有結果也可能沒有（取決於嵌入質量）
    
    def test_get_stats(self):
        """測試統計"""
        stats = self.archival.get_stats()
        
        self.assertIn('total_entries', stats)
        self.assertIn('db_type', stats)
    
    def test_list_all(self):
        """測試列出所有"""
        self.archival.insert("Test 1", "fact", "test")
        self.archival.insert("Test 2", "fact", "test")
        
        results = self.archival.list_all(limit=10)
        
        self.assertIsInstance(results, list)


class TestSimpleEmbedding(unittest.TestCase):
    """測試簡單嵌入"""
    
    def test_embed(self):
        """測試嵌入生成"""
        embedder = SimpleEmbedding(dim=10)
        
        vector = embedder.embed("Hello world")
        
        self.assertEqual(len(vector), 10)
        # 檢查是否歸一化
        norm = sum(x ** 2 for x in vector) ** 0.5
        self.assertAlmostEqual(norm, 1.0, places=5)
    
    def test_different_texts(self):
        """測試不同文本生成不同嵌入"""
        embedder = SimpleEmbedding(dim=10)
        
        vec1 = embedder.embed("Hello")
        vec2 = embedder.embed("World")
        
        self.assertNotEqual(vec1, vec2)


class TestAutoSummarizer(unittest.TestCase):
    """測試自動摘要"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.temp_dir) / "test_recall.db"
        self.recall = RecallMemory(str(self.db_path))
        self.summarizer = AutoSummarizer(recall_memory=self.recall)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir)
    
    def test_extract_preferences(self):
        """測試提取偏好"""
        from memory.recall_memory import Message
        
        messages = [
            Message(session_id="test", role="user", content="I like Python"),
            Message(session_id="test", role="user", content="I love coding")
        ]
        
        preferences = self.summarizer._extract_preferences(messages)
        
        self.assertIsInstance(preferences, list)
    
    def test_extract_facts(self):
        """測試提取事實"""
        from memory.recall_memory import Message
        
        messages = [
            Message(session_id="test", role="user", content="My name is John"),
        ]
        
        facts = self.summarizer._extract_facts(messages)
        
        self.assertIsInstance(facts, list)


class TestMemoryManager(unittest.TestCase):
    """測試記憶管理器"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.workspace = Path(self.temp_dir)
        
        # 創建核心記憶檔案
        (self.workspace / "SOUL.md").write_text("# SOUL\nTest")
        (self.workspace / "USER.md").write_text("# USER\nTest")
        (self.workspace / "MEMORY.md").write_text("# MEMORY\nTest")
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir)
    
    def test_init(self):
        """測試初始化"""
        manager = MemoryManager(workspace_path=str(self.workspace))
        
        self.assertIsNotNone(manager.core)
        self.assertIsNotNone(manager.recall)
        self.assertIsNotNone(manager.archival)
    
    def test_add_message(self):
        """測試添加消息"""
        manager = MemoryManager(workspace_path=str(self.workspace))
        
        msg_id = manager.add_message("test-session", "user", "Hello")
        
        self.assertIsInstance(msg_id, int)
        self.assertGreater(msg_id, 0)
    
    def test_get_full_context(self):
        """測試獲取完整上下文"""
        manager = MemoryManager(workspace_path=str(self.workspace))
        
        context = manager.get_full_context("test-session")
        
        self.assertIsInstance(context, MemoryContext)
        self.assertIn("CORE MEMORY", context.core_prompt)
    
    def test_format_context_for_llm(self):
        """測試格式化上下文"""
        manager = MemoryManager(workspace_path=str(self.workspace))
        context = manager.get_full_context("test-session")
        
        messages = manager.format_context_for_llm(context)
        
        self.assertIsInstance(messages, list)
        self.assertEqual(messages[0]['role'], 'system')


class TestIntegration(unittest.TestCase):
    """整合測試"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.workspace = Path(self.temp_dir)
        
        (self.workspace / "SOUL.md").write_text("# SOUL\nI am an AI assistant")
        (self.workspace / "USER.md").write_text("# USER\nUser likes Python")
        (self.workspace / "MEMORY.md").write_text("# MEMORY\nPrevious learnings")
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir)
    
    def test_full_workflow(self):
        """測試完整工作流程"""
        # 創建管理器
        manager = MemoryManager(workspace_path=str(self.workspace))
        
        # 模擬對話
        session_id = "test-session-001"
        manager.add_message(session_id, "user", "Hello, I want to learn Python")
        manager.add_message(session_id, "assistant", "Great! I can help with that.")
        manager.add_message(session_id, "user", "What are the basics?")
        
        # 獲取上下文
        context = manager.get_full_context(session_id)
        self.assertGreater(len(context.recall_messages), 0)
        
        # 搜索記憶
        results = manager.search_all_memories("Python", session_id)
        self.assertIn('core_facts', results)
        self.assertIn('recall_messages', results)


def run_tests():
    """運行所有測試"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 添加所有測試類
    suite.addTests(loader.loadTestsFromTestCase(TestCoreMemory))
    suite.addTests(loader.loadTestsFromTestCase(TestRecallMemory))
    suite.addTests(loader.loadTestsFromTestCase(TestArchivalMemory))
    suite.addTests(loader.loadTestsFromTestCase(TestSimpleEmbedding))
    suite.addTests(loader.loadTestsFromTestCase(TestAutoSummarizer))
    suite.addTests(loader.loadTestsFromTestCase(TestMemoryManager))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
