import unittest
import os
import json
import sys

# 將當前目錄加入路徑
sys.path.append(os.getcwd())

from scripts.decision_tree import DecisionTreeManager

class TestDecisionTree(unittest.TestCase):
    def setUp(self):
        self.manager = DecisionTreeManager(session_id="test-session")
        self.decision_id = None

    def test_01_create_decision(self):
        """測試創建決策點"""
        d_id = self.manager.log_decision(
            task="單元測試任務",
            thinking_data={
                "understanding": "測試決策樹存儲",
                "category": "簡單",
                "sop_ref": "SOP-15",
                "environmental_check": "🟢 正常"
            },
            options=[
                {"id": "Test", "description": "測試方案", "reason": "無", "risk": "無"}
            ],
            selected_option_id="Test",
            rationale="這是測試"
        )
        self.assertIsNotNone(d_id)
        self.decision_id = d_id
        
        # 驗證檔案存在
        filepath = os.path.join("memory/decisions", f"{d_id}.json")
        self.assertTrue(os.path.exists(filepath))
        
        # 驗證內容
        node = self.manager.load_decision(d_id)
        self.assertEqual(node['task'], "單元測試任務")
        self.assertEqual(node['intervention']['status'], "pending")

    def test_02_markdown_generation(self):
        """測試 Markdown 生成"""
        d_id = self.manager.log_decision(
            task="Markdown 測試",
            thinking_data={"understanding": "...", "category": "中", "sop_ref": "SOP-15"},
            options=[{"id": "1", "description": "D", "reason": "R", "risk": "K"}],
            selected_option_id="1",
            rationale="Rat"
        )
        md = self.manager.generate_markdown(d_id)
        self.assertIn("# 🌳 Agent 實時決策追蹤", md)
        self.assertIn("Markdown 測試", md)
        self.assertIn("🎯 選擇方案", md)

    def test_03_intervention_approve(self):
        """測試人工介入：批准"""
        d_id = self.manager.log_decision(
            task="批准測試",
            thinking_data={"understanding": "...", "category": "中", "sop_ref": "SOP-15"},
            options=[{"id": "1", "description": "D", "reason": "R", "risk": "K"}],
            selected_option_id="1",
            rationale="Rat"
        )
        self.manager.apply_intervention(d_id, "approved", "Looks good")
        node = self.manager.load_decision(d_id)
        self.assertEqual(node['intervention']['status'], "approved")

    def test_04_intervention_correct(self):
        """測試人工介入：修正"""
        d_id = self.manager.log_decision(
            task="修正測試",
            thinking_data={"understanding": "...", "category": "中", "sop_ref": "SOP-15"},
            options=[{"id": "1", "description": "D", "reason": "R", "risk": "K"}],
            selected_option_id="1",
            rationale="Rat"
        )
        self.manager.apply_intervention(d_id, "corrected", "Use Option C instead")
        node = self.manager.load_decision(d_id)
        self.assertEqual(node['intervention']['status'], "corrected")
        self.assertEqual(node['intervention']['user_input'], "Use Option C instead")

if __name__ == "__main__":
    unittest.main()
