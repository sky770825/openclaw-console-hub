#!/bin/bash

set -euo pipefail
# 快速補充任務池到 20+ 張
# 建立 20 個可執行任務

API_ENDPOINT="http://localhost:3011/api"
AGENT="🧑‍💻 Codex"

create_task() {
    local name="$1" problem="$2" expected="$3" criteria="$4" risk="$5" rollback="$6" source="$7"
    
    local payload=$(jq -n \
        --arg name "$name" --arg problem "$problem" --arg expected "$expected" \
        --arg criteria "$criteria" --arg risk "$risk" --arg rollback "$rollback" \
        --arg agent "$AGENT" --arg source "$source" \
        '{name: $name, description: ("## 問題\n" + $problem + "\n\n## 預期產出\n" + $expected + "\n\n## 驗收條件\n" + $criteria), status: "ready", riskLevel: $risk, rollbackPlan: $rollback, assignedAgent: $agent, source: $source, acceptanceCriteria: $criteria}')
    
    curl -s --max-time 10 -X POST "${API_ENDPOINT}/tasks" -H "Content-Type: application/json" -d "$payload" 2>/dev/null | jq -r '.id // empty'
}

echo "🚀 開始補充任務池，建立 20 個新任務..."

# ===== 內部技術優化 (8個) =====

create_task \
    "建立統一監控框架 v2" \
    "8個監控腳本有60%重複代碼，維護困難且難以擴展" \
    "建立模組化監控框架，統一介面與輸出格式" \
    "1. 建立 core/monitor.sh 核心框架 2. 將 8 個腳本改為插件形式 3. 統一輸出為 JSON 格式 4. 減少 50% 以上重複代碼" \
    "medium" "保留原腳本備份，出問題可切回" "internal-optimization"

create_task \
    "Memory 索引系統自動化" \
    "180個記憶文件無統一索引，搜尋與關聯困難" \
    "建立自動化索引系統，支援全文搜尋與標籤分類" \
    "1. 建立 memory-index.json 索引檔 2. 自動提取關鍵字與標籤 3. 建立相關性連結 4. 搜尋回應時間<1秒" \
    "low" "索引與原文件分離，不影響原檔" "internal-optimization"

create_task \
    "技能 README 補齊計畫 - Phase 1" \
    "24個技能中有6個缺少 README 文件， onboarding 困難" \
    "補齊6個技能文件，統一格式與範例" \
    "1. 盤點缺 README 的技能 2. 建立統一模板 3. 補齊6個文件 4. 加入使用範例" \
    "low" "文件修改可透過 git 還原" "internal-optimization"

create_task \
    "Cron Job 健康儀表板" \
    "30+ cron jobs 狀態分散，無法一眼看出問題" \
    "建立統一儀表板，顯示所有 job 健康狀態" \
    "1. 讀取 crons.json 與執行日誌 2. 建立 HTML/CLI 儀表板 3. 顯示成功率、錯誤、下次執行時間 4. 異常時高亮提醒" \
    "low" "停用儀表板不影響 cron 執行" "internal-optimization"

create_task \
    "自動化測試框架建立" \
    "腳本修改後無自動測試，容易引入 regression" \
    "建立 bash 腳本自動化測試框架" \
    "1. 建立 tests/ 目錄結構 2. 為 5 個核心腳本寫測試 3. 建立 CI 流程 4. PR 時自動跑測試" \
    "medium" "測試失敗不影響 production，純提醒" "internal-optimization"

create_task \
    "Log 輪替與清理機制" \
    "自動化目錄 logs/ 不斷增長，無清理機制" \
    "建立自動化 log 輪替與清理" \
    "1. 設定 logrotate 或等效機制 2. 保留 30 天 logs 3. 壓縮舊 log 4. 建立清理日誌" \
    "low" "手動清理也可，風險極低" "internal-optimization"

create_task \
    "API 端點統一規範化" \
    "localhost:3011 API 無統一文件，呼叫方式不一" \
    "建立 API 規範文件與測試" \
    "1. 盤點所有 API 端點 2. 建立 OpenAPI/Swagger 文件 3. 統一回傳格式 4. 建立測試腳本" \
    "medium" "文件與實作分離，不影響現有功能" "internal-optimization"

create_task \
    "備份策略檢視與自動化" \
    "缺乏完整的備份策略，重要數據可能遺失" \
    "建立自動化備份流程與還原測試" \
    "1. 盤點需備份的數據 2. 建立自動備份腳本 3. 設定異地備份 4. 每季測試還原流程" \
    "high" "備份失敗不影響原數據，但需監控" "internal-optimization"

# ===== 商業模式優化 (6個) =====

