# 【達爾執行-COST_OPTIMIZATION】成本優化盤點 - 高 Token 任務降本方案

**task_id**: cost-optimization-20250214  
**run_id**: run-001  
**執行時間**: 2026-02-14 06:16 GMT+8  
**分析範圍**: OpenClaw AI 自動化系統全系統

---

## 📋 執行摘要（5 點關鍵發現）

1. **Context 消耗是最大隱形成本**：目前系統 Context 達 108k/131k (82%)，其中對話歷史佔 46-55%，Skills 載入佔 14-18%，工具定義佔 23-28%

2. **Output Token 比 Input 貴 3 倍**：Codex I/O 模式證實，減少生成導向任務可節省 30-40% 成本

3. **4 個 Cron 監控任務已切換免費模型**：dashboard-monitor、autopilot-lean、unified-monitor-quick/detailed 已改用 gemini-25-pro-free，零成本運行

4. **模型路由存在優化空間**：日常任務仍可能誤用高成本模型 (Grok $0.03/1k)，缺乏強制降級機制

5. **預估總體節省空間 35-50%**：透過模型路由優化 + 提示詞精簡 + 流程重構可達成

---

## 📊 高成本任務盤點表

| 任務類型 | 目前模型 | 頻率 | 單次成本 | 月估算 | 風險等級 |
|---------|---------|------|---------|--------|---------|
| **長文檔分析** (商業模式/市場掃描) | Kimi/Grok | 每週 2-3 次 | $0.20-0.50 | ~$5 | 🟡 中 |
| **監控報告生成** (dashboard-monitor) | Gemini Free | 每10分鐘 | $0 | $0 | 🟢 低 |
| **自動化任務執行** (autopilot) | Kimi | 每日多次 | $0.10-0.30 | ~$6 | 🟡 中 |
| **多輪對話累積** | Kimi | 持續 | 遞增 | ~$15 | 🔴 高 |
| **技能載入 (21個)** | 系統層 | 每會話 | ~$0.03 | ~$10 | 🔴 高 |
| **故障排查/複雜決策** | Grok/Opus | 按需 | $0.50-2.00 | ~$10 | 🟡 中 |
| **網頁擷取+摘要** | Kimi | 每日 | $0.10-0.20 | ~$5 | 🟢 低 |

### 高成本任務詳細分析

#### 🔴 類型 1: 多輪對話累積 Context（最高風險）
- **症狀**: Context 達 108k/131k (82%)
- **Token 分佈**:
  - 對話歷史: ~50-60k (46-55%)
  - 工具定義: ~25-30k (23-28%)
  - Skills (21個): ~15-20k (14-18%)
- **目前成本**: ~$0.15/會話（隨對話遞增）

#### 🔴 類型 2: Skills 過度載入
- **症狀**: 21個 Skills 全部載入，實際使用僅 6-8 個
- **浪費**: 15個未使用 Skills 佔 ~10-15k tokens
- **目前成本**: 每會話固定 ~$0.03

#### 🟡 類型 3: 長文檔處理
- **症狀**: 商業模式分析、市場掃描等長篇文件
- **範例**: `2026-02-14-business-model-analysis.md` (19KB)
- **目前成本**: $0.20-0.50/次

#### 🟡 類型 4: 複雜推理任務模型選擇
- **症狀**: 中等複雜度任務使用 Grok ($0.03/1k)
- **範例**: 一般分析任務不需要 Grok 深度推理
- **目前成本**: $0.50-2.00/次（可降級至 Kimi $0.05-0.20）

---

## 💡 降本方案詳細說明

### 方案 A: 模型路由優化

#### A1. 強制模型降級規則
```
目前: 日常任務 → Kimi (預設)
優化: 
  - 監控報告 → Ollama/Gemini Free (免費)
  - 簡單摘要 → Gemini Flash (免費)
  - 格式轉換 → Ollama (免費)
  - 風險: 輕度質量下降，但可接受
```
**預估節省**: 15-20% | **難度**: ⭐ 簡單 | **風險**: 🟢 低

#### A2. Grok/Opus 啟用閘門
```
目前: 複雜任務可能自動使用 Grok
優化:
  - 必須明確標記 [P0] + 主人批准
  - 連續使用 3 次自動降級至 Kimi
  - 建立 "模型使用申請" 流程
```
**預估節省**: 10-15% | **難度**: ⭐⭐ 中等 | **風險**: 🟡 中

#### A3. Cron 任務全面免費化
```
目前: 4 個任務已改用 Gemini Free
優化:
  - 所有定時監控 → Ollama/Gemini Free
  - 本地優先原則
  - 失敗時才降級到付費模型
```
**預估節省**: 5-8% | **難度**: ⭐ 簡單 | **風險**: 🟢 低

### 方案 B: 提示詞優化

#### B1. Skills 精簡載入
```
目前: 開場載入全部 21 個 Skills
優化:
  - 建議保留核心 6 個:
    healthcheck, playwright-scraper, screen-vision,
    session-logs, github, tavily-search
  - 禁用 15 個非核心 Skills
```
**預估節省**: 10-15k tokens/會話 (~$0.02) | **難度**: ⭐⭐ 中等 | **風險**: 🟢 低

#### B2. 工具定義壓縮
```
目前: 冗長描述 (例: web_search 描述 200+ 字)
優化:
  - 精簡至核心功能描述
  - 移除冗餘說明和範例
  - 預估減少 30-40% 工具定義大小
```
**預估節省**: 5-10k tokens/會話 | **難度**: ⭐⭐ 中等 | **風險**: 🟡 中

