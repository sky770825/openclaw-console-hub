# ⚡ WAKE_STATUS — Claude Code 醒來時讀這裡
> 同步時間：2026-03-01 19:32:03
> 每次 Claude Code 啟動自動更新

## 🔋 API 額度表（自動檢測）

| Provider | 模型 | 免費配額 | 狀態 |
|----------|------|---------|------|
| Google | gemini-2.5-flash | 1500 req/day | 🟡 未知(400) |
| Google | gemini-3-flash-preview | 1000 req/day | 🟡 未知(400) |
| Google | gemini-2.5-pro | 50 req/day | 🟡 未知(400) |
| Kimi | kimi-k2.5 | 免費無限 | ✅ 備援 |
| Ollama | qwen3:8b | 本地無限 | ✅ 本地 |

> 🤖 **NEUXA 目前主模型**：`google/gemini-2.5-flash`
> ⚠️ 如果 NEUXA 不回應 → 改 openclaw.json `agents.defaults.model.primary` 再 kill -HUP $(pgrep openclaw-gateway)

---

## 🟢 系統狀態
- **後端 Server (3011)**：✅ 在線
- **達爾工作目錄**：✅ /Users/sky770825/Downloads/openclaw-console-hub-main
- **Deputy 模式**：啟用 | 最後跑: 2026-02-19T02:00
- **Auto-Executor**：運行中 | 最後執行: 2026-03-01T11:30
- **FADP 聯盟協防**：成員:0 封鎖IP:0 封鎖Token:0

## 🎯 任務板快照
總計 17 個任務｜done:6  ready:11

### 最近待處理任務（前5）
- [ready] P2 [P0] 結晶化[BIZ_TYPE_RE]評估邏輯並注入 jushang-leads
- [ready] P2 [P1] 實作 Supabase pgvector 語義知識庫
- [ready] P2 [核心進化] 實作 Commander's Scepter：升級 web-monitor 為自動派工代理
- [ready] P2 [SaaS] 實作資料庫多租戶欄位遷移腳本
- [ready] P2 [P0] 語義大腦：實作 pgvector 儲存與搜尋核心

## 📋 最近活動
(無活動記錄)

## 🔀 最新 Git Commits
  a711e2de chore: 清理無用檔案 scan-v2.sh
  75fa5511 chore: 版本號統一更新至 v2.4.0 / NEUXA v5.3
  77fe2b75 feat: 達爾學會自己索引向量庫 — index_file + reindex_knowledge

## 🧠 NEUXA 動態
- **Gateway**：✅ 運行中 (PID 13872)
- **最新對話: 2026-02-28.md (16:50)**
- **GROWTH.md 最後更新: 2026-03-01 19:18**
- **review/pending: 0 份待審**
- **NEUXA memory 目錄**：~/.openclaw/workspace/memory/（讀最新 .md 可銜接）

## 🤝 協作指引
1. **達爾（NEUXA）** 的 Telegram bot 在運行中，記憶在 ~/.openclaw/workspace/memory/
2. **review/pending**：有待審文件就優先處理
3. **任務優先**：先看上面的「待處理任務」，有 running 的先跟進
4. **Server 重啟**：如果 Server 離線，用 launchctl stop/start com.openclaw.taskboard

## 🚨 立即行動清單
- ✅ 讀取 MEMORY.md 了解專案狀態
- ✅ 確認最新 git commits 是否需要後續行動
