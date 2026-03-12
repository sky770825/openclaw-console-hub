# 任務面板全面審計與改進策略

> 審計日期：2026-02-13 | 審計人：小蔡（Opus 4.6）

---

## 一、現有架構總覽

### 前端（React + TypeScript + Vite）
| 頁面 | 檔案 | 行數 | 功能 |
|------|------|------|------|
| 儀表板 | Dashboard.tsx | 838 | 統計卡、AutoExecutor/Autopilot 控制、即時活動 |
| 任務看板 | TaskBoard.tsx | 1312 | Kanban 拖拉、任務 CRUD、篩選、詳情側板 |
| 任務列表 | TaskList.tsx | 509 | 表格視圖、搜尋、篩選 |
| 執行紀錄 | Runs.tsx | 703 | 執行歷史、狀態追蹤 |
| 日誌 | Logs.tsx | 515 | 審計日誌 |
| 警報 | Alerts.tsx | 260 | 通知管理 |
| 專案 | Projects.tsx | 359 | 專案管理 |
| 審核中心 | ReviewCenter.tsx | 508 | 發想審核 |
| 設定 | Settings.tsx | 385 | 系統設定 |
| Cursor Agent 板 | openclaw-cursor.jsx | — | OpenClaw v4 板 |

### 後端（Express + Supabase）
| 模組 | 檔案 | 行數 | 功能 |
|------|------|------|------|
| 主路由 | index.ts | 3200 | API 端點、中間件 |
| Supabase 層 | openclawSupabase.ts | 666 | 資料庫操作 |
| Agent 執行器 | executor-agents.ts | 600 | Agent 選擇與執行 |
| 工作流程引擎 | workflow-engine.ts | 474 | 任務工作流程 |
| 防卡關 | anti-stuck.ts | 410 | 超時檢測與恢復 |
| WebSocket | websocket.ts | 328 | 即時通訊 |
| Telegram 通知 | utils/telegram.ts | 227 | TG 通知發送 |

---

## 二、問題清單

### 🔴 嚴重問題（必修）

| # | 問題 | 影響 | 負責角色 |
|---|------|------|----------|
| 1 | **index.ts 3200 行巨型檔案** | 難維護、難測試 | 架構師 |
| 2 | **無認證機制** | 任何人都能操作 API | 後端 |
| 3 | **server 啟動無自動化** | 手動啟動，重開機就掛 | DevOps |
| 4 | **前端無錯誤追蹤** | ErrorBoundary 只是 fallback | 前端 |

### 🟡 中度問題（建議修）

| # | 問題 | 影響 | 負責角色 |
|---|------|------|----------|
| 5 | **TaskBoard 1312 行** | 元件過大，拆分不足 | 前端 |
| 6 | **WebSocket 無重連策略** | 斷線後需手動刷新 | 前端 |
| 7 | **無單元測試** | 改動易爆炸 | 全體 |
| 8 | **Autopilot 用 AI 做輪巡** | 浪費 tokens | 架構師 |
| 9 | **n8n 整合未完成** | n8nClient 存在但未啟用 | 後端 |
| 10 | **Projects 頁功能不完整** | 只有基礎 CRUD | 前端 |

### 🟢 優化項目（錦上添花）

| # | 問題 | 影響 | 負責角色 |
|---|------|------|----------|
| 11 | 深色/淺色主題切換體驗 | UX | 前端 |
| 12 | 手機端響應式不足 | 移動端使用體驗差 | 前端 |
| 13 | 統計圖表可視化 | Dashboard 只有數字卡 | 前端 |
| 14 | 批次操作（多選任務） | 效率 | 前端 |
| 15 | 國際化 i18n 架構 | 未來擴展 | 架構師 |

---

## 三、人員分配

### 架構師（1 人）
**職責**：整體架構規劃、code review、技術決策
**模型**：Opus 4.6 / Sonnet 4.5（複雜決策時）
**任務**：
- 拆分 index.ts（路由分層）
- 制定 API 認證方案
- 定義前後端 TypeScript 共用型別

