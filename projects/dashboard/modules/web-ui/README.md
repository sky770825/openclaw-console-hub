# OpenClaw Dashboard Web UI

OpenClaw 中控台網頁界面 - React + Vite + Tailwind CSS 建置

## 功能特色

- 📊 **總覽儀表板** - 系統狀態一目了然
- 📋 **任務看板** - 148 個任務視覺化管理
- 🤖 **模型監控** - 7 模型狀態 + 成本圖表
- 📁 **專案管理** - 進度追蹤與活動時間軸
- ⚡ **Spawn Agent** - 一鍵啟動 Agent 執行

## 技術棧

- React 18
- Vite
- Tailwind CSS v4
- Recharts (圖表)
- Lucide React (圖示)
- React Router DOM

## 安裝與執行

```bash
# 進入專案目錄
cd projects/dashboard/modules/web-ui

# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置
npm run build

# 預覽
npm run preview
```

## 專案結構

```
web-ui/
├── docs/
│   ├── design-spec.md    # 設計規格
│   └── runbook.md        # 操作手冊
├── src/
│   ├── components/
│   │   └── Layout.jsx    # 佈局組件
│   ├── pages/
│   │   ├── Dashboard.jsx # 總覽頁面
│   │   ├── Tasks.jsx     # 任務板
│   │   ├── Models.jsx    # 模型監控
│   │   └── Projects.jsx  # 專案管理
│   ├── App.jsx           # 主應用
│   ├── main.jsx          # 入口
│   └── index.css         # 樣式
├── index.html
├── package.json
└── README.md
```

## 頁面說明

| 路徑 | 頁面 | 功能 |
|------|------|------|
| `/` | 總覽儀表板 | 系統統計、最近任務、模型狀態 |
| `/tasks` | 任務板 | Kanban 看板，148 任務分類顯示 |
| `/models` | 模型監控 | 7 模型狀態、成本圖表、使用統計 |
| `/projects` | 專案管理 | 專案卡片、進度追蹤、活動時間軸 |

## 設計系統

- **主色**: slate-900 (背景), slate-800 (卡片)
- **強調**: blue-500 (主要), green-500 (成功), amber-500 (警告)
- **字體**: Inter, system-ui
- **圓角**: rounded-xl (12px)

## 資料來源

目前使用模擬資料，可連接至:
- 任務: `~/.openclaw/tasks/`
- 模型狀態: `openclaw status`
- 專案: `projects/` 目錄

## 注意事項

- 暗色主題預設
- 唯讀介面，不寫入資料庫
- RWD 響應式設計
- 使用 lucide-react 圖示

---

idempotencyKey: dashboard-web-2024-0214
task_id: dashboard-web-v1
run_id: cursor-init-001
