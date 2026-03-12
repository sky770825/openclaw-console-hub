# OpenClaw Dashboard - 操作手冊

## 快速啟動

```bash
cd projects/dashboard/modules/web-ui
npm run dev
```

預設開啟: http://localhost:5173

## 功能操作

### 1. 總覽儀表板 (`/`)

顯示系統整體狀態：
- **任務統計** - 總數、執行中、已完成、待處理
- **最近任務** - 5 筆最新任務動態
- **模型狀態** - 7 模型負載與運行狀態
- **快速操作** - 系統巡檢、成本報告、警示查看

### 2. 任務板 (`/tasks`)

Kanban 看板檢視 148 個任務：

| 欄位 | 數量 | 顏色 |
|------|------|------|
| 待處理 | 50 | 灰色 |
| 就緒 | 30 | 藍色 |
| 執行中 | 12 | 琥珀色 |
| 已完成 | 56 | 綠色 |

**篩選功能**:
- 搜尋欄：關鍵字搜尋任務標題
- Agent 篩選：選擇特定 Agent 的任務

### 3. 模型監控 (`/models`)

7 模型狀態與成本追蹤：

**模型列表**:
- Kimi K2.5
- Grok 4.1
- Gemini Flash
- Codex
- Cursor
- Ollama/Qwen3
- Opus

**圖表**:
- 各模型成本長條圖
- 使用量分佈圓餅圖
- 每日成本趨勢線圖

### 4. 專案管理 (`/projects`)

專案卡片列表：
- 進度百分比視覺化
- 任務完成數統計
- 標籤分類
- 最近活動時間軸

### 5. Spawn Agent

點擊右上角「Spawn Agent」按鈕可觸發：
- 快速啟動新 Agent 任務
- (目前為 UI 示範功能)

## 響應式斷點

| 斷點 | 寬度 | 布局 |
|------|------|------|
| Mobile | < 640px | 單欄 |
| Tablet | 640-1024px | 雙欄 |
| Desktop | > 1024px | 四欄/三欄 |

## 快捷鍵

目前無鍵盤快捷鍵，所有操作透過 UI 完成。

## 故障排除

### 無法啟動
```bash
# 清除 node_modules 重新安裝
rm -rf node_modules package-lock.json
npm install
```

### Tailwind 樣式未生效
確保 `src/index.css` 正確引入：
```css
@import "tailwindcss";
```

### 頁面 404
確認 `react-router-dom` 已安裝：
```bash
npm install react-router-dom
```

## 開發注意事項

1. **唯讀介面** - 目前僅顯示模擬資料，不寫入任何檔案
2. **暗色主題** - 預設 slate-950 背景，勿改為亮色
3. **圖示使用** - 統一使用 lucide-react
4. **Tailwind v4** - 使用新版 `@import "tailwindcss"` 語法

## 未來擴充

- [ ] 連接真實 API 資料
- [ ] 任務拖曳排序
- [ ] 即時 WebSocket 更新
- [ ] 深色/亮色主題切換
- [ ] 多語言支援

## 相關文件

- 設計規格: `docs/design-spec.md`
- 系統總覽: `docs/SYSTEM-OVERVIEW.md`
- Multi-Agent 策略: `docs/MULTI-AGENT-STRATEGY.md`

---

最後更新: 2026-02-14
