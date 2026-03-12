# AI Agent 任務委派與管理指南

> **文件版本**: v1.0
> **建立日期**: 2026-02-15
> **核心目標**: 提升小蔡與其他 AI Agent 溝通的清晰度與效率

---

## 🎯 核心問題

### 現狀問題
❌ **與老蔡溝通 vs 與 AI Agent 溝通是完全不同的邏輯**

**與老蔡溝通**（籠統可以）：
- "我完成了資料庫設計" ✅ OK
- "正在處理 n8n 整合" ✅ OK
- "需要修復一些問題" ✅ OK

**與 AI Agent 溝通**（必須極度清晰）：
- "我完成了資料庫設計" ❌ 不夠清楚
  - 完成了什麼？SQL Schema？ER 圖？還是實作？
  - 檔案在哪？
  - 下一步是什麼？

- "正在處理 n8n 整合" ❌ 不夠清楚
  - 需要做什麼？
  - 輸入資料是什麼？
  - 預期輸出是什麼？
  - 驗收標準是什麼？

### 目標狀態
✅ **每次交辦任務都必須包含 5W1H**

1. **What（做什麼）**: 具體任務描述
2. **Why（為什麼）**: 任務目的與背景
3. **Where（在哪做）**: 檔案位置、工作目錄
4. **When（何時完成）**: 優先級、截止時間
5. **Who（誰來做）**: 指定的 Agent
6. **How（怎麼做）**: 具體步驟、輸入輸出

---

## 📋 標準任務卡格式（必須遵守）

### 模板 A：程式開發任務

