# P0 [結晶化] 技能結晶化 (Skill Crystallization)

## 1. 核心目標 (Core Objective)

將一次性、高風險的 run_script 操作，轉化為標準化、可複用、經過驗證的「技能」。
從「每次都重新發明輪子」進化為「擁有一個可擴充的軍火庫」。

## 2. 為什麼要做 (Why)

- 效率 (Efficiency): 遇到重複問題時，直接調用技能，而不是重寫腳本。
- 穩定性 (Stability): 技能經過驗證，減少了臨時腳本出錯的風險。
- 可組合性 (Composability): 技能可以像樂高一樣組合，完成更複雜的任務。
- 奠定基礎 (Foundation): 為「免疫系統」（審計技能）和「經濟體」（為技能定價）提供基礎單元。

## 3. 設計草案 v0.1 (Draft Design)

### 3.1 技能結構

每個技能都是一個目錄，存放於 /Users/sky770825/.openclaw/workspace/skills/<技能名>/，包含：
- skill.json: 技能清單檔，定義名稱、描述、參數、權限等。
- run.sh: 技能執行檔，接收參數並執行主要邏輯。
- README.md: 技能說明文件。

### 3.2 執行方式

新增一個 skill run action:
{"action": "skill run", "name": "...", "params": {"key": "value"}}

### 3.3 範例：一個「檔案驗證」技能

- 目錄: skills/verify-file/
- skill.json: {"name": "verify-file", "description": "四層驗證一個檔案是否存在且有效", "params": ["path"]}
- run.sh:
  ``bash
  #!/bin/bash
  path=$1
  # ... 執行 cookbook/15 的四層驗證邏輯 ...
  echo '{"status": "success", "message": "File is valid."}'
  `

## 4. 下一步 (Next Steps)

1.  與統帥確認此設計方向。
2.  實作第一個 PoC (Proof-of-Concept) 技能。
3.  在 OpenClaw Server 中實現 skill run` action 的後端邏輯。