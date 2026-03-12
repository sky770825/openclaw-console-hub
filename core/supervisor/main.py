import time
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.supervisor.core import SupervisorCore
from core.supervisor.strategies.fixer import AdaptiveFixer
from core.supervisor.models.predictor import Predictor

class AgentSupervisor:
    """Agent 監考官主控制器
    
    協調監控、預測、診斷、修復四大功能模組
    """
    
    def __init__(self, config=None):
        self.config = config or {}
        self.core = SupervisorCore()
        self.fixer = AdaptiveFixer()
        self.predictor = Predictor()
        self.interval = self.config.get('interval', 60)  # 監控間隔秒數
        self.running = False
        self.alert_handlers = []
        
    def register_alert_handler(self, handler):
        """註冊告警處理器"""
        self.alert_handlers.append(handler)
        
    def run_loop(self, iterations=None):
        """主運行迴圈"""
        self.running = True
        count = 0
        print(f"🤖 Agent Supervisor v1.0 started at {datetime.now().isoformat()}")
        print(f"   Monitoring interval: {self.interval}s")
        print(f"   Workspace: {self.core.workspace}")
        print("-" * 50)
        
        try:
            while self.running:
                iteration_start = time.time()
                self._run_single_iteration()
                
                count += 1
                if iterations and count >= iterations:
                    print(f"\n✅ Completed {iterations} iterations")
                    break
                    
                # 計算剩餘等待時間
                elapsed = time.time() - iteration_start
                sleep_time = max(0, self.interval - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)
                    
        except KeyboardInterrupt:
            print("\n🛑 Supervisor stopped by user")
            self.running = False

    def _run_single_iteration(self):
        """執行單次監控迭代"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 1. 蒐集指標
        print(f"\n[{timestamp}] Collecting metrics...")
        metrics = self.core.collect_metrics()
        
        # 輸出關鍵指標
        print(f"  System: Disk {metrics['system'].get('disk_usage', 0):.1f}%")
        print(f"  API: {metrics['api_health'].get('status', 'unknown')} ({metrics['api_health'].get('latency_ms', 0):.0f}ms)")
        print(f"  Agents: {metrics['agents'].get('running', 0)} running, {metrics['agents'].get('failed', 0)} failed")
        
        # 2. 故障預測
        prediction = self.predictor.predict_failure()
        if prediction['risk'] != 'low':
            print(f"  ⚠️  PREDICTION ALERT: {prediction['reason']} [Risk: {prediction['risk']}]")
            self._send_alert('prediction', prediction)

        # 3. 異常偵測與 RCA
        if self._is_abnormal(metrics):
            print("  ❌ ANOMALY DETECTED! Triggering RCA...")
            analysis = self.core.analyze_incident(metrics)
            
            print(f"     Root Cause: {analysis['root_cause']}")
            print(f"     Severity: {analysis['severity'].upper()}")
            print(f"     Confidence: {analysis['confidence']*100:.0f}%")
            print(f"     Suggested Action: {analysis['suggested_action']}")
            
            self._send_alert('incident', analysis)

            # 4. 自適應修復 (僅在設定允許時)
            if self.config.get('auto_fix', False) and analysis.get('suggested_action'):
                print(f"  🔧 Auto-fix enabled, executing: {analysis['suggested_action']}")
                
                # 準備 Context (如果是安全漏洞)
                context = {}
                if analysis['suggested_action'] == "security_auto_fix":
                    context = {
                        "file_path": analysis.get('related_metrics', {}).get('file_path'),
                        "cve_id": analysis.get('related_metrics', {}).get('cve_id')
                    }
                
                success = self.fixer.execute(analysis['suggested_action'], context=context)
                if success:
                    print("     ✓ Fix applied successfully")
                else:
                    print("     ✗ Fix failed, notifying admin")
                    self._send_alert('fix_failed', analysis)

    def _is_abnormal(self, metrics):
        """判斷是否異常"""
        # API 狀態
        if metrics['api_health']['status'] not in ['up', 'ok']:
            return True
            
        # 磁碟空間
        if metrics['system'].get('disk_usage', 0) > 90:
            return True
            
        # Agent 任務失敗
        if metrics['agents'].get('failed', 0) > 0:
            return True
            
        # Session 膨脹
        sessions = metrics['agents'].get('session_analysis', {})
        if sessions.get('bloating_sessions'):
            return True
            
        # 模擬場景
        if metrics.get('simulations'):
            return True
            
        return False

    def _send_alert(self, alert_type, data):
        """發送告警"""
        for handler in self.alert_handlers:
            try:
                handler(alert_type, data)
            except Exception as e:
                print(f"  Alert handler error: {e}")
                
    def run_diagnostic(self):
        """執行一次性診斷"""
        print("🔍 Running diagnostic scan...")
        metrics = self.core.collect_metrics()
        
        issues = []
        
        # 檢查各項指標
        if metrics['api_health']['status'] != 'up':
            issues.append(f"API status: {metrics['api_health']['status']}")
        if metrics['system'].get('disk_usage', 0) > 80:
            issues.append(f"Disk usage: {metrics['system']['disk_usage']:.1f}%")
        if metrics['agents'].get('failed', 0) > 0:
            issues.append(f"Failed tasks: {metrics['agents']['failed']}")
            
        sessions = metrics['agents'].get('session_analysis', {})
        if sessions.get('bloating_sessions'):
            issues.append(f"Bloating sessions: {len(sessions['bloating_sessions'])}")
            
        if issues:
            print("  ⚠️  Issues found:")
            for issue in issues:
                print(f"     - {issue}")
        else:
            print("  ✅ All systems nominal")
            
        return len(issues) == 0, issues

    def stop(self):
        """停止監控"""
        self.running = False
        print("🛑 Supervisor stopping...")

# 簡易告警處理器
def console_alert_handler(alert_type, data):
    """輸出告警到控制台"""
    print(f"  [ALERT:{alert_type.upper()}] {json.dumps(data, default=str)[:100]}...")

def main():
    """命令行入口"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Agent Supervisor - Agentic AIOps')
    parser.add_argument('--loop', action='store_true', help='Run continuous monitoring loop')
    parser.add_argument('--iterations', type=int, default=None, help='Number of iterations (for testing)')
    parser.add_argument('--interval', type=int, default=60, help='Monitoring interval in seconds')
    parser.add_argument('--diagnostic', action='store_true', help='Run one-time diagnostic')
    parser.add_argument('--auto-fix', action='store_true', help='Enable automatic fixes')
    
    args = parser.parse_args()
    
    config = {
        'interval': args.interval,
        'auto_fix': args.auto_fix
    }
    
    supervisor = AgentSupervisor(config)
    supervisor.register_alert_handler(console_alert_handler)
    
    if args.diagnostic:
        supervisor.run_diagnostic()
    elif args.loop or args.iterations:
        supervisor.run_loop(iterations=args.iterations)
    else:
        # 默認執行一次診斷
        supervisor.run_diagnostic()

if __name__ == "__main__":
    main()
