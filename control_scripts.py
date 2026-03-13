#!/usr/bin/env python3
"""
控制腳本模組 - 提供系統控制功能
封裝各種系統操作，提供安全執行介面
"""

import subprocess
import shutil
import logging
from pathlib import Path
from typing import Tuple, List

logger = logging.getLogger(__name__)


class ControlScripts:
    """系統控制腳本集合"""
    
    def __init__(self):
        self.log_dir = Path(__file__).parent / "logs"
        self.log_dir.mkdir(exist_ok=True)
    
    def _run_command(self, command: list, timeout: int = 30, shell: bool = False) -> Tuple[bool, str]:
        """安全執行命令"""
        try:
            if shell:
                result = subprocess.run(
                    " ".join(command),
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=timeout
                )
            else:
                result = subprocess.run(
                    command,
                    capture_output=True,
                    text=True,
                    timeout=timeout
                )
            
            if result.returncode == 0:
                return True, result.stdout.strip()
            else:
                return False, f"命令失敗: {result.stderr.strip()[:200]}"
                
        except subprocess.TimeoutExpired:
            return False, f"命令逾時 ({timeout}秒)"
        except FileNotFoundError:
            return False, f"命令不存在: {command[0]}"
        except Exception as e:
            return False, f"執行錯誤: {str(e)}"
    
    def start_gateway(self) -> Tuple[bool, str]:
        """啟動 OpenClaw Gateway"""
        logger.info("執行啟動 Gateway...")
        
        # 先檢查是否已經在運行
        success, status_msg = self._run_command(["openclaw", "gateway", "status"])
        if success:
            output_lower = status_msg.lower()
            if "running" in output_lower or "active" in output_lower or "listening" in output_lower:
                return True, "Gateway 已經在運行中"
        
        # 嘗試啟動 Gateway
        # 使用 start 命令（而非 restart），並在背景執行
        success, output = self._run_command(["openclaw", "gateway", "start"])
        
        if success or "already" in output.lower():
            # 等待服務啟動（給足夠時間）
            import time
            time.sleep(5)
            
            # 驗證是否真的啟動 - 嘗試多次檢查
            for attempt in range(3):
                time.sleep(2)
                
                # 檢查狀態
                success2, status_msg2 = self._run_command(["openclaw", "gateway", "status"])
                if success2:
                    output2_lower = status_msg2.lower()
                    if "running" in output2_lower or "active" in output2_lower or "listening" in output2_lower:
                        return True, "✅ Gateway 啟動成功，服務正常運作"
                
                # 嘗試 HTTP 連線測試
                try:
                    import requests
                    resp = requests.get("http://localhost:18789/health", timeout=3)
                    if resp.status_code == 200:
                        return True, "✅ Gateway 啟動成功 (HTTP 連線正常)"
                except:
                    pass
            
            # 如果狀態檢查失敗，但命令成功，仍然認為可能成功
            return True, "Gateway 啟動命令已執行，請稍後再檢查狀態"
        else:
            return False, f"❌ Gateway 啟動失敗: {output}"
    
    def stop_gateway(self) -> Tuple[bool, str]:
        """停止 OpenClaw Gateway"""
        logger.info("執行停止 Gateway...")
        
        # 執行停止命令
        success, output = self._run_command(["openclaw", "gateway", "stop"])
        
        if success:
            import time
            time.sleep(2)
            
            # 驗證是否已停止
            success2, status_msg2 = self._run_command(["openclaw", "gateway", "status"])
            if success2:
                output2_lower = status_msg2.lower()
                if "stopped" in output2_lower or "inactive" in output2_lower or "not loaded" in output2_lower:
                    return True, "✅ Gateway 已停止"
            
            return True, "Gateway 停止命令已執行"
        else:
            return False, f"❌ Gateway 停止失敗: {output}"
    
    def restart_gateway(self) -> Tuple[bool, str]:
        """重啟 OpenClaw Gateway - 改進版：先停止再啟動"""
        logger.info("執行重啟 Gateway...")
        
        # 步驟 1: 先停止
        logger.info("步驟 1/3: 停止 Gateway...")
        stop_success, stop_msg = self.stop_gateway()
        if not stop_success:
            logger.warning(f"停止 Gateway 可能失敗: {stop_msg}")
        
        import time
        time.sleep(3)  # 等待完全停止
        
        # 步驟 2: 啟動
        logger.info("步驟 2/3: 啟動 Gateway...")
        start_success, start_msg = self.start_gateway()
        
        if start_success:
            # 步驟 3: 驗證
            logger.info("步驟 3/3: 驗證 Gateway 狀態...")
            time.sleep(3)
            
            for attempt in range(3):
                success, status_msg = self._run_command(["openclaw", "gateway", "status"])
                if success:
                    output_lower = status_msg.lower()
                    if "running" in output_lower or "active" in output_lower or "listening" in output_lower:
                        return True, "✅ Gateway 重啟成功，服務正常運作"
                
                # 嘗試 HTTP 連線
                try:
                    import requests
                    resp = requests.get("http://localhost:18789/health", timeout=3)
                    if resp.status_code == 200:
                        return True, "✅ Gateway 重啟成功 (HTTP 驗證通過)"
                except:
                    pass
                
                time.sleep(2)
            
            return True, "Gateway 重啟命令已執行，請稍後檢查狀態"
        else:
            return False, f"❌ Gateway 重啟失敗: {start_msg}"
    
    def start_seekdb(self) -> Tuple[bool, str]:
        """啟動 SeekDB 容器"""
        logger.info("執行啟動 SeekDB...")
        
        # 檢查容器是否存在
        success, output = self._run_command([
            "docker", "ps", "-a", "--filter", "name=seekdb", "--format", "{{.Names}}"
        ])
        
        if "seekdb" not in output:
            return False, "SeekDB 容器不存在，需要重新建立"
        
        # 啟動容器
        success, output = self._run_command(["docker", "start", "seekdb"])
        if success:
            # 等待服務啟動
            import time
            time.sleep(5)
            
            # 檢查容器狀態
            success2, status = self._run_command([
                "docker", "ps", "--filter", "name=seekdb", "--format", "{{.Status}}"
            ])
            if success2 and status:
                return True, f"SeekDB 啟動成功: {status}"
            else:
                return True, "SeekDB 已啟動但無法確認狀態"
        else:
            return False, f"SeekDB 啟動失敗: {output}"
    
    def restart_ollama(self) -> Tuple[bool, str]:
        """重啟 Ollama 服務"""
        logger.info("執行重啟 Ollama...")

        # 檢查是否為 macOS (launchctl)
        if shutil.which("launchctl"):
            labels_to_try = self._detect_ollama_launch_labels()
            if not labels_to_try:
                # fallback：兩種常見 label 都試一次
                labels_to_try = ["ai.ollama.serve", "com.ollama.ollama"]

            errors: List[str] = []
            restarted = []

            for label in labels_to_try:
                stop_ok, stop_msg = self._run_command(["launchctl", "stop", label])
                if not stop_ok:
                    errors.append(f"{label} stop 失敗: {stop_msg}")
                    continue

                import time
                time.sleep(1.5)
                start_ok, start_msg = self._run_command(["launchctl", "start", label])
                if start_ok:
                    restarted.append(label)
                else:
                    errors.append(f"{label} start 失敗: {start_msg}")

            if restarted and self._verify_ollama_http():
                return True, f"Ollama 重啟成功 (launchctl: {', '.join(restarted)})"

            if restarted:
                return False, f"Ollama 已重啟但 API 驗證失敗 (labels={', '.join(restarted)})"
            return False, "Ollama 重啟失敗: " + ("; ".join(errors) if errors else "未找到可用服務 label")

        # Linux 使用 systemctl
        success, output = self._run_command(["systemctl", "restart", "ollama"])
        if success:
            import time
            time.sleep(3)
            if self._verify_ollama_http():
                return True, "Ollama 重啟成功 (systemctl)"
            return False, "Ollama 已重啟但 API 驗證失敗"
        return False, f"Ollama 重啟失敗: {output}"

    def _detect_ollama_launch_labels(self) -> List[str]:
        """偵測本機目前存在的 Ollama launchd 服務 label。"""
        success, output = self._run_command(["launchctl", "list"])
        if not success:
            return []
        labels: List[str] = []
        for label in ("ai.ollama.serve", "com.ollama.ollama"):
            if label in output:
                labels.append(label)
        return labels

    def _verify_ollama_http(self) -> bool:
        """重啟後驗證 Ollama API 是否可用。"""
        try:
            import requests
            resp = requests.get("http://127.0.0.1:11434/api/tags", timeout=5)
            return resp.status_code == 200
        except Exception:
            return False
    
    def cleanup_docker(self) -> Tuple[bool, str]:
        """清理 Docker 資源"""
        logger.info("執行清理 Docker...")
        
        # 清理未使用的容器、網路、映像檔
        commands = [
            ["docker", "system", "prune", "-f"],
            ["docker", "volume", "prune", "-f"],
            ["docker", "image", "prune", "-f"]
        ]
        
        total_freed = ""
        for cmd in commands:
            success, output = self._run_command(cmd)
            if success and output:
                total_freed += output + "\n"
        
        if total_freed:
            # 計算釋放的字節數
            freed_mb = 0
            for line in total_freed.split('\n'):
                if 'MB' in line or 'GB' in line:
                    freed_mb += self._parse_size(line)
            
            if freed_mb > 0:
                return True, f"Docker 清理完成，釋放約 {freed_mb:.1f} MB 空間"
            else:
                return True, "Docker 清理完成，已移除未使用的資源"
        else:
            return True, "Docker 清理完成，沒有發現可清理的資源"
    
    def cleanup_disk(self) -> Tuple[bool, str]:
        """清理磁碟空間"""
        logger.info("執行清理磁碟...")
        
        # 清理常見的暫存目錄
        cleanup_paths = [
            Path.home() / "Downloads" / ".tmp",
            Path.home() / ".cache",
            Path("/tmp"),
            Path("/var/tmp")
        ]
        
        total_freed = 0
        messages = []
        
        # 清理 Docker（如果有的話）
        success, docker_msg = self.cleanup_docker()
        if success:
            messages.append(f"Docker: {docker_msg}")
        
        # 清理系統暫存
        if shutil.which("sudo") and shutil.which("apt"):
            # Ubuntu/Debian
            success, output = self._run_command(["sudo", "apt", "autoremove", "-y"])
            if success:
                messages.append("系統套件: 已清理自動移除的套件")
        
        return True, "\n".join(messages) if messages else "磁碟清理完成，已執行基礎清理操作"
    
    def _parse_size(self, text: str) -> float:
        """從文字解析大小（MB）"""
        import re
        
        # 尋找 MB
        mb_match = re.search(r'(\d+(?:\.\d+)?)\s*MB', text, re.IGNORECASE)
        if mb_match:
            return float(mb_match.group(1))
        
        # 尋找 GB
        gb_match = re.search(r'(\d+(?:\.\d+)?)\s*GB', text, re.IGNORECASE)
        if gb_match:
            return float(gb_match.group(1)) * 1024
        
        return 0
    
    def show_logs(self, service: str = "gateway", lines: int = 20) -> Tuple[bool, str]:
        """顯示服務日誌"""
        logger.info("顯示 %s 日誌 (%d 行)...", service, lines)
        
        log_files = {
            "gateway": LOG_DIR / "gateway.log",
            "ollama": LOG_DIR / "ollama.log",
            "monitor": LOG_DIR / "monitor.log",
            "bot": LOG_DIR / "ollama_monitor_bot.log"
        }
        
        if service not in log_files:
            return False, f"未知的服務: {service}"
        
        log_file = log_files[service]
        if not log_file.exists():
            return False, f"日誌檔案不存在: {log_file}"
        
        try:
            # 讀取最後幾行
            with open(log_file, 'r', encoding='utf-8') as f:
                lines_content = f.readlines()
            
            last_lines = lines_content[-lines:] if len(lines_content) > lines else lines_content
            log_content = ''.join(last_lines)
            
            if len(log_content) > 3500:  # Telegram 限制
                log_content = log_content[-3500:] + "\n...(已截斷)"
            
            return True, f"📋 *{service.upper()} 最近日誌*\n\n```{log_content}```"
            
        except Exception as e:
            return False, f"讀取日誌失敗: {str(e)}"


# 全域日誌目錄
LOG_DIR = Path(__file__).parent / "logs"
