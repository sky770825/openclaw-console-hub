# 達爾維護助手 Telegram Bot

> **版本**: 1.0
> **Bot**: @caij_n8n_bot (現已升級為維護助手)
> **狀態**: ✅ 運行中

---

## 📱 快速開始

### 第一步：開啟 Telegram，找到 @caij_n8n_bot

### 第二步：發送 `/start`

你會看到歡迎訊息和快速指令。

### 第三步：試試看！

```
/health        - 看看達爾健康嗎？
/memory status - 記憶系統如何？
/tasks recent  - 最近做了什麼？
```

---

## 🎯 核心功能

### 1. 系統健康檢查 (`/health`)

**一鍵檢查達爾所有核心系統**

```
你: /health

🏥 達爾健康檢查報告

✅ Ollama: 正常 (10 個模型)
✅ Qdrant: 正常 (3325 chunks)
✅ OpenClaw Gateway: 正常
✅ PM2 ai-bot: 正常
⚠️ 記憶服務器: 未運行
✅ 磁碟空間: 238GB 可用

📊 總評: 良好（1 個警告）
💡 建議: 使用 /fix all 自動修復
```

**什麼時候用**：
- 每天早上檢查一次
- 感覺達爾怪怪的時候
- 重啟電腦後

---

### 2. 一鍵修復 (`/fix`)

**智能診斷並修復常見問題**

**可用選項**：
```
/fix bots     - 修復 Telegram Bots
/fix memory   - 修復記憶系統
/fix gateway  - 修復 OpenClaw Gateway
/fix all      - 全系統檢測修復
```

**範例**：
```
你: /fix bots

🔧 開始修復: bots...

[執行修復...]

✅ 修復完成

• PM2 ai-bot 已修復
• Gateway 已重啟
• Token 驗證成功
```

**什麼時候用**：
- `/health` 顯示有錯誤時
- Bot 無回應時
- 系統異常時

---

### 3. 記憶系統管理 (`/memory`)

**管理達爾的記憶系統**

**可用選項**：
```
/memory status             - 記憶系統狀態
/memory server start       - 啟動記憶服務器
/memory server stop        - 停止記憶服務器
/memory server status      - 查看服務器狀態
/memory index              - 觸發向量索引
/memory search <關鍵字>    - 智能召回搜尋
```

**範例 1：啟動記憶服務器**
```
你: /memory server start

🧠 正在啟動記憶記錄服務器...
✅ 服務器已啟動 (PID: 12345)
📝 端點: http://localhost:8765/record
💚 健康檢查: 通過
```

**範例 2：觸發向量索引**
```
你: /memory index

🔍 檢查是否需要索引...
⚠️ 距離上次索引已超過 24 小時

開始執行向量索引...
⏱️ 預計需要 1-2 分鐘

[索引中...]

✅ 索引完成！
📊 檔案: 225 個
📦 Chunks: 3401 個
⏱️ 耗時: 67 秒
```

**範例 3：智能召回**
```
你: /memory search Telegram Bot 修復

🔍 搜尋記憶: Telegram Bot 修復...

🧠 智能召回結果

查詢: `Telegram Bot 修復`

找到 3 個相關記憶:

1. 📄 TELEGRAM-BOT-RECOVERY-2026-02-16.md
   相似度: 92%
   「完整修復流程，包含診斷、修復、驗證」

2. 📄 task-history.md
   相似度: 87%
   「2026-02-16 01:15 - Telegram Bot 雙修復」

3. 📄 recover-telegram-bots.sh
   相似度: 85%
   「一鍵修復腳本，支援自動診斷」
```

**什麼時候用**：
- 需要使用 n8n 記錄記憶時（確保服務器運行）
- 新增很多檔案後（觸發索引）
- 想查詢過去的工作（智能召回）

---

### 4. 任務歷史查詢 (`/tasks`)

**查詢 Autopilot 任務執行歷史**

**可用選項**：
```
/tasks recent            - 最近 10 筆任務
/tasks today             - 今日任務
/tasks search <關鍵字>   - 搜尋任務
```

**範例 1：查看最近任務**
```
你: /tasks recent

📝 最近任務 (前 10 筆)

1. ✅ 向量索引 | 2026-02-16 01:37
   檔案:223 | Chunks:3378 | 耗時:45s

2. ✅ Telegram Bot 修復 | 2026-02-16 01:15
   修復 @caij_n8n_bot + @xiaoji_cai_bot

3. ✅ 每日摘要生成 | 2026-02-15 23:45
   生成 5 條摘要並發送

... (共 10 筆)
```

