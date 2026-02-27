#!/usr/bin/env python3
"""
記憶記錄 HTTP 服務器
供 n8n 工作流程記錄任務完成狀態到小蔡記憶系統
"""

import json
import subprocess
import os
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

WORKSPACE = os.path.expanduser("~/.openclaw/workspace")
COMPLETION_HANDLER = os.path.join(WORKSPACE, "scripts/task-completion-handler.sh")
PORT = 8765  # 記憶記錄服務器端口

# Telegram 配置
TELEGRAM_BOT_TOKEN = os.environ.get("CAIJ_N8N_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = "5819565005"


def send_telegram_notification(task_name, status, summary, assignee="系統", subagent_model="Gemini 2.5 Flash", task_details=None):
    """發送 Telegram 通知（豐富格式）"""
    status_emoji = {
        "成功": "✅",
        "完成": "✅",
        "失敗": "❌",
        "錯誤": "❌",
        "警告": "⚠️",
        "進行中": "🔄"
    }.get(status, "📋")
    
    # 解析摘要為 bullet points（如果包含 • 或 -）
    summary_lines = []
    for line in summary.split('\n'):
        line = line.strip()
        if line and not line.startswith('http'):
            if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                summary_lines.append(f"  {line}")
            else:
                summary_lines.append(f"  • {line}")
    
    formatted_summary = '\n'.join(summary_lines) if summary_lines else f"  • {summary}"
    
    # 豐富格式訊息
    message = f"""🤖 <b>n8n 系統事件通知</b>

📋 <b>任務</b>: {task_name}
{status_emoji} <b>狀態</b>: {status}
👤 <b>執行者</b>: {assignee}
🧠 <b>子代理模型</b>: {subagent_model}
⏰ <b>時間</b>: {datetime.now().strftime('%Y-%m-%d %H:%M')}

📝 <b>重點摘要</b>:
{formatted_summary}"""
    
    # 如果有任務詳情，添加流程驗證區塊
    if task_details and isinstance(task_details, list):
        message += "\n\n✨ <b>執行流程</b>:"
        for i, detail in enumerate(task_details, 1):
            check = "✅" if detail.get("done") else "⏳"
            msg = detail.get("msg", "")
            message += f"\n  {check} {i}. {msg}"
    
    # 添加詳細資訊連結（如果摘要中有檔案路徑）
    result_links = []
    for line in summary.split('\n'):
        if 'RESULT.md' in line or 'runPath' in line:
            result_links.append(line.strip())
    
    if result_links:
        message += "\n\n🔗 <b>詳細資訊</b>:"
        for link in result_links:
            clean_link = link.replace('runPath/', '~/.openclaw/workspace/runs/')
            message += f"\n  📄 {clean_link}"
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = json.dumps({
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            return result.get("ok", False)
    except Exception as e:
        print(f"[警告] Telegram 通知發送失敗: {e}")
        return False

class MemoryRecordHandler(BaseHTTPRequestHandler):
    """處理記憶記錄請求"""

    def log_message(self, format, *args):
        """自定義日誌格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")

    def do_POST(self):
        """處理 POST 請求"""
        parsed_path = urlparse(self.path)

        if parsed_path.path != "/record":
            self.send_error(404, "Not Found")
            return

        try:
            # 讀取請求內容
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)

            # 驗證必要欄位
            required_fields = ['taskName', 'status', 'summary']
            missing_fields = [f for f in required_fields if f not in data]

            if missing_fields:
                self.send_error(400, f"Missing required fields: {', '.join(missing_fields)}")
                return

            # 提取參數
            task_name = data['taskName']
            status = data['status']
            summary = data['summary']
            task_id = data.get('taskId', '')
            assignee = data.get('assignee', 'n8n workflow')

            # 構建命令
            cmd = [
                COMPLETION_HANDLER,
                task_name,
                status,
                summary
            ]

            if task_id:
                cmd.extend(['--task-id', task_id])

            if assignee:
                cmd.extend(['--assignee', assignee])

            # 執行完成處理器
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False
            )

            # 提取可選參數
            subagent_model = data.get('subagentModel', 'Gemini 2.5 Flash')
            task_details = data.get('taskDetails', None)
            
            # 發送 Telegram 通知
            telegram_sent = send_telegram_notification(task_name, status, summary, assignee, subagent_model, task_details)
            if telegram_sent:
                print(f"[Telegram] 通知已發送: {task_name}")

            # 返回結果
            if result.returncode == 0:
                response = {
                    'success': True,
                    'message': '記憶記錄成功',
                    'taskName': task_name,
                    'status': status
                }
                self.send_response(200)
            else:
                response = {
                    'success': False,
                    'message': '記憶記錄失敗',
                    'error': result.stderr
                }
                self.send_response(500)

            # 發送響應
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))

        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, str(e))

    def do_GET(self):
        """處理 GET 請求（健康檢查）"""
        if self.path == "/health":
            response = {
                'status': 'ok',
                'service': 'OpenClaw Memory Record Server',
                'version': '1.0'
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        elif self.path == "/":
            # 顯示使用說明
            usage = f"""
<!DOCTYPE html>
<html>
<head>
    <title>OpenClaw Memory Record Server</title>
    <style>
        body {{ font-family: monospace; padding: 20px; max-width: 800px; margin: 0 auto; }}
        h1 {{ color: #2c3e50; }}
        pre {{ background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }}
        .endpoint {{ color: #27ae60; font-weight: bold; }}
        .method {{ color: #e74c3c; font-weight: bold; }}
    </style>
</head>
<body>
    <h1>🧠 OpenClaw Memory Record Server</h1>
    <p>供 n8n 工作流程記錄任務完成狀態</p>

    <h2>端點</h2>

    <h3><span class="method">POST</span> <span class="endpoint">/record</span></h3>
    <p>記錄任務完成狀態到小蔡記憶系統</p>

    <h4>請求格式：</h4>
    <pre>{{
  "taskName": "任務名稱",
  "status": "成功|失敗|警告|完成",
  "summary": "任務摘要",
  "taskId": "task-123",           // 可選
  "assignee": "n8n workflow",     // 可選
  "subagentModel": "Gemini 2.5 Flash",  // 可選
  "taskDetails": [                // 可選 - 執行流程詳情
    {{"done": true, "msg": "步驟1完成"}},
    {{"done": true, "msg": "步驟2完成"}},
    {{"done": false, "msg": "步驟3進行中"}}
  ]
}}</pre>

    <h4>範例（簡潔版）：</h4>
    <pre>curl -X POST http://localhost:{PORT}/record \\
  -H "Content-Type: application/json" \\
  -d '{{
    "taskName": "每日摘要生成",
    "status": "成功",
    "summary": "生成摘要並發送到 Telegram",
    "assignee": "n8n Daily Summary Workflow"
  }}'</pre>

    <h4>範例（豐富格式版）：</h4>
    <pre>curl -X POST http://localhost:{PORT}/record \\
  -H "Content-Type: application/json" \\
  -d '{{
    "taskName": "🧪 Autopilot 流程測試",
    "status": "完成",
    "summary": "任務拉取機制驗證完成\\n記錄系統正常寫入\\nTelegram 通知鏈路暢通",
    "assignee": "小蔡指派(指揮)",
    "subagentModel": "Gemini 2.5 Flash",
    "taskDetails": [
      {{"done": true, "msg": "從任務板成功拉取任務"}},
      {{"done": true, "msg": "子代理執行任務邏輯"}},
      {{"done": true, "msg": "執行結果寫入 RESULT.md"}},
      {{"done": true, "msg": "Telegram 通知發送成功"}}
    ]
  }}'</pre>

    <h3><span class="method">GET</span> <span class="endpoint">/health</span></h3>
    <p>健康檢查</p>

    <hr>
    <p>版本: 1.0 | OpenClaw Powered</p>
</body>
</html>
            """
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(usage.encode('utf-8'))
        else:
            self.send_error(404, "Not Found")

    def do_OPTIONS(self):
        """處理 CORS 預檢請求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


def run_server(port=PORT):
    """啟動服務器"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, MemoryRecordHandler)

    print(f"🧠 OpenClaw Memory Record Server")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"✅ 服務器啟動於端口 {port}")
    print(f"📝 端點: http://localhost:{port}/record")
    print(f"💚 健康檢查: http://localhost:{port}/health")
    print(f"📖 使用說明: http://localhost:{port}/")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"按 Ctrl+C 停止服務器")
    print("")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 服務器已停止")
        httpd.server_close()


if __name__ == "__main__":
    import sys

    # 檢查參數
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"錯誤: 無效的端口號 '{sys.argv[1]}'")
            sys.exit(1)

    # 啟動服務器
    run_server(port)