#### B3. 對話歷史自動摘要
```
目前: 保留完整對話歷史
優化:
  - Context >70% 時自動摘要舊對話
  - 保留最近 5 輪，其餘壓縮為摘要
  - maxHistoryShare 設為 0.5
```
**預估節省**: 20-30k tokens/長會話 | **難度**: ⭐⭐⭐ 複雜 | **風險**: 🟡 中

### 方案 C: 流程重構

#### C1. I/O 閉環模式全面導入
```
目前: 部分任務使用傳統對話模式
優化:
  - 全面採用 Codex I/O 模式
  - 工具導向為主（Input 便宜）
  - 減少生成導向（Output 貴 3 倍）
  - 主人 ACK 機制，達爾不讀 transcript
```
**預估節省**: 30-40% | **難度**: ⭐⭐ 中等 | **風險**: 🟢 低

#### C2. 定期會話重置
```
目前: 單一會話持續累積 Context
優化:
  - Context >70% 強制 /new
  - 長任務拆分到多會話
  - 建立 "會話健康檢查" 機制
```
**預估節省**: 20-25% | **難度**: ⭐ 簡單 | **風險**: 🟢 低

#### C3. 本地模型優先鏈
```
目前: 部分任務直接調用 API
優化:
  - Ollama 本地處理: 監控、格式轉換、簡單分析
  - Gemini Free 備援
  - 付費模型僅作最後手段
```
**預估節省**: 10-15% | **難度**: ⭐⭐ 中等 | **風險**: 🟡 中

---

## ✅ 立即執行建議（優先級排序）

| 優先級 | 措施 | 預估節省 | 實施難度 | 風險 | 預計完成 |
|-------|------|---------|---------|------|---------|
| **P0** | 禁用 15 個非核心 Skills | 10-15k tokens/會話 (~$0.02) | ⭐ 簡單 | 🟢 低 | 今天 |
| **P0** | Context >70% 強制 /new | 20-25% | ⭐ 簡單 | 🟢 低 | 今天 |
| **P1** | Cron 任務全面 Ollama/Gemini Free | 5-8% | ⭐ 簡單 | 🟢 低 | 本週 |
| **P1** | Grok 使用申請閘門 | 10-15% | ⭐⭐ 中等 | 🟡 中 | 本週 |
| **P1** | I/O 閉環模式導入 | 30-40% | ⭐⭐ 中等 | 🟢 低 | 本週 |
| **P2** | 工具定義壓縮 | 5-10k tokens/會話 | ⭐⭐ 中等 | 🟡 中 | 下週 |
| **P2** | 對話歷史自動摘要 | 20-30k tokens/長會話 | ⭐⭐⭐ 複雜 | 🟡 中 | 下週 |
| **P3** | Skills 延遲載入架構 | 10-15k tokens/會話 | ⭐⭐⭐ 複雜 | 🟡 中 | 月內 |

---

## 🎯 執行指令（可立即複製執行）

### 1. 禁用非核心 Skills（P0 - 今天）
```bash
# 查看目前載入的 skills
openclaw skills list

# 禁用非核心 skills（保留 6 個核心）
openclaw skills disable apple-notes
openclaw skills disable apple-reminders
openclaw skills disable things-mac
openclaw skills disable himalaya
openclaw skills disable imsg
openclaw skills disable tmux
openclaw skills disable video-frames
openclaw skills disable weather
openclaw skills disable openai-image-gen
openclaw skills disable openai-whisper-api
openclaw skills disable gog
openclaw skills disable calendar
openclaw skills disable contacts
openclaw skills disable browser-tools

# 重啟生效
openclaw gateway restart
```

### 2. 設定 Context 閾值（P0 - 今天）
```bash
# 在 ~/.openclaw/openclaw.json 添加:
{
  "agents": {
    "defaults": {
      "compaction": {
        "mode": "safeguard",
        "reserveTokensFloor": 20000,
        "maxHistoryShare": 0.5
      }
    }
  }
}
```

### 3. 建立 Context 監控腳本（P1 - 本週）
```bash
#!/bin/bash
# ~/.openclaw/context-watchdog.sh

THRESHOLD=70
STATUS=$(openclaw status 2>/dev/null)
PERCENT=$(echo "$STATUS" | grep -oP '\d+(?=%)')

if [ "$PERCENT" -gt "$THRESHOLD" ]; then
    echo "⚠️ Context ${PERCENT}% 超過 ${THRESHOLD}%，建議 /new"
fi
```

---

## 📈 預估節省總結

| 優化類別 | 措施數 | 預估節省 |
|---------|-------|---------|
| 模型路由優化 | 3 | 30-43% |
| 提示詞優化 | 3 | 15-25% |
| 流程重構 | 3 | 60-80% |
| **總體預估** | **9** | **35-50%** |

### 成本對比（月估算）

| 項目 | 優化前 | 優化後 | 節省 |
|------|-------|-------|------|
| Context 累積成本 | ~$15 | ~$5 | ~$10 |
| Skills 載入成本 | ~$10 | ~$3 | ~$7 |
| 模型路由優化 | ~$20 | ~$10 | ~$10 |
| 流程效率提升 | ~$15 | ~$6 | ~$9 |
| **月總計** | **~$60** | **~$24** | **~$36 (60%)** |

---

## 📝 檔案記錄

- **報告位置**: `memory/2026-02-14-cost-optimization.md`
- **相關文件**:
  - `docs/MODEL-ROUTING-RULES.md` - 模型路由規則 v2.1
  - `memory/2026-02-14-codex-io-loop.md` - Codex I/O 模式
  - `docs/CONTEXT-OPTIMIZATION-PLAN.md` - Context 優化策略
- **關鍵字**: cost-optimization, token, model-routing, context, skills

---

🐣 達爾 | 成本優化盤點 | 2026-02-14 06:16 GMT+8
✅ 任務完成