**範例 2：搜尋任務**
```
你: /tasks search 索引

📝 搜尋結果 (3 筆)

1. ✅ 向量索引 | 2026-02-16 01:37
   檔案:223 | Chunks:3378

2. ✅ 向量索引 | 2026-02-15 12:30
   檔案:220 | Chunks:3301

3. ✅ 向量索引 | 2026-02-14 08:15
   檔案:215 | Chunks:3245
```

**什麼時候用**：
- 想知道達爾最近做了什麼
- 查詢特定任務的執行記錄
- 確認任務是否成功

---

### 5. 系統狀態 (`/status`)

**查看各系統運行狀態**

**可用選項**：
```
/status all      - 完整狀態報告
/status ollama   - Ollama 模型狀態
/status memory   - 記憶系統狀態
/status bots     - 所有 Bot 狀態
```

**範例**：
```
你: /status all

📊 查詢狀態: all...

🤖 Ollama
├─ 狀態: ✅ 運行中
├─ 模型: 10 個
└─ 已載入:
   • deepseek-r1:8b (5.2GB)
   • qwen3:8b (4.9GB)
   • nomic-embed-text (274.3MB)
   ... 還有 7 個模型

📡 Telegram Bots
├─ @caij_n8n_bot: ✅ online
├─ @xiaoji_cai_bot: ✅ 正常
└─ @ollama168bot: ✅ 正常 (你在這裡)
```

---

### 6. Bot 管理 (`/bots`)

**管理所有 Telegram Bots**

**可用選項**：
```
/bots list          - 列出所有 Bot
/bots status        - 檢查 Bot 狀態
/bots logs <name>   - 查看 Bot 日誌
```

**範例**：
```
你: /bots list

🤖 Telegram Bots 列表

1. @caij_n8n_bot
   └─ 狀態: ✅ online
   └─ 服務: PM2 dar-bot
   └─ Uptime: 45 分鐘

2. @xiaoji_cai_bot
   └─ 狀態: ✅ 正常
   └─ 服務: OpenClaw Gateway

3. @ollama168bot
   └─ 狀態: ✅ 正常 (你在這裡)
   └─ 服務: PM2 dar-bot

💡 使用 /bots logs <name> 查看日誌
```

---

### 7. 快速指令 (`/quick`)

**快速執行常用維護指令**

**可用選項**：
```
/quick backup    - 立即備份核心檔案
/quick clean     - 清理臨時檔案
/quick restart   - 重啟所有服務
```

**範例 1：備份**
```
你: /quick backup

💾 開始備份核心檔案...

✅ 備份完成

📁 位置: ~/Desktop/達爾/backups/2026-02-16-0140/
📝 包含:
• MEMORY.md
• SOUL.md
• BOOTSTRAP.md
• task-history.md
```

**範例 2：重啟所有服務**
```
你: /quick restart

🔄 重啟所有服務...
⏱️ 這可能需要 30 秒

[重啟中...]

✅ 重啟完成

• PM2 dar-bot: ✅
• OpenClaw Gateway: ✅
• 記憶服務器: ✅
```

---

## 💡 使用場景

### 場景 1：每天早上例行檢查

```
/health              # 檢查系統健康
/memory status       # 檢查記憶系統
/tasks today         # 看看今天有什麼任務
```

### 場景 2：Bot 突然無回應

```
/health              # 先看看哪裡有問題
/fix bots            # 修復 Telegram Bots
/bots status         # 確認修復成功
```

### 場景 3：新增很多檔案後

```
/memory index        # 觸發向量索引
/memory status       # 確認索引成功
```

### 場景 4：想查過去的工作

```
/tasks search 索引   # 搜尋特定任務
/memory search XXX   # 智能召回相關記憶
```

### 場景 5：重啟電腦後

```
/health              # 檢查所有服務
/fix all             # 如果有問題就修復
/memory server start # 啟動記憶服務器
```

---

## 🔐 安全性

### 權限控制

- ✅ **僅管理員可用**：Bot 只回應你的 Chat ID
- ✅ **Token 保護**：Bot Token 存在 PM2 環境變數中
- ✅ **腳本限制**：只能執行預定義的維護腳本

### 不會執行的操作

- ❌ 刪除重要檔案
- ❌ 修改系統配置（除非明確要求）
- ❌ 執行任意指令
- ❌ 訪問敏感資料

