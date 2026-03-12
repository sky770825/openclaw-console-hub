#!/usr/bin/env python3
"""
Agent Supervisor 整合測試套件

測試所有核心功能：監控、診斷、修復、預測
"""

import sys
import os
import json
import time
import unittest
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.supervisor.core import SupervisorCore
from core.supervisor.strategies.fixer import AdaptiveFixer
from core.supervisor.models.predictor import Predictor
from core.supervisor.main import AgentSupervisor
from tests.supervisor.chaos_engine import ChaosEngineer

class TestSupervisorCore(unittest.TestCase):
    """測試監考官核心功能"""
    
    def setUp(self):
        self.sup = SupervisorCore()
        
    def test_metrics_collection(self):
        """測試指標蒐集"""
        metrics = self.sup.collect_metrics()
        self.assertIn('system', metrics)
        self.assertIn('api_health', metrics)
        self.assertIn('agents', metrics)
        self.assertIn('timestamp', metrics)
        
    def test_system_metrics(self):
        """測試系統指標"""
        metrics = self.sup.collect_metrics()
        self.assertIn('disk_usage', metrics['system'])
        self.assertGreaterEqual(metrics['system']['disk_usage'], 0)
        self.assertLessEqual(metrics['system']['disk_usage'], 100)
        
    def test_api_health_check(self):
        """測試 API 健康檢查"""
        health = self.sup._check_api_health()
        self.assertIn('status', health)
        self.assertIn('latency_ms', health)
        
    def test_session_analysis(self):
        """測試 Session 分析"""
        analysis = self.sup._analyze_sessions()
        self.assertIn('total_sessions', analysis)
        self.assertIsInstance(analysis['total_sessions'], int)


class TestRootCauseAnalysis(unittest.TestCase):
    """測試根因分析 (RCA)"""
    
    def setUp(self):
        self.sup = SupervisorCore()
        
    def test_rca_api_timeout(self):
        """測試 API 超時 RCA"""
        incident = {
            "api_health": {"status": "timeout", "latency_ms": 5000},
            "system": {"disk_usage": 50},
            "agents": {"failed": 0},
            "simulations": {"api_timeout": {"latency_ms": 5000}}
        }
        analysis = self.sup.analyze_incident(incident)
        self.assertIn('root_cause', analysis)
        self.assertIn('timeout', analysis['root_cause'].lower())
        self.assertEqual(analysis['suggested_action'], 'restart_service')
        
    def test_rca_disk_full(self):
        """測試磁碟滿 RCA"""
        incident = {
            "api_health": {"status": "up", "latency_ms": 100},
            "system": {"disk_usage": 95},
            "agents": {"failed": 0},
            "simulations": {"disk_full": {"usage_pct": 95}}
        }
        analysis = self.sup.analyze_incident(incident)
        self.assertIn('disk', analysis['root_cause'].lower())
        self.assertEqual(analysis['suggested_action'], 'clear_temp_files')
        
    def test_rca_agent_loop(self):
        """測試 Agent 循環 RCA"""
        incident = {
            "api_health": {"status": "up", "latency_ms": 100},
            "system": {"disk_usage": 50},
            "agents": {"failed": 0},
            "simulations": {"agent_loop": {"tool_calls": 100}}
        }
        analysis = self.sup.analyze_incident(incident)
        self.assertIn('loop', analysis['root_cause'].lower())
        
    def test_rca_unknown(self):
        """測試未知異常 RCA"""
        incident = {
            "api_health": {"status": "up", "latency_ms": 50},
            "system": {"disk_usage": 30},
            "agents": {"failed": 0}
        }
        analysis = self.sup.analyze_incident(incident)
        self.assertIn('unknown', analysis['root_cause'].lower())


class TestAdaptiveFixer(unittest.TestCase):
    """測試自適應修復策略"""
    
    def setUp(self):
        self.fixer = AdaptiveFixer()
        
    def test_strategy_selection_restart(self):
        """測試重啟策略選擇"""
        analysis = {
            "root_cause": "API timeout due to high load",
            "severity": "high"
        }
        strategy = self.fixer.select_strategy(analysis)
        self.assertEqual(strategy, "restart_service")
        
    def test_strategy_selection_cleanup(self):
        """測試清理策略選擇"""
        analysis = {
            "root_cause": "Disk space critically low",
            "severity": "critical"
        }
        strategy = self.fixer.select_strategy(analysis)
        self.assertEqual(strategy, "clear_temp_files")
        
    def test_strategy_selection_notify(self):
        """測試通知策略選擇"""
        analysis = {
            "root_cause": "Unknown error",
            "severity": "medium"
        }
        strategy = self.fixer.select_strategy(analysis)
        self.assertEqual(strategy, "notify_admin")


