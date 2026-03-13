# Cron Jobs 審計報告

> 日期：2026-02-14
> 審計範圍：17 個 disabled Cron Jobs
> 決策原則：精簡、高價值、避免重複

---

## 📊 總覽

| 統計 | 數值 |
|------|------|
| 總 Jobs | 44 個 |
| Enabled | 27 個 |
| **Disabled** | **17 個** |
| 本次審查 | 6 個最舊/低價值 |

---

## 🔍 審查的 6 個 Disabled Jobs

### 1. Update all ClawHub skills weekly
| 項目 | 內容 |
|------|------|
| ID | `042abf34-9318-4ef9-ab9b-4aa395dfd1b7` |
| 排程 | 每週日 03:00 |
| 類型 | System Event |
| 建立時間 | 2026-02-10 |

**功能**：自動更新所有 ClawHub skills

**決策分析**：
- ✅ 有價值：保持 skills 最新
- ⚠️ 風險：自動更新可能破壞現有功能
- 🔄 替代：手動 `clawhub update --all` 更可控

**決策**：❌ **刪除**
理由：自動更新風險高，建議手動執行

---

### 2. 每日技能優化建議
| 項目 | 內容 |
|------|------|
| ID | `061d886b-0161-44e2-8b28-2b02bc6c6477` |
| 排程 | 每日 10:00 |
| 類型 | Agent Turn (Kimi) |
| 最後執行 | 2026-02-13 |

**功能**：分析 skills/ 並提出優化建議

**決策分析**：
- ✅ 有價值：主動優化技能
- ❌ 重複：與 `task-gen-internal`（每 15 分鐘）重疊
- 📊 執行狀態：最後執行成功

**決策**：❌ **刪除**
理由：與 task-gen-internal 重複，後者頻率更高

---

### 3. 每週腳本效能檢討
| 項目 | 內容 |
|------|------|
| ID | `8bca7635-c848-4b16-84cc-c7398a8d4b05` |
| 排程 | 每週五 16:00 |
| 類型 | Agent Turn (Kimi) |

**功能**：檢查 scripts/ 資料夾，提出合併/簡化建議

**決策分析**：
- ✅ 有價值：維護腳本品質
- ⚠️ 頻率：每週一次可能過度
- 🔄 替代：與 governance-review（每週一）可合併

**決策**：❌ **刪除**
理由：可併入 weekly-governance-review 統一處理

---

### 4. 每週新技術學習
| 項目 | 內容 |
|------|------|
| ID | `a21a512e-d363-4cda-834c-892f998a44e5` |
| 排程 | 每週日 15:00 |
| 類型 | Agent Turn (Kimi) |

**功能**：探索新 AI 工具、API、開發技術

**決策分析**：
- ✅ 高價值：保持技術敏銳度
- ✅ 獨特性：與其他 jobs 不重複
- 📚 成本：Gemini Pro Free 或 Kimi（低成本）

**決策**：✅ **啟用**
理由：高學習價值，成本可控，與其他 jobs 不重複
建議模型：改為 `gemini-25-pro-free` 更省成本

---

### 5. 每週任務板分析
| 項目 | 內容 |
|------|------|
| ID | `1572afac-05c3-4644-bdce-fdf9c6f8497e` |
| 排程 | 每週日 17:00 |
| 類型 | Agent Turn (Kimi) |

**功能**：分析任務板執行紀錄，統計成功率、失敗任務

**決策分析**：
- ✅ 有價值：數據驅動改進
- ⚠️ 依賴：需要 task-board-api.sh
- 🔄 重複：與 weekly-governance-review 部分重疊

**決策**：❌ **刪除**
理由：與 governance-review 重複，後者更全面

---

### 6. 每週 ClawHub 新技能探索
| 項目 | 內容 |
|------|------|
| ID | `2f4c6a7d-011a-4a1c-b271-a4d946647da5` |
| 排程 | 每週六 14:00 |
| 類型 | Agent Turn (Kimi) |

**功能**：搜尋並推薦 3-5 個新技能

**決策分析**：
- ✅ 有價值：發現實用工具
- ✅ 執行狀態：Enabled 且運行正常
- ⚠️ 注意：這個 job 其實是 enabled 的

**決策**：✅ **保留（已是 Enabled）**
備註：此 job 運行正常，繼續維持

---

## 📋 決策摘要

| Job 名稱 | 決策 | 理由 |
|----------|------|------|
| Update all ClawHub skills weekly | ❌ 刪除 | 自動更新風險高 |
| 每日技能優化建議 | ❌ 刪除 | 與 task-gen-internal 重複 |
| 每週腳本效能檢討 | ❌ 刪除 | 可併入 governance-review |
| 每週新技術學習 | ✅ 啟用 | 高學習價值，成本可控 |
| 每週任務板分析 | ❌ 刪除 | 與 governance-review 重複 |
| 每週 ClawHub 新技能探索 | ✅ 保留 | 運行正常 |

---

## 🧹 待處理清單

### 立即刪除（4 個）

```bash
# 1. Update all ClawHub skills weekly
openclaw cron remove 042abf34-9318-4ef9-ab9b-4aa395dfd1b7

# 2. 每日技能優化建議
openclaw cron remove 061d886b-0161-44e2-8b28-2b02bc6c6477

# 3. 每週腳本效能檢討
openclaw cron remove 8bca7635-c848-4b16-84cc-c7398a8d4b05

# 4. 每週任務板分析
openclaw cron remove 1572afac-05c3-4644-bdce-fdf9c6f8497e
```

### 啟用（1 個）

```bash
# 每週新技術學習（並改用低成本模型）
openclaw cron update a21a512e-d363-4cda-834c-892f998a44e5 \
  --model "openrouter/google/gemini-2.5-pro-exp-03-25:free"
openclaw cron enable a21a512e-d363-4cda-834c-892f998a44e5
```

---

## 📌 其他 Disabled Jobs（待後續審查）

以下 11 個 disabled jobs 建議後續分批審查：

| Job 名稱 | 初步評估 |
|----------|----------|
| Twitter Digest v2 | 依賴 Twitter API，可能已失效 |
| Content Ideation Weekly v2 | 高價值，但模型成本高 |
| Content Analytics Daily v2 | 需評估 Dashboard API 狀態 |
| Kanban Patrol v2 | 高頻率（每小時），成本高 |
| Second Brain Embedding v2 | 低價值，Ollama 可免費執行 |
| SEO CTR Tracker v2 | 依賴 GSC，可能未設定 |
| Smart ETL Monitor v2 | 依賴 PM2，可能未設定 |
| Daily Title Optimizer v2 | 需評估 YouTube API 狀態 |
| Weekly GitHub Patrol v2 | 高價值，可啟用 |
| Proactive Coder v2 | 高風險（自動 PR），建議刪除 |
| Overnight Improvement Sprint v2 | 高風險（自動 commit），建議刪除 |

---

## 💡 建議

1. **精簡原則**：保持 enabled jobs < 25 個
2. **成本優先**：Agent Turn 類 jobs 優先使用 Gemini Pro Free
3. **價值導向**：低價值/高風險的自動化應刪除
4. **定期審查**：每季進行一次 cron jobs 審計

---

## ✅ 執行確認

主人確認後執行：
- [ ] 刪除 4 個重複/高風險 jobs
- [ ] 啟用「每週新技術學習」並改用免費模型
- [ ] 審查剩餘 11 個 disabled jobs