create_task \
    "住商不動產 - LINE Bot 自動回覆系統" \
    "潛在客戶透過 LINE 詢問時，回覆不及時易流失" \
    "建立 LINE Bot 自動回覆與分類系統" \
    "1. 設定 LINE Bot Webhook 2. 建立關鍵字自動回覆 3. 整合到任務板追蹤 4. 測試並上線" \
    "medium" "停用 Bot 回到人工回覆" "business-model"

create_task \
    "住商不動產 - 潛在客戶評分系統" \
    "大量 leads 無法區分優先順序，浪費業務時間" \
    "建立自動化 leads 評分與分類系統" \
    "1. 定義評分規則（預算、時程、需求明確度）2. 建立評分腳本 3. 整合到表單流程 4. 自動標記高潛力客戶" \
    "medium" "停用評分，回到人工判斷" "business-model"

create_task \
    "飲料店 - 會員點數整合外送平台 PoC" \
    "UberEats/Foodpanda 訂單無法累積點數，會員流失" \
    "建立概念驗證，整合外送訂單到會員系統" \
    "1. 研究外送平台 API/整合方式 2. 建立 PoC 腳本 3. 測試手動匯入 4. 評估自動化可行性" \
    "medium" "維持現狀，手動處理外送訂單" "business-model"

create_task \
    "飲料店 - 週期性促銷自動化" \
    "促銷活動設定耗時，錯過最佳時機" \
    "建立自動化促銷排程與推播系統" \
    "1. 建立促銷模板 2. 設定排程規則（節日/雨天/離峰時段）3. 自動推播給會員 4. 追蹤成效" \
    "low" "停用自動化，回到手動設定" "business-model"

create_task \
    "普特斯 - 庫存預警儀表板" \
    "電商與門市庫存未連動，常超賣或缺貨" \
    "建立統一庫存預警儀表板" \
    "1. 整合各平台庫存 API 2. 建立低庫存預警規則 3. 建立視覺化儀表板 4. 設定通知機制" \
    "medium" "回到各平台獨立查看庫存" "business-model"

create_task \
    "普特斯 - 銷售預測模型 PoC" \
    "進貨量憑經驗，常導致庫存積壓或缺貨" \
    "建立簡易銷售預測模型" \
    "1. 收集歷史銷售數據 2. 建立時間序列預測模型 3. 驗證準確度 4. 產出進貨建議報告" \
    "medium" "維持現有經驗判斷" "business-model"

# ===== 外部情報與研究 (4個) =====

create_task \
    "AI Agent 變現模式研究報告" \
    "AI Agent 市場快速發展，不了解最新變現模式" \
    "產出 AI Agent 市場變現模式研究報告" \
    "1. 搜尋 10+ 市場報告 2. 分析 5 個成功案例 3. 識別 2-3 個可切入模式 4. 產出 3 頁摘要報告" \
    "low" "暫緩市場擴張計畫" "external-intel"

create_task \
    "競品自動化產品月報機制" \
    "n8n/Make/Zapier 功能更新追蹤耗時，容易遺漏" \
    "建立自動化競品追蹤與月報機制" \
    "1. 設定 RSS/API 追蹤 2. 自動摘要更新內容 3. 每月產出比較報告 4. 識別差異化機會" \
    "low" "暫停競品追蹤" "external-intel"

create_task \
    "GPT-5 發布監控與應對計畫" \
    "GPT-5 即將發布，未準備應對方案" \
    "建立 GPT-5 監控與應用評估流程" \
    "1. 設定發布監控（Twitter/API）2. 建立評估檢查清單 3. 測試現有流程相容性 4. 準備遷移計畫" \
    "low" "維持現有 GPT-4 方案" "external-intel"

create_task \
    "OpenClaw 社群技能趨勢分析" \
    "不了解 clawhub.com 熱門技能趨勢，可能錯過實用工具" \
    "建立社群技能趨勢分析機制" \
    "1. 爬取/查詢 clawhub 技能列表 2. 分析下載/評分趨勢 3. 每月推薦 3-5 個值得關注技能 4. 評估導入價值" \
    "low" "暫停社群監控" "external-intel"

# ===== 個人效率與知識管理 (2個) =====

create_task \
    "Second Brain 工作流程自動化" \
    "筆記/任務/想法分散，缺乏統一工作流" \
    "建立 Second Brain 自動化工作流程" \
    "1. 統一 inbox 收集流程 2. 自動分類與標籤 3. 建立每日/每週回顧機制 4. 整合到現有任務板" \
    "low" "維持現有手動流程" "personal-productivity"

create_task \
    "會議紀錄自動化模板" \
    "會議後整理紀錄耗時，容易遺漏行動項目" \
    "建立會議紀錄自動化模板與追蹤" \
    "1. 建立標準會議紀錄模板 2. 自動提取行動項目 3. 同步到任務板 4. 追蹤完成狀態" \
    "low" "維持現有手動紀錄方式" "personal-productivity"

echo "✅ 任務池補充完成！"
