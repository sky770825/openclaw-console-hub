#!/usr/bin/env python3
"""
OpenClaw CLI Python 輔助模組
用於處理複雜的資料處理邏輯
"""

import sys
import json
import os
from datetime import datetime
from pathlib import Path

TASKS_DIR = Path.home() / ".openclaw" / "tasks"
CONFIG_DIR = Path.home() / ".config" / "oc"


def load_task(task_file):
    """載入任務檔案"""
    try:
        with open(task_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        return None


def format_status(status):
    """格式化狀態顯示"""
    status_colors = {
        'pending': '\033[33m',    # Yellow
        'running': '\033[34m',    # Blue
        'completed': '\033[32m',  # Green
        'failed': '\033[31m',     # Red
        'stopped': '\033[35m',    # Magenta
    }
    reset = '\033[0m'
    color = status_colors.get(status, '')
    return f"{color}{status}{reset}"


def cmd_tasks(args):
    """處理 tasks 指令的複雜邏輯"""
    limit = 20
    status_filter = None
    
    # 解析參數
    i = 0
    while i < len(args):
        if args[i] in ('--limit', '-l') and i + 1 < len(args):
            limit = int(args[i + 1])
            i += 2
        elif args[i] in ('--status', '-s') and i + 1 < len(args):
            status_filter = args[i + 1]
            i += 2
        else:
            i += 1
    
    # 收集任務
    tasks = []
    if TASKS_DIR.exists():
        for task_file in sorted(TASKS_DIR.glob("*.json"), reverse=True)[:limit]:
            task = load_task(task_file)
            if task:
                task['_file'] = task_file
                tasks.append(task)
    
    # 統計
    stats = {'total': len(tasks), 'pending': 0, 'running': 0, 'completed': 0, 'failed': 0}
    for task in tasks:
        status = task.get('status', 'unknown')
        if status in stats:
            stats[status] += 1
    
    # 輸出統計
    print(f"\n總計: {stats['total']} | 等待: {stats['pending']} | 執行: {stats['running']} | 完成: {stats['completed']} | 失敗: {stats['failed']}\n")
    
    # 輸出表頭
    print(f"{'時間':<24} {'Agent':<15} {'狀態':<12} {'任務'}")
    print(f"{'-'*24} {'-'*15} {'-'*12} {'-'*30}")
    
    # 輸出任務
    for task in tasks:
        status = task.get('status', 'unknown')
        
        if status_filter and status != status_filter:
            continue
        
        task_id = task.get('task_id', task['_file'].stem)[:20]
        agent = task.get('agent', 'unknown')[:15]
        desc = task.get('description', '')[:30]
        
        # 取得檔案時間
        try:
            mtime = datetime.fromtimestamp(task['_file'].stat().st_mtime)
            time_str = mtime.strftime('%Y-%m-%d %H:%M:%S')
        except:
            time_str = 'unknown'
        
        print(f"{time_str:<24} {agent:<15} {format_status(status):<12} {desc}")
    
    print()


def cmd_models(args):
    """處理 models 指令的複雜邏輯"""
    # 定義模型配置
    models_config = {
        'kimi/kimi-k2.5': {'name': '月之暗面 K2.5', 'env': 'KIMI_API_KEY'},
        'gpt-4o': {'name': 'OpenAI GPT-4o', 'env': 'OPENAI_API_KEY'},
        'gpt-4o-mini': {'name': 'OpenAI GPT-4o Mini', 'env': 'OPENAI_API_KEY'},
        'claude-3-5-sonnet': {'name': 'Anthropic Claude 3.5', 'env': 'ANTHROPIC_API_KEY'},
        'claude-3-opus': {'name': 'Anthropic Claude 3 Opus', 'env': 'ANTHROPIC_API_KEY'},
        'grok/grok-4.1': {'name': 'xAI Grok 4.1', 'env': 'XAI_API_KEY'},
        'gemini-2.0-flash': {'name': 'Google Gemini Flash', 'env': 'GOOGLE_API_KEY'},
        'ollama/llama3': {'name': 'Ollama Llama 3', 'env': None},
    }
    
    available_only = '--available' in args or '-a' in args
    detail = '--detail' in args or '-d' in args
    
    # 檢查各模型狀態
    print(f"\n{'模型 ID':<25} {'名稱':<25} {'狀態':<12} {'備註'}")
    print(f"{'-'*25} {'-'*25} {'-'*12} {'-'*30}")
    
    for model_id, config in models_config.items():
        env_var = config.get('env')
        
        # 檢查可用性
        if model_id == 'ollama/llama3':
            # 檢查 ollama 是否運行
            import subprocess
            try:
                result = subprocess.run(['pgrep', '-x', 'ollama'], 
                                      capture_output=True, timeout=1)
                status = 'available' if result.returncode == 0 else 'offline'
            except:
                status = 'unknown'
        elif env_var and os.environ.get(env_var):
            status = 'available'
        else:
            status = 'unconfigured'
        
        if available_only and status != 'available':
            continue
        
        name = config['name']
        note = '預設' if model_id == 'kimi/kimi-k2.5' else ''
        if status == 'unconfigured' and env_var:
            note = f'需設定 {env_var}'
        elif status == 'offline':
            note = '需啟動 Ollama'
        
        status_formatted = format_status(status)
        
        print(f"{model_id:<25} {name:<25} {status_formatted:<12} {note}")
    
    print()


def main():
    if len(sys.argv) < 2:
        print("Usage: python helper.py <command> [args...]")
        sys.exit(1)
    
    command = sys.argv[1]
    args = sys.argv[2:]
    
    if command == 'tasks':
        cmd_tasks(args)
    elif command == 'models':
        cmd_models(args)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == '__main__':
    main()
