import unittest
import os
import json
from core.supervisor.core import SupervisorCore
from core.supervisor.strategies.fixer import AdaptiveFixer
from core.supervisor.models.predictor import Predictor

class TestSupervisor(unittest.TestCase):
    def setUp(self):
        self.sup = SupervisorCore()
        self.fixer = AdaptiveFixer()
        self.predictor = Predictor()

    def test_metrics_collection(self):
        metrics = self.sup.collect_metrics()
        self.assertIn('system', metrics)
        self.assertIn('api_health', metrics)

    def test_rca_logic(self):
        incident = {"api_health": {"status": "down"}}
        analysis = self.sup.analyze_incident(incident)
        self.assertEqual(analysis['suggested_action'], 'restart_service')

    def test_fixer_selection(self):
        analysis = {"root_cause": "disk full", "severity": "high"}
        strategy = self.fixer.select_strategy(analysis)
        self.assertEqual(strategy, "clear_temp_files")

    def test_predictor_no_data(self):
        # 確保在沒有日誌時不會 crash
        if os.path.exists('logs/supervisor_metrics.jsonl'):
            os.rename('logs/supervisor_metrics.jsonl', 'logs/supervisor_metrics.jsonl.bak')
        
        prediction = self.predictor.predict_failure()
        self.assertEqual(prediction['risk'], 'none')

        if os.path.exists('logs/supervisor_metrics.jsonl.bak'):
            os.rename('logs/supervisor_metrics.jsonl.bak', 'logs/supervisor_metrics.jsonl')

if __name__ == '__main__':
    unittest.main()
