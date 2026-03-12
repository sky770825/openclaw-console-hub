import json
import os
import time
import subprocess
from datetime import datetime

class ChaosEngineer:
    """故障注入引擎，用於測試 Supervisor 的應對能力"""
    
    SCENARIOS = {
        "api_timeout": {
            "description": "API 響應超時 (模擬服務過載)",
            "severity": "high"
        },
        "disk_full": {
            "description": "磁碟空間不足警報",
            "severity": "critical"
        },
        "agent_loop": {
            "description": "Agent 陷入無限循環",
            "severity": "medium"
        },
        "tool_failure": {
            "description": "工具調用反覆失敗",
            "severity": "high"
        },
        "network_partition": {
            "description": "網路連線中斷",
            "severity": "critical"
        }
    }
    
    def __init__(self):
        self.workspace = os.environ.get('OPENCLAW_WORKSPACE', os.path.expanduser('~/.openclaw/workspace'))
        self.simulation_log = os.path.join(self.workspace, 'logs/chaos_simulations.jsonl')
        
    def inject(self, scenario_name):
        """注入指定故障場景"""
        if scenario_name not in self.SCENARIOS:
            raise ValueError(f"Unknown scenario: {scenario_name}")
            
        scenario = self.SCENARIOS[scenario_name]
        print(f"🧪 Injecting chaos: {scenario_name} - {scenario['description']}")
        
        # 記錄故障注入
        self._log_simulation(scenario_name, "injected")
        
        # 執行對應的模擬動作
        method = getattr(self, f"_simulate_{scenario_name}", None)
        if method:
            return method()
        return {"status": "simulated", "scenario": scenario_name}
    
    def _simulate_api_timeout(self):
        """模擬 API 超時 - 建立一個延遲標記"""
        marker_file = os.path.join(self.workspace, '.simulation_api_timeout')
        with open(marker_file, 'w') as f:
            f.write(json.dumps({"timestamp": datetime.now().isoformat(), "latency_ms": 5000}))
        return {"injected": True, "marker": marker_file}
    
    def _simulate_disk_full(self):
        """模擬磁碟滿 - 創建大檔案或標記"""
        marker_file = os.path.join(self.workspace, '.simulation_disk_full')
        with open(marker_file, 'w') as f:
            f.write(json.dumps({"timestamp": datetime.now().isoformat(), "usage_pct": 95}))
        return {"injected": True, "marker": marker_file}
    
    def _simulate_agent_loop(self):
        """模擬 Agent 循環 - 創建虛假 session 膨脹標記"""
        marker_file = os.path.join(self.workspace, '.simulation_agent_loop')
        with open(marker_file, 'w') as f:
            f.write(json.dumps({
                "timestamp": datetime.now().isoformat(),
                "tool_calls": 100,
                "web_searches": 15,
                "session_size_kb": 350
            }))
        return {"injected": True, "marker": marker_file}
    
    def _simulate_tool_failure(self):
        """模擬工具失敗 - 標記 tool_call 錯誤模式"""
        marker_file = os.path.join(self.workspace, '.simulation_tool_failure')
        with open(marker_file, 'w') as f:
            f.write(json.dumps({
                "timestamp": datetime.now().isoformat(),
                "failed_tools": ["web_search", "browser"],
                "error_rate": 0.8
            }))
        return {"injected": True, "marker": marker_file}
    
    def _simulate_network_partition(self):
        """模擬網路中斷"""
        marker_file = os.path.join(self.workspace, '.simulation_network_partition')
        with open(marker_file, 'w') as f:
            f.write(json.dumps({
                "timestamp": datetime.now().isoformat(),
                "disconnected_services": ["n8n", "api"]
            }))
        return {"injected": True, "marker": marker_file}
    
    def cleanup(self, scenario_name=None):
        """清理故障模擬標記"""
        if scenario_name:
            marker = os.path.join(self.workspace, f'.simulation_{scenario_name}')
            if os.path.exists(marker):
                os.remove(marker)
                print(f"🧹 Cleaned up: {scenario_name}")
        else:
            # 清理所有模擬標記
            for f in os.listdir(self.workspace):
                if f.startswith('.simulation_'):
                    os.remove(os.path.join(self.workspace, f))
                    print(f"🧹 Cleaned up: {f}")
    
    def _log_simulation(self, scenario, action):
        os.makedirs(os.path.dirname(self.simulation_log), exist_ok=True)
        with open(self.simulation_log, 'a') as f:
            f.write(json.dumps({
                "timestamp": datetime.now().isoformat(),
                "scenario": scenario,
                "action": action
            }) + '\n')
    
    def list_scenarios(self):
        """列出所有可用場景"""
        return self.SCENARIOS

if __name__ == "__main__":
    ce = ChaosEngineer()
    print("Available chaos scenarios:")
    for name, info in ce.list_scenarios().items():
        print(f"  - {name}: {info['description']} [{info['severity']}]")
