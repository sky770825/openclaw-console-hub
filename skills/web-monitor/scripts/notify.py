#!/usr/bin/env python3
"""
Web Monitor Notifier - 通知發送腳本
支援：Telegram、Discord、Slack（Webhook）
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.parse
from typing import Optional

def send_telegram(message: str, chat_id: Optional[str] = None, token: Optional[str] = None):
    """發送 Telegram 通知"""
    token = token or os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = chat_id or os.getenv('TELEGRAM_CHAT_ID')
    
    if not token or not chat_id:
        print("錯誤：缺少 Telegram Token 或 Chat ID", file=sys.stderr)
        return False
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = {
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'HTML'
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status == 200
    except Exception as e:
        print(f"發送 Telegram 失敗: {e}", file=sys.stderr)
        return False

def send_discord(message: str, webhook_url: Optional[str] = None):
    """發送 Discord 通知"""
    webhook_url = webhook_url or os.getenv('DISCORD_WEBHOOK_URL')
    
    if not webhook_url:
        print("錯誤：缺少 Discord Webhook URL", file=sys.stderr)
        return False
    
    data = {
        'content': message
    }
    
    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status == 204
    except Exception as e:
        print(f"發送 Discord 失敗: {e}", file=sys.stderr)
        return False

def send_slack(message: str, webhook_url: Optional[str] = None):
    """發送 Slack 通知"""
    webhook_url = webhook_url or os.getenv('SLACK_WEBHOOK_URL')
    
    if not webhook_url:
        print("錯誤：缺少 Slack Webhook URL", file=sys.stderr)
        return False
    
    data = {
        'text': message
    }
    
    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status == 200
    except Exception as e:
        print(f"發送 Slack 失敗: {e}", file=sys.stderr)
        return False

def format_monitor_alert(monitor_name: str, url: str, diff: str, timestamp: str) -> str:
    """格式化監控變化通知"""
    return f"""🚨 <b>網頁內容變化檢測</b>

📌 <b>監控項目:</b> {monitor_name}
🔗 <b>網址:</b> {url}
🕐 <b>時間:</b> {timestamp}

📊 <b>變化摘要:</b>
{diff}

---
由 Web Monitor 自動發送"""

def main():
    parser = argparse.ArgumentParser(description='Web Monitor Notifier')
    parser.add_argument('--telegram', '-t', action='store_true', help='使用 Telegram')
    parser.add_argument('--discord', '-d', action='store_true', help='使用 Discord')
    parser.add_argument('--slack', '-s', action='store_true', help='使用 Slack')
    parser.add_argument('--message', '-m', required=True, help='通知訊息')
    parser.add_argument('--monitor-name', help='監控項目名稱（用於格式化）')
    parser.add_argument('--url', help='監控網址（用於格式化）')
    parser.add_argument('--diff', help='變化摘要（用於格式化）')
    
    args = parser.parse_args()
    
    # 如果有提供格式化參數，使用格式化模板
    if args.monitor_name and args.url:
        import datetime
        message = format_monitor_alert(
            args.monitor_name,
            args.url,
            args.diff or "內容已更新",
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
    else:
        message = args.message
    
    success = False
    
    if args.telegram:
        if send_telegram(message):
            print("✅ Telegram 通知已發送")
            success = True
        else:
            print("❌ Telegram 通知發送失敗")
    
    if args.discord:
        if send_discord(message):
            print("✅ Discord 通知已發送")
            success = True
        else:
            print("❌ Discord 通知發送失敗")
    
    if args.slack:
        if send_slack(message):
            print("✅ Slack 通知已發送")
            success = True
        else:
            print("❌ Slack 通知發送失敗")
    
    if not success:
        sys.exit(1)

if __name__ == '__main__':
    main()
