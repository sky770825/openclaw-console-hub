#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import re
import subprocess
import os

# 顏色定義
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
CYAN = '\033[0;36m'
RED = '\033[0;31m'
NC = '\033[0m'

# 意圖映射表 (Intent Mapping Table)
# 模式匹配優先級由上至下
INTENT_PATTERNS = [
    {
        "intent": "plan",
        "patterns": [
            r"(?:幫我|請)?(?:規劃|拆解|計畫|安排)(?:任務)?[:：\s]*(.*)",
            r"(?:如何|怎麼)(?:做|完成|處理)[:：\s]*(.*)",
            r"plan\s+(.*)"
        ],
        "cmd": "plan"
    },
    {
        "intent": "recall",
        "patterns": [
            r"(?:幫我|請)?(?:查|找|搜尋|檢索|召回|問|回想)(?:關於)?[:：\s]*(.*)",
            r"(.*)\s*(?:是甚麼|是什麼|怎麼辦|在哪裡|有哪些)",
            r"recall\s+(.*)"
        ],
        "cmd": "recall"
    },
    {
        "intent": "ls",
        "patterns": [
            r"(?:幫我|請)?(?:列出|顯示|看下?)(?:所有)?(?:任務|工作|清單|列表)",
            r"(?:任務|工作|清單|列表)(?:有哪些|狀態)",
            r"ls",
            r"list"
        ],
        "cmd": "ls"
    },
    {
        "intent": "add",
        "patterns": [
            r"(?:幫我|請)?(?:新增|建立|加上|增加)(?:任務|工作|todo)[:：\s]*(.*)",
            r"add\s+(.*)"
        ],
        "cmd": "add"
    },
    {
        "intent": "run",
        "patterns": [
            r"(?:幫我|請)?(?:開始|執行|啟動|跑|run)(?:任務|ID)?[:：\s]*(\d+)",
            r"run\s+(\d+)"
        ],
        "cmd": "run"
    },
    {
        "intent": "done",
        "patterns": [
            r"(?:幫我|請)?(?:完成|結束|關閉|標記完成)(?:任務|RunID|ID)?[:：\s]*(\d+)",
            r"done\s+(\d+)"
        ],
        "cmd": "done"
    },
    {
        "intent": "check",
        "patterns": [
            r"(?:幫我|請)?(?:檢查|查看|偵測|巡檢)(?:系統|資源|負載|狀態|現場)",
            r"check",
            r"status",
            r"detect"
        ],
        "cmd": "check"
    },
    {
        "intent": "notion",
        "patterns": [
            r"(?:幫我|請)?(?:同步|傳送|儲存)到\s?Notion[:：\s]*(.*)",
            r"(?:幫我|請)?(?:找|查|搜尋)Notion(?:連結)?[:：\s]*(.*)",
            r"notion\s+(.*)"
        ],
        "cmd": "notion"
    }
]

def parse_natural_language(text):
    text = text.strip()
    for entry in INTENT_PATTERNS:
        for pattern in entry["patterns"]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groups()
                args = list(groups) if groups else []
                # 清理空參數或純標點
                args = [arg.strip() for arg in args if arg and arg.strip()]
                return entry["cmd"], args
    return None, []

def main():
    if len(sys.argv) < 2:
        print(f"{CYAN}OpenClaw 自然語言介面已就緒。請輸入指令。{NC}")
        return

    raw_input = " ".join(sys.argv[1:])
    cmd, args = parse_natural_language(raw_input)

    if not cmd:
        # 如果無法解析，退回到原始的 oc.sh 處理或報錯
        print(f"{YELLOW}無法解析自然語言指令，嘗試作為原始命令執行...{NC}")
        # 在實際整合中，這裡會直接呼叫 oc.sh 原本的邏輯
        sys.exit(2)

    # 執行指令映射
    script_dir = os.path.dirname(os.path.realpath(__file__))
    oc_script = os.path.join(script_dir, "oc.sh")
    
    # 建構執行指令
    full_cmd = [oc_script, cmd] + args
    
    print(f"{GREEN}>>> [解析成功] 意圖: {cmd}, 參數: {args}{NC}")
    
    try:
        subprocess.run(full_cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"{RED}執行失敗: {e}{NC}")
        sys.exit(1)

if __name__ == "__main__":
    main()
