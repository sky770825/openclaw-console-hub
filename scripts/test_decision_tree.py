import unittest
import os
import json
import shutil
from scripts.decision_tree import DecisionTreeManager

class TestDecisionTree(unittest.TestCase):
    def setUp(self):
        self.test_dir = "memory/decisions_test"
        if not os.path.exists(self.test_dir):
            os.makedirs(self.test_dir)
        # Patching the directory for testing
        import scripts.decision_tree
        scripts.decision_tree.DECISION_DIR = self.test_dir
        self.manager = DecisionTreeManager("test-session")

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_log_and_generate(self):
        d_id = self.manager.log_decision(
            task="Test Task",
            thinking_data={"understanding": "Test Thinking", "category": "簡單", "sop_ref": "SOP-15"},
            options=[{"id": "A", "description": "Opt A", "reason": "R", "risk": "No"}],
            selected_option_id="A",
            rationale="Best",
            intervention_required=True
        )
        md = self.manager.generate_markdown(d_id)
        self.assertIn("Test Task", md)
        self.assertIn("Opt A", md)
        self.assertIn("等待老蔡介入", md)

    def test_intervention_approve(self):
        d_id = self.manager.log_decision(
            task="Test", thinking_data={}, options=[], selected_option_id="A", rationale="R", intervention_required=True
        )
        self.manager.apply_intervention(d_id, "y")
        with open(os.path.join(self.test_dir, f"test-session_{d_id}.json"), 'r') as f:
            data = json.load(f)
            self.assertEqual(data['intervention']['status'], "approved")

    def test_intervention_modify(self):
        d_id = self.manager.log_decision(
            task="Test", thinking_data={}, options=[], selected_option_id="A", rationale="R", intervention_required=True
        )
        self.manager.apply_intervention(d_id, "改用方案 C")
        with open(os.path.join(self.test_dir, f"test-session_{d_id}.json"), 'r') as f:
            data = json.load(f)
            self.assertEqual(data['intervention']['status'], "modified")
            self.assertEqual(data['intervention']['user_input'], "改用方案 C")

if __name__ == "__main__":
    unittest.main()
