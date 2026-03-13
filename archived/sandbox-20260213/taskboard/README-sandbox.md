# 任務板中控系統 - Task Board Controller

## 🎯 系統簡介

任務板中控執行代理系統，自動監控、排序並執行任務。

## 📁 檔案結構

```
.
├── tasks.txt                    # 任務板主檔案（純文字格式）
├── MEMORY.md                    # 主人記憶庫
├── task-queue.json              # JSON 格式任務備份
├── README-taskboard.md          # 本說明文件
│
├── scripts/
│   ├── dashboard-monitor.sh     # 📊 監控儀表板（支援顏色輸出）
│   ├── task-executor.sh         # ⚡ 任務執行器
│   ├── task-controller.sh       # 🤖 中控主程式（持續監控）
│   └── daily-check.sh           # 📅 每日例行檢查
│
├── docs/
│   └── automation-workflow.md   # 自動化工作流程說明
│
└── logs/                        # 日誌目錄
    ├── task-executor.log
    └── daily.log
```

## 🚀 快速開始

### 查看任務板狀態
```bash
./scripts/dashboard-monitor.sh
```

### 取得下一個待執行任務
```bash
./scripts/task-executor.sh
```

### 啟動持續監控模式
```bash
./scripts/task-controller.sh
```

### 執行每日檢查
```bash
./scripts/daily-check.sh
```

## 📝 任務格式

在 `tasks.txt` 中添加任務：

```
TASK|pending|high|任務標題|任務描述|創建時間|更新時間
```

欄位說明：
| 欄位 | 說明 |
|------|------|
| TASK | 固定前綴 |
| pending/in_progress/completed | 任務狀態 |
| high/medium/low | 優先級 |
| 標題 | 簡短任務名稱 |
| 描述 | 詳細說明 |
| 創建時間 | ISO 格式時間 |
| 更新時間 | ISO 格式時間 |

## 🔄 工作流程

1. **新增任務** → 編輯 `tasks.txt`
2. **查看狀態** → 執行 `dashboard-monitor.sh`
3. **執行任務** → 中控代理依優先級自動執行
4. **完成標記** → 更新任務狀態為 `completed`

## 🎨 顏色標示

| 符號 | 意義 |
|------|------|
| 🔴 / 紅色 | 高優先級 |
| 🟡 / 黃色 | 中優先級 |
| 🟢 / 綠色 | 低優先級 |
| 🔵 / 藍色 | 進行中 |

## 👤 系統建立資訊

- **建立日期**: 2026-02-13
- **版本**: 1.0
- **建立者**: 任務板中控執行代理