---

## 🛠️ 技術細節

### 架構

```
Telegram API
    ↓
@caij_n8n_bot
    ↓
dar-maintenance-bot.js (PM2)
    ↓
維護腳本 (scripts/)
    ↓
達爾系統
```

### 檔案位置

| 項目 | 位置 |
|------|------|
| Bot 程式 | `~/.openclaw/workspace/skill-github-automation/scripts/dar-maintenance-bot.js` |
| PM2 配置 | `~/.openclaw/workspace/skill-github-automation/ecosystem.config.js` |
| 維護腳本 | `~/.openclaw/workspace/scripts/` |
| 日誌 | `~/.pm2/logs/dar-bot-*.log` |

### PM2 管理

```bash
# 查看狀態
pm2 status dar-bot

# 查看日誌
pm2 logs dar-bot

# 重啟
pm2 restart dar-bot

# 停止
pm2 stop dar-bot

# 開機自啟
pm2 startup
pm2 save
```

---

## 📊 指令速查表

| 分類 | 指令 | 說明 |
|------|------|------|
| **基本** | `/start` | 開始使用 |
| | `/help` | 查看所有指令 |
| **健康** | `/health` | 系統健康檢查 |
| | `/status [target]` | 查看系統狀態 |
| **修復** | `/fix bots` | 修復 Telegram Bots |
| | `/fix memory` | 修復記憶系統 |
| | `/fix all` | 全系統修復 |
| **記憶** | `/memory status` | 記憶系統狀態 |
| | `/memory server [action]` | 服務器管理 |
| | `/memory index` | 觸發索引 |
| | `/memory search <關鍵字>` | 智能召回 |
| **任務** | `/tasks recent` | 最近任務 |
| | `/tasks today` | 今日任務 |
| | `/tasks search <關鍵字>` | 搜尋任務 |
| **Bot** | `/bots list` | 列出所有 Bot |
| | `/bots status` | Bot 狀態 |
| | `/bots logs <name>` | 查看日誌 |
| **快速** | `/quick backup` | 立即備份 |
| | `/quick clean` | 清理檔案 |
| | `/quick restart` | 重啟服務 |

---

## ❓ 常見問題

### Q: Bot 不回應怎麼辦？

**A**:
1. 檢查 PM2 狀態：`pm2 status dar-bot`
2. 查看日誌：`pm2 logs dar-bot --err`
3. 重啟 Bot：`pm2 restart dar-bot`

---

### Q: 可以同時有多個人使用嗎？

**A**: 不行。Bot 目前只允許特定 Chat ID (你的 ID) 使用，這是為了安全考量。

---

### Q: 執行指令會不會影響達爾的運行？

**A**: 不會。大部分指令只是查詢狀態，修復指令會安全地重啟服務，不會影響達爾的正常運作。

---

### Q: 可以遠端使用嗎？

**A**: 可以！只要手機有網路，隨時隨地都能透過 Telegram 維護達爾。

---

### Q: 指令執行失敗怎麼辦？

**A**:
1. 查看錯誤訊息
2. 使用 `/health` 檢查系統狀態
3. 如果還是不行，回到終端機手動執行腳本

---

## 🎉 特色優勢

### 1. 隨時隨地維護

✅ 不用打開電腦
✅ 不用連 SSH
✅ 手機就能操作

### 2. 簡單易用

✅ 指令清楚明瞭
✅ 有提示有說明
✅ 錯誤訊息友善

### 3. 安全可靠

✅ 權限控制嚴格
✅ 只執行預定義腳本
✅ 不會誤刪檔案

### 4. 功能完整

✅ 健康檢查
✅ 自動修復
✅ 記憶管理
✅ 任務查詢
✅ 快速備份

---

## 🚀 未來擴展

### 已規劃

- [ ] 定時健康檢查（每天早上 8 點自動發送報告）
- [ ] 錯誤自動通知（發現問題立即通知）
- [ ] 任務統計圖表（視覺化任務執行趨勢）
- [ ] 遠端日誌查看（直接在 Telegram 查看完整日誌）

### 可能新增

- [ ] 語音指令支援
- [ ] 多人協作（團隊模式）
- [ ] 自定義快捷指令
- [ ] Webhook 整合

---

**建立時間**: 2026-02-16
**維護者**: 達爾（Claude）
**版本**: 1.0

🦞 **OpenClaw Powered** | 智能 · 高效 · 隨時隨地
