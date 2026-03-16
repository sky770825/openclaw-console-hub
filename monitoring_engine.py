#!/usr/bin/env python3
"""
監控引擎模組 - 提供系統和服務監控功能
可被 Bot 呼叫用於定時檢查和狀態回報
"""

import subprocess
import sys
import re
import os
from datetime import datetime
from typing import Dict, List, Tuple, Optional


class MonitoringEngine:
    """系統監控引擎，檢查各項服務狀態"""
    
    def __init__(self):
        self.last_check = None
        self.last_results = {}
    
    def check_gateway(self) -> Tuple[bool, str]:
        """檢查 OpenClaw Gateway 狀態 - 改進版，包含實際 HTTP 健康檢查"""
        try:
            # 首先檢查 CLI 狀態
            result = subprocess.run(
                ["openclaw", "gateway", "status"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            output = result.stdout.lower()
            
            # 檢查是否正在監聽（實際運作中）
            is_listening = "listening" in output
            is_running = "running" in output or "active" in output or "正在執行" in output
            is_stopped = "stopped" in output or "inactive" in output or "not loaded" in output
            
            # 嘗試實際 HTTP 連線測試
            http_ok = False
            try:
                import requests
                # 嘗試連線到 Gateway 健康檢查端點
                for url in ["http://localhost:18789/health", "http://localhost:18789/status", "http://127.0.0.1:18789/"]:
                    try:
                        resp = requests.get(url, timeout=3)
                        if resp.status_code == 200:
                            http_ok = True
                            break
                    except:
                        continue
            except:
                pass
            
            # 綜合判斷
            if http_ok:
                return True, "✅ Gateway 運行中 (HTTP 連線正常)"
            elif is_listening:
                return True, "✅ Gateway 正在監聽端口"
            elif is_running:
                return True, "✅ Gateway 服務運行中"
            elif is_stopped:
                return False, "⚠️ Gateway 已停止"
            else:
                # 無法確定狀態，嘗試端口檢測
                return self._check_gateway_port()
                
        except FileNotFoundError:
            return False, "❌ openclaw 指令不存在"
        except subprocess.TimeoutExpired:
            return False, "❌ Gateway 檢查逾時"
        except Exception as e:
            # 出錯時嘗試端口檢測作為備用
            return self._check_gateway_port()
    
    def _check_gateway_port(self) -> Tuple[bool, str]:
        """透過檢查端口來判斷 Gateway 狀態"""
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            result = sock.connect_ex(('localhost', 18789))
            sock.close()
            
            if result == 0:
                return True, "✅ Gateway 端口 18789 可連線"
            else:
                return False, "⚠️ Gateway 端口 18789 無回應"
        except Exception as e:
            return False, f"❌ 無法檢測 Gateway 端口: {str(e)[:30]}"
    
    def check_seekdb(self) -> Tuple[bool, str]:
        """檢查 SeekDB Docker 容器狀態"""
        required = os.getenv("SEEKDB_REQUIRED", "").strip().lower() in {"1", "true", "yes", "on"}
        try:
            result = subprocess.run(
                ["docker", "ps", "--filter", "name=seekdb", "--format", "{{.Names}}\t{{.Status}}"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                output = result.stdout.strip()
                if not output:
                    if required:
                        return False, "⚠️ SeekDB 未運行（SEEKDB_REQUIRED=1）"
                    return None, "ℹ️ SeekDB 未啟用（未發現 seekdb 容器）"

                first_line = output.splitlines()[0]
                parts = first_line.split("\t", 1)
                name = parts[0].strip() if parts else "seekdb"
                status = parts[1].strip() if len(parts) > 1 else first_line

                if status.startswith("Up"):
                    return True, f"✅ SeekDB 運行中（{name}: {status}）"
                else:
                    return False, f"⚠️ SeekDB 狀態異常（{name}: {status[:50]}）"
            if required:
                return False, "❌ SeekDB 檢查失敗"
            return None, "ℹ️ SeekDB 狀態未知（Docker 回傳非 0）"
        except FileNotFoundError:
            if required:
                return False, "❌ docker 指令不存在（SEEKDB_REQUIRED=1）"
            return None, "ℹ️ Docker 不可用，略過 SeekDB 檢查"
        except subprocess.TimeoutExpired:
            if required:
                return False, "❌ SeekDB 檢查逾時（SEEKDB_REQUIRED=1）"
            return None, "ℹ️ SeekDB 檢查逾時，已略過"
        except Exception as e:
            if required:
                return False, f"❌ SeekDB 檢查錯誤: {str(e)[:50]}"
            return None, f"ℹ️ SeekDB 檢查略過: {str(e)[:50]}"
    
    def check_ollama(self) -> Tuple[bool, str]:
        """檢查 Ollama 服務狀態"""
        try:
            import requests
            result = requests.get("http://127.0.0.1:11434/api/tags", timeout=5)
            if result.status_code == 200:
                data = result.json()
                models = data.get("models", [])
                model_count = len(models)
                return True, f"✅ Ollama 運行中 ({model_count} 個模型)"
            return False, f"⚠️ Ollama 回應異常: HTTP {result.status_code}"
        except requests.exceptions.ConnectionError:
            return False, "❌ Ollama 無法連線"
        except requests.exceptions.Timeout:
            return False, "❌ Ollama 連線逾時"
        except Exception as e:
            return False, f"❌ Ollama 檢查錯誤: {str(e)[:50]}"
    
    def check_docker_space(self) -> Tuple[bool, str]:
        """檢查 Docker 磁碟使用情況"""
        required = os.getenv("DOCKER_SPACE_REQUIRED", "").strip().lower() in {"1", "true", "yes", "on"}
        try:
            result = subprocess.run(
                ["docker", "system", "df"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                output = result.stdout
                # 解析磁碟使用量
                lines = output.strip().split('\n')
                for line in lines:
                    if 'Images' in line or 'images' in line:
                        parts = line.split()
                        if len(parts) >= 4:
                            size = parts[3]
                            return True, f"📊 Docker Images: {size}"
                return True, "✅ Docker 系統正常"
            if required:
                return False, "❌ Docker 空間檢查失敗（DOCKER_SPACE_REQUIRED=1）"
            return None, "ℹ️ Docker 空間狀態未知（Docker 回傳非 0）"
        except FileNotFoundError:
            if required:
                return False, "❌ docker 指令不存在（DOCKER_SPACE_REQUIRED=1）"
            return None, "ℹ️ Docker 不可用，略過空間檢查"
        except subprocess.TimeoutExpired:
            if required:
                return False, "❌ Docker 空間檢查逾時（DOCKER_SPACE_REQUIRED=1）"
            return None, "ℹ️ Docker 空間檢查逾時，已略過"
        except Exception as e:
            if required:
                return False, f"❌ Docker 空間檢查錯誤: {str(e)[:50]}"
            return None, f"ℹ️ Docker 空間檢查略過: {str(e)[:50]}"
    
    def check_system_load(self) -> Tuple[bool, str]:
        """檢查系統負載"""
        try:
            cpu_count = max(os.cpu_count() or 1, 1)
            warn_ratio = float(os.getenv("SYSTEM_LOAD_WARN_RATIO", "1.2"))
            crit_ratio = float(os.getenv("SYSTEM_LOAD_CRIT_RATIO", "1.8"))
            if crit_ratio < warn_ratio:
                crit_ratio = warn_ratio

            def assess_load(load: float) -> Tuple[bool, str]:
                ratio = load / cpu_count
                if ratio >= crit_ratio:
                    return False, f"⚠️ 系統負載過高: {load:.2f}（{cpu_count} 核，ratio={ratio:.2f}）"
                if ratio >= warn_ratio:
                    return True, f"🟡 系統負載偏高: {load:.2f}（{cpu_count} 核，ratio={ratio:.2f}）"
                return True, f"✅ 系統負載正常: {load:.2f}（{cpu_count} 核，ratio={ratio:.2f}）"

            if sys.platform == "darwin":  # macOS
                result = subprocess.run(
                    ["uptime"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    output = result.stdout.strip()
                    # 解析 load average
                    match = re.search(r'load averages?:\s*([\d.]+)', output, re.IGNORECASE)
                    if match:
                        load = float(match.group(1))
                        return assess_load(load)
                    return True, f"✅ {output[:50]}"
            else:  # Linux
                with open('/proc/loadavg', 'r') as f:
                    load = float(f.read().split()[0])
                    return assess_load(load)
        except Exception as e:
            return None, f"ℹ️ 無法檢查系統負載: {str(e)[:30]}"
    
    def check_disk_space(self) -> Tuple[bool, str]:
        """檢查磁碟空間"""
        try:
            result = subprocess.run(
                ["df", "-h", "/"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                if len(lines) >= 2:
                    # 解析 df 輸出
                    parts = lines[1].split()
                    if len(parts) >= 5:
                        used_percent = parts[4].replace('%', '')
                        available = parts[3]
                        used = int(used_percent)
                        
                        if used >= 95:
                            return False, f"🔴 磁碟空間嚴重不足: {used}% 已使用，可用 {available}"
                        elif used >= 90:
                            return False, f"🟠 磁碟空間不足: {used}% 已使用，可用 {available}"
                        elif used >= 80:
                            return True, f"🟡 磁碟空間偏低: {used}% 已使用，可用 {available}"
                        else:
                            return True, f"✅ 磁碟空間正常: {used}% 已使用，可用 {available}"
                
                return True, f"✅ 磁碟檢查: {result.stdout.strip()[:50]}"
            return False, f"❌ 磁碟檢查失敗: {result.stderr.strip()[:50]}"
        except Exception as e:
            return False, f"❌ 磁碟檢查錯誤: {str(e)[:50]}"
    
    def run_all_checks(self) -> Dict[str, Tuple[bool, str]]:
        """執行所有檢查並返回結果"""
        self.last_check = datetime.now()
        results = {
            "gateway": self.check_gateway(),
            "seekdb": self.check_seekdb(),
            "ollama": self.check_ollama(),
            "docker_space": self.check_docker_space(),
            "system_load": self.check_system_load(),
        }
        self.last_results = results
        return results
    
    def get_problems(self, results: Optional[Dict] = None) -> List[Tuple[str, str]]:
        """從檢查結果中找出問題項目"""
        if results is None:
            results = self.last_results
        problems = []
        for service, (ok, msg) in results.items():
            if ok is False:  # 明確的 False 表示有問題
                problems.append((service, msg))
        return problems
    
    def format_report(self, results: Optional[Dict] = None) -> str:
        """格式化檢查報告"""
        if results is None:
            results = self.last_results
        
        lines = ["📊 系統狀態報告", f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ""]
        
        service_names = {
            "gateway": "🔄 Gateway",
            "seekdb": "🗄️ SeekDB",
            "ollama": "🦙 Ollama",
            "docker_space": "🐳 Docker",
            "system_load": "💻 系統負載"
        }
        
        for service, (ok, msg) in results.items():
            name = service_names.get(service, service)
            lines.append(f"{name}: {msg}")
        
        problems = self.get_problems(results)
        if problems:
            lines.append("")
            lines.append(f"⚠️ 發現 {len(problems)} 個問題需要處理")
        else:
            lines.append("")
            lines.append("✅ 所有服務運行正常")
        
        return "\n".join(lines)


# 全域實例
monitoring_engine = MonitoringEngine()


if __name__ == "__main__":
    import sys
    # 測試模式
    print("🔍 執行系統監控檢查...\n")
    results = monitoring_engine.run_all_checks()
    print(monitoring_engine.format_report(results))
    
    problems = monitoring_engine.get_problems(results)
    if problems:
        print(f"\n⚠️ 發現 {len(problems)} 個問題:")
        for service, msg in problems:
            print(f"  - {service}: {msg}")