class TestPredictor(unittest.TestCase):
    """測試故障預測"""
    
    def setUp(self):
        self.predictor = Predictor()
        
    def test_predict_no_data(self):
        """測試無數據時的預測"""
        # 暫時移動數據文件
        backup = None
        if os.path.exists(self.predictor.metrics_path):
            backup = self.predictor.metrics_path + '.bak'
            os.rename(self.predictor.metrics_path, backup)
            
        try:
            prediction = self.predictor.predict_failure()
            self.assertIn('risk', prediction)
            self.assertEqual(prediction['risk'], 'none')
        finally:
            if backup:
                os.rename(backup, self.predictor.metrics_path)


class TestChaosEngineering(unittest.TestCase):
    """測試混沌工程 (故障注入)"""
    
    def setUp(self):
        self.chaos = ChaosEngineer()
        self.sup = SupervisorCore()
        
    def tearDown(self):
        """清理測試標記"""
        self.chaos.cleanup()
        
    def test_chaos_api_timeout(self):
        """測試 API 超時模擬"""
        result = self.chaos.inject('api_timeout')
        self.assertTrue(result['injected'])
        
        # 驗證監考官能檢測到
        metrics = self.sup.collect_metrics()
        self.assertIn('api_timeout', metrics['simulations'])
        
    def test_chaos_disk_full(self):
        """測試磁碟滿模擬"""
        result = self.chaos.inject('disk_full')
        self.assertTrue(result['injected'])
        
        metrics = self.sup.collect_metrics()
        self.assertIn('disk_full', metrics['simulations'])
        
    def test_chaos_agent_loop(self):
        """測試 Agent 循環模擬"""
        result = self.chaos.inject('agent_loop')
        self.assertTrue(result['injected'])
        
        metrics = self.sup.collect_metrics()
        self.assertIn('agent_loop', metrics['simulations'])


class TestIntegration(unittest.TestCase):
    """整合測試 - 驗證端到端流程"""
    
    def setUp(self):
        self.sup = SupervisorCore()
        self.supervisor = AgentSupervisor()
        self.fixer = AdaptiveFixer()
        self.chaos = ChaosEngineer()
        
    def tearDown(self):
        self.chaos.cleanup()
        
    def test_full_pipeline_api_timeout(self):
        """測試完整處理流程: API 超時"""
        print("\n[Integration] Testing API timeout scenario...")
        
        # 1. 注入故障
        self.chaos.inject('api_timeout')
        
        # 2. 蒐集指標
        metrics = self.sup.collect_metrics()
        self.assertTrue(self.supervisor._is_abnormal(metrics))
        
        # 3. 根因分析
        analysis = self.sup.analyze_incident(metrics)
        self.assertIn('timeout', analysis['root_cause'].lower())
        
        # 4. 選擇策略
        strategy = self.fixer.select_strategy(analysis)
        self.assertEqual(strategy, 'restart_service')
        
        print("  ✓ Pipeline completed successfully")
        
    def test_full_pipeline_disk_full(self):
        """測試完整處理流程: 磁碟滿"""
        print("\n[Integration] Testing disk full scenario...")
        
        # 1. 注入故障
        self.chaos.inject('disk_full')
        
        # 2. 蒐集指標
        metrics = self.sup.collect_metrics()
        self.assertTrue(self.supervisor._is_abnormal(metrics))
        
        # 3. 根因分析
        analysis = self.sup.analyze_incident(metrics)
        self.assertIn('disk', analysis['root_cause'].lower())
        
        # 4. 選擇策略
        strategy = self.fixer.select_strategy(analysis)
        self.assertEqual(strategy, 'clear_temp_files')
        
        print("  ✓ Pipeline completed successfully")


def run_all_tests():
    """運行所有測試並輸出報告"""
    print("=" * 60)
    print("Agent Supervisor Test Suite")
    print("=" * 60)
    
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 添加測試類
    suite.addTests(loader.loadTestsFromTestCase(TestSupervisorCore))
    suite.addTests(loader.loadTestsFromTestCase(TestRootCauseAnalysis))
    suite.addTests(loader.loadTestsFromTestCase(TestAdaptiveFixer))
    suite.addTests(loader.loadTestsFromTestCase(TestPredictor))
    suite.addTests(loader.loadTestsFromTestCase(TestChaosEngineering))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 輸出摘要
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.wasSuccessful():
        print("\n✅ All tests passed!")
        return 0
    else:
        print("\n❌ Some tests failed")
        return 1


if __name__ == '__main__':
    sys.exit(run_all_tests())