### 前端專家（1-2 人）
**職責**：UI/UX 改進、元件重構、新功能開發
**模型**：Kimi k2.5 / Cursor（開發類）
**任務**：
- TaskBoard 拆分為子元件
- WebSocket 重連機制
- 響應式優化
- 圖表可視化（Dashboard）
- Projects 頁完善

### 後端專家（1 人）
**職責**：API 重構、安全性、效能
**模型**：Kimi k2.5 / Cursor（開發類）
**任務**：
- index.ts 路由拆分
- 認證中間件
- Server 自動啟動腳本
- 防卡關機制優化

### QA/測試（1 人）
**職責**：測試計畫、自動化測試
**模型**：Kimi k2.5
**任務**：
- 寫 API 測試
- 前端元件測試
- E2E 測試流程

---

## 四、執行階段

### Phase 1：穩固基礎（1-2 天）
1. ✅ Server 自動啟動（launchd / pm2）
2. 拆分 index.ts → routes/、middleware/、controllers/
3. 新增 API 認證（Bearer token 即可）
4. TaskBoard.tsx 拆分子元件

### Phase 2：功能完善（3-5 天）
5. WebSocket 重連 + 心跳
6. Dashboard 加入圖表（Recharts）
7. Projects 頁 → 完整 CRUD + 任務關聯
8. 批次操作功能
9. 前端錯誤追蹤（Sentry 或自建）

### Phase 3：優化（持續）
10. 響應式設計完善
11. 效能優化（lazy loading、虛擬列表）
12. 測試覆蓋率 > 60%
13. i18n 架構

---

## 五、SOP：任務執行標準流程

### 對 Cursor / CoDEX 開發者：

```
1. 領取任務
   - 從任務面板拉取 status=ready 的任務
   - PATCH /api/openclaw/tasks/{id} → status=running

2. 理解需求
   - 讀本文件對應的「問題描述」
   - 讀相關原始碼（位置見上方表格）
   - 確認影響範圍

3. 開發
   - 建立 feature branch: git checkout -b fix/{issue-number}
   - 遵循現有程式風格（TypeScript、shadcn/ui）
   - 每個改動附帶測試（至少手動測試步驟）

4. 驗證
   - npm run build 無報錯
   - 啟動 dev server 確認功能正常
   - 檢查 console 無新 warning/error

5. 交付
   - 寫 commit message：feat/fix: {簡述}
   - PATCH /api/openclaw/tasks/{id} → status=done
   - 若遇到阻塞 → status=blocked，附說明

6. 報告
   - 在 memory/autopilot-results/{task-id}.md 寫結果摘要
```

### 對小蔡主會話（Kimi 調度用）：

```
1. 讀取本文件 → 了解全局
2. 按 Phase 順序建立任務到面板
3. 每個任務填好：
   - name: 簡述
   - description: 詳細需求 + 參考檔案路徑
   - agent: [Cursor] / [Kimi] / [OR-Free]
   - priority: 1-5（1 最高）
4. 任務之間標註依賴關係
5. 每日檢查進度，調整優先級
```

---

## 六、專案路徑

- **前端原始碼**：`/Users/caijunchang/openclaw任務面版設計/src/`
- **後端原始碼**：`/Users/caijunchang/openclaw任務面版設計/server/src/`
- **本文件**：`docs/TASK-DASHBOARD-AUDIT.md`
- **任務面板 API**：`http://localhost:3011`

---

## 七、移交指令

> 以下內容供 Kimi k2.5 接手後使用

Kimi 收到此文件後，請依序：
1. 讀完本文件
2. 連線 `http://localhost:3011/api/openclaw/tasks` 確認面板可用
3. 按 Phase 1 建立 4 個任務（見第四節）
4. 設定 priority 和 agent 標籤
5. 每個任務的 description 要包含：具體檔案路徑、改動目標、驗收標準
6. 建立完畢後回報老蔡
