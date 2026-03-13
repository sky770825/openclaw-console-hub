# 🐣 達爾系統總覽

> 最後更新：2026-02-14 01:50 GMT+8

---

## 一、Agent 戰力表

| Agent | 成本 | 強項 | 定位 |
|-------|------|------|------|
| **達爾（OpenClaw）** | 按模型計 | 指揮協調、工具調用、通訊、記憶、排程、瀏覽器 | 🧠 指揮官 |
| **Cursor Agent** | 訂閱制 ♾️ | 代碼生成、重構、專案開發、AI Review、即時編輯 | 💻 主力開發者 |
| **Codex** | 訂閱制 ♾️ | 自主編碼、PR 提交、長時間開發任務、沙盒執行 | 🏗️ 自動化工程師 |
| **Ollama 本地** | $0 | 簡單查詢、批次處理、離線可用 | ⚙️ 免費勞工 |
| **Sub-agents** | 按模型計 | 研究、分析、翻譯、長任務分拆 | 📋 特遣隊 |

### 分工原則
```
主人下指令
  → 達爾理解需求 → 拆解任務 → 分派
    ├─ 寫程式 / 改 code → Cursor 或 Codex（訂閱制，榨乾它！）
    ├─ 研究 / 分析 → spawn 子 Agent（免費模型優先）
    ├─ 簡單 / 批次 → Ollama（$0）
    ├─ 通訊 / 協調 / 記憶 → 達爾自己來
    └─ 重大決策 → Opus 4.6（貴但值得）
```

---

## 二、AI 模型庫

### 免費模型（日常優先用）

| Provider | 模型 | Context | 特點 |
|----------|------|---------|------|
| **Kimi** | K2.5 ⭐ 預設 | 128K | 免費無限、支援圖片 |
| **Kimi** | K2 Turbo | 262K | 免費、超長文本 |
| **Ollama** | Qwen3 8B | 32K | 本地、快速 |
| **Ollama** | Qwen2.5 14B | 128K | 本地、較強 |
| **Ollama** | DeepSeek R1 8B | 32K | 本地、推理 |
| **Ollama** | Llama 3.2 | 128K | 本地 |
| **OpenRouter** | DeepSeek R1 Free | 64K | 雲端免費、強推理 |
| **OpenRouter** | Llama 4 Maverick Free | 32K+ | 雲端免費 |
| **OpenRouter** | Gemini 2.5 Pro Exp Free | 1M | 雲端免費、超長文本 |
| **OpenRouter** | Nemotron Ultra Free | 128K | 雲端免費 |

### 付費模型（必要時用）

| Provider | 模型 | 成本等級 | 用途 |
|----------|------|---------|------|
| **Anthropic** | Haiku 4.5 | 💲 低 | 快速 Fallback |
| **Google** | Gemini 2.5 Flash | 💲 低 | 快速、長文本 |
| **Anthropic** | Sonnet 4.5 | 💲💲 中 | 研究、代碼 |
| **Google** | Gemini 2.5 Pro | 💲💲 中 | 推理、長文本 |
| **Anthropic** | Opus 4.6 | 💲💲💲 高 | 重大決策、複雜分析 |

---

## 三、已安裝 Skills（20 個）

### 核心技能
| Skill | 用途 |
|-------|------|
| **github** | GitHub 操作（issue、PR、CI） |
| **skill-creator** | 建立新 Skill |
| **clawhub** | 搜尋/安裝/發布 Skills |
| **playwright-scraper-skill** | 進階網頁爬蟲（反 bot） |
| **tavily-search** | 即時網路搜尋 |
| **web-fetch** | 網頁內容擷取 |
| **screen-vision** | macOS 螢幕 OCR |
| **session-logs** | 歷史對話搜尋 |
| **healthcheck** | 系統安全檢查 |
| **git-notes-memory** | Git-Notes 結構化記憶 |
| **triple-memory** | 三重記憶系統（LanceDB+Git+檔案） |
| **reflect-learn** | 自我學習，對話中提取教訓 |

### 生活工具
| Skill | 用途 |
|-------|------|
| **apple-notes** | Apple 備忘錄管理 |
| **apple-reminders** | Apple 提醒事項 |
| **things-mac** | Things 3 任務管理 |
| **imsg** | iMessage/SMS |
| **himalaya** | Email（IMAP/SMTP） |
| **gog** | Google Workspace（Gmail、Calendar、Drive） |

### 媒體工具
| Skill | 用途 |
|-------|------|
| **openai-image-gen** | AI 圖片生成 |
| **openai-whisper-api** | 語音轉文字 |
| **video-frames** | 影片截圖/剪輯 |
| **tmux** | 終端機遠端控制 |

### 新開發 Skills（本週）
| Skill | 用途 | 狀態 |
|-------|------|------|
| **file-sync-skill** | 檔案同步與備份（本地/雲端） | ✅ 完成 |
| **log-analyzer-skill** | 日誌分析與監控 | ✅ 完成 |
| **password-manager-skill** | 密碼管理與生成 | ✅ 完成 |

---

## 四、系統配置摘要

| 項目 | 設定 |
|------|------|
| OpenClaw 版本 | 2026.2.9 |
| Gateway | port 18789, local mode, LAN bind |
| Skills 數量 | 20 個 |
| 腳本數量 | 42 個（全部已加 set -e） |
| 記憶檔案 | 178 個（INDEX-v2 索引） |

---

## 五、本週重點更新

### ✅ P2 腳本錯誤處理強化
- **Task ID**: `p2-set-e-hardening-20260214`
- **狀態**: 完成，觀察期中（至 2026-02-15 01:46）
- **內容**: 42 個腳本添加 `set -e`，10 支關鍵腳本 Smoke Test 通過

### ✅ 新開發 Skills
- **file-sync-skill**: 本地/雲端檔案同步與備份
- **log-analyzer-skill**: 多格式日誌分析與監控
- **password-manager-skill**: 密碼管理與生成

### ✅ 記憶庫索引升級
- INDEX-v2 系統上線
- 178 個檔案分類完成
- 支援快速搜尋與統計

---

*此文件由達爾自動維護，有變更時更新。*
