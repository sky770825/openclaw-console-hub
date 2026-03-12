#!/usr/bin/env python3
"""
模型切換測試腳本 - 帶自動重連機制
如果切換測試時掉線，5秒內自動接回繼續試錯
"""
import os
import sys
import time
import subprocess
from pathlib import Path

# 設定
MODELS_TO_TEST = [
    "kimi/kimi-k2.5",           # 預設模型
    "anthropic/claude-opus-4-6", # Anthropic 模型
]
MAX_RETRIES = 3
RECONNECT_DELAY = 5  # 5秒內重連

def run_openclaw_command(model, retries=0):
    """執行 OpenClaw 命令，失敗時自動重連"""
    cmd = f'openclaw session_status model="{model}"'
    
    print(f"\n🔄 測試切換到: {model}")
    print(f"   執行: {cmd}")
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"✅ 切換成功: {model}")
            return True
        else:
            print(f"⚠️ 切換失敗: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        print(f"⏱️ 命令超時")
    except Exception as e:
        print(f"❌ 執行錯誤: {e}")
    
    # 自動重連機制
    if retries < MAX_RETRIES:
        retries += 1
        print(f"   {RECONNECT_DELAY}秒後自動重連 (第 {retries}/{MAX_RETRIES} 次)...")
        time.sleep(RECONNECT_DELAY)
        return run_openclaw_command(model, retries)
    else:
        print(f"   已達最大重試次數，放棄")
        return False

def test_model_switching():
    """測試模型切換流程"""
    print("=" * 50)
    print("模型切換自動測試（帶5秒重連機制）")
    print("=" * 50)
    
    results = []
    
    for model in MODELS_TO_TEST:
        success = run_openclaw_command(model)
        results.append((model, success))
        
        # 測試間隔
        if model != MODELS_TO_TEST[-1]:
            print("   等待 2 秒後切換下一個模型...")
            time.sleep(2)
    
    # 總結
    print("\n" + "=" * 50)
    print("測試結果總結:")
    print("=" * 50)
    for model, success in results:
        status = "✅ 成功" if success else "❌ 失敗"
        print(f"  {status}: {model}")
    
    # 切回預設模型
    print("\n🔄 切回預設模型...")
    run_openclaw_command(MODELS_TO_TEST[0])
    
    return all(s for _, s in results)

if __name__ == "__main__":
    success = test_model_switching()
    sys.exit(0 if success else 1)
