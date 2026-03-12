#!/bin/bash
# 快速生成新任務到任務池
set -e

API="http://localhost:3011/api/tasks"

echo "🚀 開始補充任務池..."

# 1. 技術債清理 - 腳本錯誤處理
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[小蔡] 強化所有腳本的錯誤處理（set -e）", "description": "為所有自動化腳本添加 set -e 或 set -euo pipefail，確保遇到錯誤時立即中止執行，避免產生不可預期的副作用。", "status": "ready", "priority": 2, "tags": ["script-quality", "error-handling", "internal"], "acceptanceCriteria": ["批量檢查並更新 20+ 個腳本", "每個腳本都包含錯誤處理", "驗證腳本仍正常執行"], "riskLevel": "low", "rollbackPlan": "git checkout 恢復原始腳本", "assignedAgent": "小蔡"}' > /dev/null

# 2. 技術債清理 - 監控整合  
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[小蔡] 整合監控腳本為統一介面", "description": "將分散的監控腳本整合為單一入口，簡化維護與使用。", "status": "ready", "priority": 2, "tags": ["monitoring", "integration", "internal"], "acceptanceCriteria": ["建立 monitor-master.sh 統一入口", "支援多種監控模式", "保留向後相容性"], "riskLevel": "medium", "rollbackPlan": "保留原腳本作為備份", "assignedAgent": "小蔡"}' > /dev/null

# 3. 技術債清理 - 記憶索引
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[小蔡] 建立記憶庫索引與分類系統", "description": "為 166 個記憶文件建立統一索引，按類型分類，提升搜尋效率。", "status": "ready", "priority": 2, "tags": ["memory-system", "indexing", "organization"], "acceptanceCriteria": ["生成 INDEX.md 統一索引", "按4個子目錄分類整理", "整合 qmd 快速搜尋"], "riskLevel": "low", "rollbackPlan": "備份原始記憶文件結構", "assignedAgent": "小蔡"}' > /dev/null

# 4. 技術債清理 - Cron 審查
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[小蔡] 審查與清理未使用的 Cron Jobs", "description": "檢查目前 disabled 的 cron job，決定是否移除或重新啟用。", "status": "ready", "priority": 3, "tags": ["cron", "cleanup", "maintenance"], "acceptanceCriteria": ["審查所有 disabled job", "刪除或重新啟用每個 job", "更新 cron-tasks.md 文檔"], "riskLevel": "low", "rollbackPlan": "備份 crontab 設定", "assignedAgent": "小蔡"}' > /dev/null

# 5. 新技能 - 檔案同步
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[Cursor] 開發檔案同步與備份 Skill", "description": "建立自動化的檔案同步與備份技能，支援本地與雲端儲存。", "status": "ready", "priority": 2, "tags": ["backup", "sync", "file-management", "new-skill"], "acceptanceCriteria": ["支援本地與雲端備份", "實現增量備份", "提供還原功能"], "riskLevel": "medium", "rollbackPlan": "在測試環境先行驗證", "assignedAgent": "Cursor"}' > /dev/null

# 6. 新技能 - 密碼管理
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[Cursor] 開發密碼管理與生成 Skill", "description": "建立安全的密碼管理技能，支援密碼生成、儲存（加密）、強度檢查。", "status": "ready", "priority": 2, "tags": ["password", "security", "encryption", "new-skill"], "acceptanceCriteria": ["安全加密儲存密碼", "強密碼生成器", "密碼強度檢查"], "riskLevel": "medium", "rollbackPlan": "使用標準加密庫，先行安全審查", "assignedAgent": "Cursor"}' > /dev/null

# 7. 新技能 - 日誌分析
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[Cursor] 開發日誌分析與監控 Skill", "description": "建立智慧日誌分析技能，能自動解析各種日誌格式，提取關鍵資訊。", "status": "ready", "priority": 2, "tags": ["logging", "analysis", "monitoring", "new-skill"], "acceptanceCriteria": ["支援多種日誌格式", "自動提取關鍵資訊", "生成分析報告"], "riskLevel": "low", "rollbackPlan": "在不影響原始日誌下運作", "assignedAgent": "Cursor"}' > /dev/null

# 8. 新技能 - 網路診斷
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[Cursor] 開發網路診斷與測試 Skill", "description": "建立網路診斷技能，支援連線測試、延遲檢測、頻寬測試、DNS 解析。", "status": "ready", "priority": 3, "tags": ["network", "diagnostic", "testing", "new-skill"], "acceptanceCriteria": ["支援多種網路測試", "提供詳細診斷報告", "支援批次測試"], "riskLevel": "low", "rollbackPlan": "使用標準網路工具，無副作用", "assignedAgent": "Cursor"}' > /dev/null

# 9. 文件 - README 補齊
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[小蔡] 補齊 5 個新技能的 README 文檔", "description": "為 qmd, clawhub, github, healthcheck, screen-vision 補齊 README.md，包含用途、安裝、範例用法。", "status": "ready", "priority": 2, "tags": ["documentation", "readme", "skills"], "acceptanceCriteria": ["5 個技能均有 README", "包含範例用法", "更新技能總表"], "riskLevel": "low", "rollbackPlan": "刪除新建 README，保留原有 SKILL.md", "assignedAgent": "小蔡"}' > /dev/null

# 10. 系統優化 - 效能
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"name": "[小蔡] 系統效能優化與資源管理", "description": "分析系統效能瓶頸，優化記憶體使用、減少 I/O 操作、提升整體回應速度。", "status": "ready", "priority": 2, "tags": ["performance", "optimization", "resource-management"], "acceptanceCriteria": ["識別主要效能瓶頸", "實施優化方案", "效能提升 20%+"], "riskLevel": "medium", "rollbackPlan": "分階段實施，每步可回滾", "assignedAgent": "小蔡"}' > /dev/null

echo "✅ 已生成 10 個新 ready 任務！"

# 統計更新
echo "統計中..."
curl -s http://localhost:3011/api/tasks | python3 -c "
import json, sys
data = json.load(sys.stdin)
ready = len([t for t in data if t.get('status') == 'ready'])
total = len(data)
print(f'📊 任務池狀態: {ready} ready / {total} 總計')
if ready >= 10:
    print('✅ 任務池已顯著提升！')
else:
    print(f'📝 可考慮再增加 {11-ready} 個任務')
" 2>/dev/null || echo "統計失敗"