```markdown
# 任務卡：[任務名稱]

## 📌 基本資訊
- **任務 ID**: TASK-2026-02-15-001
- **指派給**: Codex / Cursor / Claude
- **優先級**: P0（極高）/ P1（高）/ P2（中）/ P3（低）
- **預估時間**: 30 分鐘
- **截止時間**: 2026-02-15 23:00

## 🎯 任務目標（What & Why）
**要做什麼**：建立 update-core-memory.sh 自動更新腳本

**為什麼要做**：確保每次對話結束後，核心記憶自動更新到最新狀態

## 📥 輸入資料（Input）
1. **對話記錄**: `~/.claude/projects/*/latest.jsonl`
2. **當前核心記憶**: `~/.openclaw/workspace/CORE.md`
3. **模板檔案**: `templates/core-memory-template.md`

## 📤 預期輸出（Output）
1. **主要產出**: `scripts/update-core-memory.sh` (Bash 腳本)
2. **次要產出**: `core/ACTIVE-CONTEXT.md` (更新後的檔案)
3. **文件**: `README-update-script.md` (使用說明)

## ✅ 驗收標準（Definition of Done）
- [ ] 腳本可執行（chmod +x）
- [ ] 執行後 CORE.md 正確更新
- [ ] 執行時間 < 5 秒
- [ ] 有錯誤處理機制
- [ ] 有版本備份機制
- [ ] 測試通過（至少執行 3 次無錯誤）

## 📝 具體步驟（How）
1. 讀取最新對話記錄（JSONL 格式）
2. 使用 Python 提取關鍵資訊（任務、決策、重要筆記）
3. 更新 core/ACTIVE-CONTEXT.md
4. 更新 CORE.md 時間戳
5. 執行版本備份
6. Git commit

## 🔍 上下文資訊
- **相關檔案**:
  - `scripts/nightly-memory-sync.sh` (參考範例)
  - `CORE-MEMORY-UPDATE-SYSTEM.md` (設計文件)
- **相關決策**: `archive/decisions/2026-02-15-*.md`
- **技術限制**:
  - 必須支援 macOS 和 Linux
  - Python 3.8+
  - Bash 4.0+

## ⚠️ 注意事項
- ❗ 執行前必須先備份當前版本
- ❗ 如果 JSONL 檔案不存在，不要報錯（跳過）
- ❗ 所有檔案路徑使用絕對路徑，不要用相對路徑

## 📞 遇到問題時
如果遇到以下問題，請立即回報：
1. JSONL 格式解析失敗
2. 檔案權限問題
3. Python 依賴缺失

**回報格式**：
```
❌ 任務受阻：TASK-2026-02-15-001
原因：[具體錯誤訊息]
已嘗試：[你做了什麼]
需要協助：[需要什麼資訊或權限]
```
```

---

## 📋 模板 B：資料分析任務

```markdown
# 任務卡：[任務名稱]

## 📌 基本資訊
- **任務 ID**: TASK-2026-02-15-002
- **指派給**: Codex / Claude
- **優先級**: P1（高）
- **預估時間**: 20 分鐘

## 🎯 任務目標
**要做什麼**：分析 memory/ 目錄下所有 .md 檔案，找出最常提到的關鍵字

**為什麼要做**：了解小蔡最常處理的主題，優化記憶索引

## 📥 輸入資料
1. **資料來源**: `~/.openclaw/workspace/memory/*.md`（222 個檔案）
2. **時間範圍**: 2026-02-01 ~ 2026-02-15

## 📤 預期輸出
1. **關鍵字排名**: JSON 格式
   ```json
   {
     "keywords": [
       {"word": "n8n", "count": 45},
       {"word": "資料庫", "count": 38},
       ...
     ]
   }
   ```
2. **分析報告**: Markdown 格式，包含圖表

## ✅ 驗收標準
- [ ] 找出 Top 20 關鍵字
- [ ] 關鍵字計數正確
- [ ] 排除停用詞（的、是、在、有等）
- [ ] 輸出 JSON 格式正確
- [ ] 生成可視化報告（Markdown table）

## 📝 具體步驟
1. 使用 glob 讀取所有 .md 檔案
2. 使用中文分詞（jieba）提取關鍵字
3. 統計詞頻
4. 排序並輸出 Top 20
5. 生成 Markdown 報告

## 🔍 上下文資訊
- **工具**: Python + jieba 分詞庫
- **排除檔案**: INDEX.md, README.md（這些是索引檔，不計入）
- **輸出位置**: `memory/analysis/keyword-analysis-2026-02-15.json`
```

---

## 🚫 錯誤示範 vs ✅ 正確示範

### 案例 1：請 Codex 幫忙處理資料庫

❌ **錯誤（太籠統）**:
```
請幫我處理資料庫設計
```

**問題**：
- 什麼資料庫？PostgreSQL? MySQL? SQLite?
- 處理什麼？建表？寫 SQL？還是設計 Schema？
- 檔案在哪？
- 怎麼知道完成了？

✅ **正確（清晰具體）**:
```markdown
# 任務卡：建立 PostgreSQL 資料庫 Schema

## 📥 輸入
- 設計文件: `memory/2026-02-15-database-schema-v1.md`（29KB）
- 參考範例: `docs/examples/postgres-schema.sql`

## 📤 輸出
- `migrations/001_create_tables.sql`（完整建表語句）
- `migrations/002_create_indexes.sql`（索引建立）
- `README.md`（執行說明）

## ✅ DoD
- [ ] 包含所有 6 層架構的表
- [ ] 支援 pgvector 擴展
- [ ] 通過 PostgreSQL 16 語法檢查
- [ ] 可以在本地 PostgreSQL 執行成功

## 📝 步驟
1. 讀取設計文件，提取所有表定義
2. 生成 CREATE TABLE 語句
3. 生成 CREATE INDEX 語句
4. 生成 Migration 腳本
5. 本地測試執行
```

---

### 案例 2：請 Cursor 修復前端問題

❌ **錯誤**:
```
Dashboard 在手機上顯示有問題，幫我修一下
```

**問題**：
- 什麼問題？排版亂？按鈕點不到？還是載入失敗？
- 什麼手機？iOS? Android? 什麼尺寸？
- 哪個檔案？
- 怎麼驗證修好了？

✅ **正確**:
```markdown
# 任務卡：修復 Dashboard 手機版排版問題

## 🎯 問題描述
- **位置**: src/pages/Dashboard.tsx
- **現象**:
  - iPhone 12 Pro (390x844) 上，任務卡片超出螢幕寬度
  - 底部導航列被遮住
- **截圖**: screenshots/dashboard-mobile-issue.png

## 📥 輸入
- 問題檔案: `src/pages/Dashboard.tsx` (245 行)
- CSS 檔案: `src/styles/dashboard.css`
- Tailwind 配置: `tailwind.config.js`

## 📤 輸出
- 修改後的 `src/pages/Dashboard.tsx`
- 可能需要修改 `dashboard.css`

## ✅ DoD
- [ ] iPhone 12 Pro (390x844) 顯示正常
- [ ] Android (360x640) 顯示正常
- [ ] 任務卡片不超出螢幕
- [ ] 底部導航列可見
- [ ] 桌面版不受影響
- [ ] 通過 Chrome DevTools 響應式測試

## 📝 步驟
1. 在 Chrome DevTools 切換到 iPhone 12 Pro 模式
2. 檢查元素，找出寬度超出的元素
3. 修改 Tailwind class 或 CSS
4. 測試多個裝置尺寸
5. Commit 變更
```

---

## 💡 關鍵原則（必須遵守）

### 1. 永遠提供「輸入」和「輸出」

**輸入**（Input）：
- Agent 需要讀取什麼檔案？
- 需要什麼資料？
- 在哪個目錄工作？

**輸出**（Output）：
- Agent 要產出什麼檔案？
- 檔案格式是什麼？
- 存放在哪裡？

### 2. 永遠定義「驗收標準」（DoD）

**不要說**：「幫我完成這個功能」
**要說**：「完成後必須通過以下 5 項檢查」

### 3. 永遠提供「上下文」

**不要假設** Agent 知道背景
**要明確告知**：
- 為什麼要做這個？
- 相關的決策是什麼？
- 有哪些限制條件？

### 4. 永遠準備「錯誤處理」

告訴 Agent：
- 遇到什麼問題時要回報
- 回報的格式是什麼
- 不要自己猜測，要問清楚

---

## 🎯 快速檢查清單（交辦前必查）

在交辦任務給 AI Agent 前，問自己：

- [ ] **What**: 具體要做什麼？（不能籠統）
- [ ] **Input**: Agent 需要讀什麼檔案？
- [ ] **Output**: Agent 要產出什麼檔案？
- [ ] **DoD**: 怎麼知道完成了？（至少 3 項驗收標準）
- [ ] **Steps**: 具體步驟是什麼？（至少 3 步）
- [ ] **Context**: 為什麼要做？有什麼限制？
- [ ] **Error Handling**: 遇到問題怎麼辦？

**如果有任何一項答不出來，表示任務定義不夠清楚，不要交辦！**

---

## 📚 進階技巧

### 技巧 1：使用「參考範例」

不要只說「幫我寫一個腳本」
要說「參考 scripts/nightly-memory-sync.sh 的格式，寫一個類似的腳本」

### 技巧 2：使用「限制條件」

明確告知：
- 不能使用什麼技術（例如：不能用 sudo）
- 檔案大小限制（例如：< 100 行）
- 執行時間限制（例如：< 5 秒）

### 技巧 3：使用「驗收測試」

提供具體的測試案例：
```bash
# 測試案例 1: 正常執行
./update-core-memory.sh
# 預期: 輸出 "✅ 更新完成"

# 測試案例 2: 無對話記錄
rm ~/.claude/projects/*.jsonl
./update-core-memory.sh
# 預期: 輸出 "⚠️ 無對話記錄，跳過更新"
```

---

## 🎓 學習記錄（持續更新）

### 成功案例
- ✅ 2026-02-15: 使用完整任務卡格式交辦 n8n 整合，Codex 一次完成
- ✅ 2026-02-14: 提供詳細 DoD，Cursor 修復 Dashboard 問題無需返工

### 失敗案例（避免重蹈覆轍）
- ❌ 2026-02-13: 籠統說「處理資料庫」，Codex 不知道要做什麼，浪費 3 輪對話
- ❌ 2026-02-12: 沒提供輸入檔案位置，Agent 找錯檔案，做了無用功

### 改進方向
- 🎯 每次交辦前使用「快速檢查清單」
- 🎯 建立常用任務卡模板庫
- 🎯 記錄每次交辦的效果，持續優化

---

## 📋 任務卡模板庫

### 常用模板

1. **程式開發**: `templates/task-card-coding.md`
2. **資料分析**: `templates/task-card-analysis.md`
3. **文件撰寫**: `templates/task-card-documentation.md`
4. **測試驗證**: `templates/task-card-testing.md`
5. **部署上線**: `templates/task-card-deployment.md`

---

**核心思想**：
> 與 AI Agent 溝通，就像寫程式一樣，必須**極度明確、無歧義**。
> 籠統的指令只會浪費時間，清晰的任務卡才能一次到位。

---

**記錄者**: Claude
**審核者**: 待老蔡確認
**版本**: v1.0
**最後更新**: 2026-02-15
