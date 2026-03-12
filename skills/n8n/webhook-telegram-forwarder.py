#!/usr/bin/env python3
"""
Webhook to Telegram Forwarder
当 n8n-webhook-server 收到数据时，自动转发到 Telegram
"""

import json
import time
import urllib.request
from pathlib import Path

# Config
BOT_TOKEN = "8357299731:AAHrBnVCEGjGy6b0g-3JhBArMnM9kt__Ncg"
CHAT_ID = "5819565005"
SIGNAL_FILE = Path.home() / ".openclaw" / "run" / "n8n-signal"
LOG_DIR = Path.home() / ".openclaw" / "logs" / "n8n-webhooks"

def send_telegram(message):
    """Send message to Telegram"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    data = json.dumps({
        "chat_id": CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }).encode()
    
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
        print(f"Failed to send Telegram: {e}")
        return False

def ensure_unicode(text):
    """確保文字是字串（json.loads 已自動處理 Unicode 轉義）"""
    if isinstance(text, bytes):
        return text.decode('utf-8')
    return str(text)

def format_message(data):
    """Format webhook data as Telegram message - clean & structured"""
    task_id = ensure_unicode(data.get("task_id", "unknown"))
    status = data.get("status", "unknown")
    message = ensure_unicode(data.get("message", ""))
    result = ensure_unicode(data.get("result", ""))
    
    status_emoji = "✅" if status == "success" else "❌" if status == "error" else "🔄"
    
    # 簡潔標題行
    text = f"🐣 <b>{task_id}</b> {status_emoji}\n"
    
    # 主要訊息（一行）
    if message:
        text += f"{message}\n"
    
    # 提取關鍵數據
    if result:
        result_str = str(result)
        
        # 找數字/百分比（通常是要點）
        import re
        numbers = re.findall(r'\d+%|\$[\d,]+(?:億|萬)?|\d+ (?:個|項|頁|人|月)', result_str)
        
        # 找關鍵句（含「完成」、「建立」、「整理」等）
        key_phrases = []
        for line in result_str.split('\n'):
            line = line.strip()
            if any(kw in line for kw in ['完成', '建立', '整理', '設計', '搜集', '包含', '涵蓋']):
                if len(line) < 80 and line not in key_phrases:
                    key_phrases.append(line)
                    if len(key_phrases) >= 3:
                        break
        
        # 簡短摘要
        if key_phrases:
            text += "「" + " / ".join(key_phrases[:2]) + "」"
        elif numbers:
            text += "「" + " / ".join(numbers[:3]) + "」"
    
    return text

def process_webhook(webhook_file):
    """Process a webhook file and send to Telegram"""
    try:
        with open(webhook_file) as f:
            data = json.load(f)
        
        # Extract the actual data payload
        webhook_data = data.get("data", data)
        
        message = format_message(webhook_data)
        
        if send_telegram(message):
            print(f"✅ Sent to Telegram: {webhook_file.name}")
            return True
        else:
            print(f"❌ Failed to send: {webhook_file.name}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {webhook_file}: {e}")
        return False

def watch_and_forward():
    """Watch for new webhooks and forward to Telegram"""
    print("🔄 Starting webhook to Telegram forwarder...")
    print(f"   Watching: {LOG_DIR}")
    print(f"   Target: @{CHAT_ID}")
    
    # Get list of already processed files
    processed = set()
    
    while True:
        try:
            # Check for new webhook files
            for webhook_file in LOG_DIR.glob("webhook_*.json"):
                if webhook_file.name not in processed:
                    if process_webhook(webhook_file):
                        processed.add(webhook_file.name)
            
            time.sleep(2)
            
        except KeyboardInterrupt:
            print("\n👋 Stopping...")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    watch_and_forward()
