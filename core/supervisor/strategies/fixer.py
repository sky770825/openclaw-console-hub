import json
import os

class AdaptiveFixer:
    def __init__(self):
        self.history_file = 'logs/fix_history.jsonl'
        self.strategies = {
            "restart_service": self._restart_service,
            "clear_temp_files": self._clear_temp_files,
            "notify_admin": self._notify_admin,
            "rollback_config": self._rollback_config,
            "security_auto_fix": self._security_auto_fix
        }

    def select_strategy(self, analysis):
        """根據 RCA 結果選擇修復策略"""
        cause = analysis.get('root_cause', '').lower()
        severity = analysis.get('severity', 'low')

        if 'security' in cause or 'vulnerability' in cause:
            return "security_auto_fix"
        if 'timeout' in cause or 'unreachable' in cause:
            return "restart_service"
        if 'disk' in cause or 'space' in cause:
            return "clear_temp_files"
        if severity == 'critical':
            return "notify_admin"
        
        return "notify_admin" # Default

    def execute(self, strategy_name, context=None):
        print(f"Executing repair strategy: {strategy_name}")
        if strategy_name in self.strategies:
            if strategy_name == "security_auto_fix" and context:
                success = self.strategies[strategy_name](context)
            else:
                success = self.strategies[strategy_name]()
            self._log_fix(strategy_name, success)
            return success
        return False

    def _security_auto_fix(self, context):
        """整合 oc security auto-fix"""
        file_path = context.get('file_path')
        cve_id = context.get('cve_id', 'GENERIC')
        
        if not file_path:
            return False
            
        print(f"  [Security] Calling auto-fix for {file_path} ({cve_id})")
        # 呼叫現有的 auto-security main.py
        import subprocess
        try:
            cmd = ["python3", "core/auto-security/main.py", file_path, cve_id]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print(f"  [Security] Auto-fix success: {result.stdout.splitlines()[-1]}")
                return True
            else:
                print(f"  [Security] Auto-fix failed: {result.stderr}")
                return False
        except Exception as e:
            print(f"  [Security] Error executing auto-fix: {e}")
            return False

    def _restart_service(self):
        # 模擬呼叫 scripts/self-heal.sh 或 docker restart
        return True

    def _clear_temp_files(self):
        # 模擬清理 archive/ orphaned
        return True

    def _notify_admin(self):
        # 模擬發送 Telegram
        return True

    def _rollback_config(self):
        return True

    def _log_fix(self, strategy, success):
        os.makedirs('logs', exist_ok=True)
        with open(self.history_file, 'a') as f:
            f.write(json.dumps({"strategy": strategy, "success": success, "timestamp": "..."}) + '\n')
