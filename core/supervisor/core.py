import os
import json
import time
import requests
from datetime import datetime

class SupervisorCore:
    """Agent 監考官核心模組
    
    負責監控系統、Agent 狀態，執行根因分析和觸發修復
    """
    
    def __init__(self, workspace_path=None):
        self.workspace = workspace_path or os.environ.get('OPENCLAW_WORKSPACE', os.path.expanduser('~/.openclaw/workspace'))
        self.api_base = os.environ.get('OPENCLAW_API_BASE', 'http://localhost:3011')
        self.metrics_log = os.path.join(self.workspace, 'logs/supervisor_metrics.jsonl')
        self.incident_log = os.path.join(self.workspace, 'logs/supervisor_incidents.jsonl')
        
        # 異常檢測閾值
        self.thresholds = {
            "disk_critical": 90,
            "disk_warning": 80,
            "api_latency_ms": 2000,
            "session_size_kb": 500,
            "tool_error_rate": 0.5,
            "failed_tasks_ratio": 0.2
        }

    def collect_metrics(self):
        """蒐集系統與 Agent 指標"""
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "system": self._get_system_metrics(),
            "agents": self._get_agent_metrics(),
            "api_health": self._check_api_health(),
            "simulations": self._detect_simulations()  # 檢測測試場景
        }
        self._save_log(self.metrics_log, metrics)
        return metrics

    def _get_system_metrics(self):
        """獲取系統資源使用情況"""
        try:
            import psutil
            return {
                "disk_usage": psutil.disk_usage(self.workspace).percent,
                "memory_usage": psutil.virtual_memory().percent,
                "cpu_percent": psutil.cpu_percent(interval=1),
                "load_avg": os.getloadavg() if hasattr(os, 'getloadavg') else [0,0,0]
            }
        except ImportError:
            # Fallback without psutil
            return {
                "disk_usage": self._get_disk_usage(),
                "memory_usage": 0,
                "cpu_percent": 0,
                "load_avg": [0,0,0]
            }

    def _get_disk_usage(self):
        try:
            st = os.statvfs(self.workspace)
            return (st.f_blocks - st.f_bavail) / st.f_blocks * 100
        except:
            return 0

    def _get_agent_metrics(self):
        """監控 Agent 內部狀態"""
        metrics = {
            "total_tasks": 0,
            "running": 0,
            "failed": 0,
            "completed": 0,
            "avg_duration": 0,
            "session_analysis": self._analyze_sessions()
        }
        
        try:
            resp = requests.get(f"{self.api_base}/api/tasks", timeout=5)
            tasks = resp.json()
            if isinstance(tasks, dict):
                tasks = tasks.get('tasks', tasks.get('data', []))
            
            metrics["total_tasks"] = len(tasks)
            metrics["running"] = len([t for t in tasks if t.get('status') == 'running'])
            metrics["failed"] = len([t for t in tasks if t.get('status') == 'failed'])
            metrics["completed"] = len([t for t in tasks if t.get('status') == 'done'])
            
            # 計算平均執行時間
            durations = []
            for t in tasks:
                if t.get('startedAt') and t.get('completedAt'):
                    try:
                        from datetime import datetime
                        start = datetime.fromisoformat(t['startedAt'].replace('Z', '+00:00'))
                        end = datetime.fromisoformat(t['completedAt'].replace('Z', '+00:00'))
                        durations.append((end - start).total_seconds())
                    except:
                        pass
            if durations:
                metrics["avg_duration"] = sum(durations) / len(durations)
                
        except Exception as e:
            metrics["error"] = str(e)
        
        return metrics

    def _analyze_sessions(self):
        """分析 Agent Session 狀態 (檢測自幹行為)"""
        sessions_dir = os.path.join(self.workspace, '.openclaw/agents/main/sessions')
        analysis = {
            "total_sessions": 0,
            "bloating_sessions": [],
            "tool_heavy_sessions": [],
            "search_heavy_sessions": []
        }
        
        if not os.path.exists(sessions_dir):
            return analysis
            
        for f in os.listdir(sessions_dir):
            if not f.endswith('.jsonl'):
                continue
            analysis["total_sessions"] += 1
            filepath = os.path.join(sessions_dir, f)
            
            try:
                size = os.path.getsize(filepath)
                if size > self.thresholds["session_size_kb"] * 1024:
                    analysis["bloating_sessions"].append({"file": f, "size_kb": size/1024})
                
                # 分析工具調用
                with open(filepath, 'r') as fp:
                    content = fp.read()
                    tool_count = content.count('"toolCall"')
                    search_count = content.count('"web_search"') + content.count('"brave_search"')
                    
                    if tool_count > 50:
                        analysis["tool_heavy_sessions"].append({"file": f, "tool_count": tool_count})
                    if search_count > 10:
                        analysis["search_heavy_sessions"].append({"file": f, "search_count": search_count})
            except:
                pass
        
        return analysis

    def _check_api_health(self):
        """檢查 API 健康狀態"""
        try:
            start = time.time()
            resp = requests.get(f"{self.api_base}/health", timeout=5)
            latency = (time.time() - start) * 1000
            return {
                "status": "up" if resp.status_code == 200 else "degraded",
                "latency_ms": latency,
                "status_code": resp.status_code
            }
        except requests.Timeout:
            return {"status": "timeout", "latency_ms": 5000, "status_code": 0}
        except Exception as e:
            return {"status": "down", "latency_ms": 0, "status_code": 0, "error": str(e)}

    def _detect_simulations(self):
        """檢測是否有模擬的故障場景 (用於測試)"""
        simulations = {}
        for f in os.listdir(self.workspace):
            if f.startswith('.simulation_'):
                scenario = f.replace('.simulation_', '')
                try:
                    with open(os.path.join(self.workspace, f), 'r') as fp:
                        simulations[scenario] = json.load(fp)
                except:
                    simulations[scenario] = {"detected": True}
        return simulations

    def analyze_incident(self, incident_data):
        """實作根因分析 (RCA)
        
        使用多層分析：
        1. 規則引擎快速匹配
        2. AI 輔助分析 (未來可整合 LLM)
        """
        findings = {
            "timestamp": datetime.now().isoformat(),
            "input_summary": self._summarize_incident(incident_data),
            "root_cause": None,
            "severity": "low",
            "confidence": 0.0,
            "suggested_action": None,
            "related_metrics": {}
        }
        
        # 規則引擎分析
        findings = self._rule_based_analysis(incident_data, findings)
        
        # AI 增強分析 (簡化版，實際可呼叫 LLM)
        findings = self._ai_enhanced_analysis(incident_data, findings)
        
        # 記錄事件
        self._save_log(self.incident_log, findings)
        
        return findings

    def _summarize_incident(self, data):
        """簡要概括異常資料"""
        summary = []
        if data.get('api_health', {}).get('status') != 'up':
            summary.append(f"API {data['api_health']['status']}")
        if data.get('system', {}).get('disk_usage', 0) > self.thresholds['disk_warning']:
            summary.append(f"Disk {data['system']['disk_usage']:.1f}%")
        if data.get('agents', {}).get('failed', 0) > 0:
            summary.append(f"{data['agents']['failed']} failed tasks")
        return "; ".join(summary) if summary else "No obvious anomalies"

    def _rule_based_analysis(self, data, findings):
        """基於規則的根因分析"""
        api_health = data.get('api_health', {})
        system = data.get('system', {})
        agents = data.get('agents', {})
        simulations = data.get('simulations', {})
        
        # 檢查安全模擬
        if 'security_vuln' in simulations:
            findings.update({
                "root_cause": "Security vulnerability detected (simulated)",
                "severity": "high",
                "confidence": 0.98,
                "suggested_action": "security_auto_fix",
                "related_metrics": {
                    "cve_id": simulations['security_vuln'].get('cve_id', 'CVE-2026-0001'),
                    "file_path": simulations['security_vuln'].get('file_path', 'app.py')
                }
            })
            return findings

        # 檢查模擬場景
        if 'api_timeout' in simulations:
            findings.update({
                "root_cause": "API timeout due to high load (simulated)",
                "severity": "high",
                "confidence": 0.95,
                "suggested_action": "restart_service",
                "related_metrics": {"simulation": simulations['api_timeout']}
            })
            return findings
            
        if 'disk_full' in simulations:
            findings.update({
                "root_cause": "Disk space critically low (simulated)",
                "severity": "critical",
                "confidence": 0.95,
                "suggested_action": "clear_temp_files",
                "related_metrics": {"simulation": simulations['disk_full']}
            })
            return findings
            
        if 'agent_loop' in simulations:
            findings.update({
                "root_cause": "Agent stuck in infinite loop (simulated)",
                "severity": "medium",
                "confidence": 0.9,
                "suggested_action": "notify_admin",
                "related_metrics": {"simulation": simulations['agent_loop']}
            })
            return findings
        
        # 真實場景規則
        if api_health.get('status') == 'timeout' or api_health.get('latency_ms', 0) > self.thresholds['api_latency_ms']:
            findings.update({
                "root_cause": "API latency degradation",
                "severity": "high",
                "confidence": 0.85,
                "suggested_action": "restart_service",
                "related_metrics": {"latency_ms": api_health.get('latency_ms')}
            })
        elif system.get('disk_usage', 0) > self.thresholds['disk_critical']:
            findings.update({
                "root_cause": "Disk space critically low",
                "severity": "critical",
                "confidence": 0.9,
                "suggested_action": "clear_temp_files",
                "related_metrics": {"disk_usage": system.get('disk_usage')}
            })
        elif agents.get('session_analysis', {}).get('bloating_sessions'):
            findings.update({
                "root_cause": "Agent session bloating detected",
                "severity": "medium",
                "confidence": 0.8,
                "suggested_action": "notify_admin",
                "related_metrics": {"bloated_sessions": len(agents['session_analysis']['bloating_sessions'])}
            })
        elif agents.get('failed', 0) > 0:
            ratio = agents.get('failed', 0) / max(agents.get('total_tasks', 1), 1)
            if ratio > self.thresholds['failed_tasks_ratio']:
                findings.update({
                    "root_cause": "High task failure rate",
                    "severity": "high",
                    "confidence": 0.75,
                    "suggested_action": "rollback_config",
                    "related_metrics": {"failure_rate": ratio}
                })
        
        return findings

    def _ai_enhanced_analysis(self, data, findings):
        """AI 增強分析 (簡化版，可擴展為 LLM 呼叫)"""
        if findings.get('root_cause') is None:
            # 無法確定根因，標記為需要人工介入
            findings.update({
                "root_cause": "Unknown - requires manual investigation",
                "severity": "medium",
                "confidence": 0.3,
                "suggested_action": "notify_admin",
                "ai_note": "Pattern not recognized by rule engine, consider training data"
            })
        return findings

    def _save_log(self, file_path, data):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'a') as f:
            f.write(json.dumps(data, default=str) + '\n')

    def get_incident_history(self, limit=10):
        """獲取最近的異常事件"""
        if not os.path.exists(self.incident_log):
            return []
        incidents = []
        with open(self.incident_log, 'r') as f:
            for line in f:
                try:
                    incidents.append(json.loads(line))
                except:
                    pass
        return incidents[-limit:]

if __name__ == "__main__":
    sup = SupervisorCore()
    print(json.dumps(sup.collect_metrics(), indent=2))
