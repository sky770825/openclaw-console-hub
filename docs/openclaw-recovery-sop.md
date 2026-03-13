# OpenClaw 自救程序 SOP v2.0
# 流程文件化 - 由 FlowWeaver 建立
#
# 目的: 建立標準化的 OpenClaw 系統恢復流程，確保快速診斷與修復。

## 一、流程概述

當 OpenClaw 系統出現以下情況時，啟動自救程序：
- 瀏覽器/自動化工具卡住無回應
- Gateway 服務異常
- 任務板伺服器無回應
- Agent 執行異常或無回應

## 二、執行步驟

### Step 1: 初步評估 (30秒)
1. 執行 `./scripts/openclaw-recovery.sh --soft` (預設)
2. 觀察輸出，確認哪些服務有問題

### Step 2: 根據問題嚴重程度選擇模式

#### 輕微問題 (程序卡住)
- 使用 `--soft` 模式即可
- 只清理後台程序，不影響服務

#### 嚴重問題 (服務異常)
- 使用 `--hard` 模式
- 清理程序 + 重啟所有服務

#### 緊急情況
- 使用 `--force --hard` 組合
- 強制執行所有恢復步驟

### Step 3: 驗證恢復結果
1. 檢查 Gateway: `curl http://localhost:18789/health`
2. 檢查任務板: `curl http://localhost:3011/health`
3. 確認 `/status` 顯示正常

## 三、進階使用

### 查看歷史記錄
```bash
./scripts/openclaw-recovery.sh --log
```

### 自動化整合
可以在 Cron 中加入定期檢查：
```bash
# 每小時檢查一次，如果服務異常就自動恢復
*/60 * * * * /Users/sky770825/.openclaw/workspace/scripts/openclaw-recovery.sh --soft > /dev/null 2>&1
```

## 四、與專家團隊的整合

### DebugMaster 的使用場景
- 當系統診斷發現服務異常時，自動呼叫此腳本
- 將執行結果納入診斷報告

### FlowWeaver 的使用場景
- 將此流程整合到自動化工作流程
- 設定定期健康檢查與恢復機制

## 五、維護與更新

- 當新增服務或變更架構時，更新此腳本
- 定期檢查日誌，優化恢復邏輯
- 根據實際使用經驗，調整預設參數

---

*此 SOP 由 FlowWeaver 於 2026-02-12 建立，版本: v2.0*