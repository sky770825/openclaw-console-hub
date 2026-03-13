# n8n 整合架構決策

**日期**: 2026-02-15
**決策者**: 主人 + 達爾
**狀態**: ✅ 已實施

---

## 決策內容

### 架構設計
```
主人 → 達爾（決策層，$0.05）→ n8n/Codex（執行層）→ Telegram
        ↓
   指派後不參與（省$0）
   執行者直接回報
```

### 成本優化策略
- **達爾角色**: 理解需求 + 決策派發（只收 Input 成本）
- **n8n角色**: 零Token執行層（定時任務、資料彙整、簡單邏輯）
- **直接回報**: 執行結果不經達爾轉述，直接發Telegram

### 預期節省
- **Daily Wrap-up**: Kimi $0.45/次 → n8n $0 = **100%節省**
- **月節省**: ~$13.50
- **複雜任務**: 節省 20-30%（省掉中間轉述層）

---

## 實施細節

### 1. Telegram Bot配置
- **Bot**: @caij_n8n_bot
- **Token**: 8357299731:AAHrBnVCEGjGy6b0g-3JhBArMnM9kt__Ncg（新，2026-02-15更新）
- **舊Token**: 已revoke（因暴露事件）
- **Target Chat ID**: 5819565005

### 2. n8n Skill建立
- **位置**: `~/.openclaw/workspace/skills/n8n/`
- **CLI工具**: `n8n-cli`（Basic Auth配置）
- **Webhook接收器**: `n8n-webhook-server.py`（port 5679）
- **管理指令**: `n8n-webhook start/stop/status`

### 3. MVP驗證成功 ✅
```
Webhook (localhost:5679) → Python處理 → Telegram Bot API → 主人
```
- 測試成功：收到測試訊息
- 延遲: < 3秒

### 4. 環境變數
```bash
TELEGRAM_BOT_TOKEN=✅（已配置）
TELEGRAM_CHAT_ID=5819565005
TASKBOARD_BASE_URL=http://host.docker.internal:3011
OPENCLAW_API_KEY=dev-key-123456
```

### 5. Daily Wrap-up Workflow
- **檔案**: `~/n8n-production/workflows/Daily-Wrap-up.no-llm.json`
- **功能**: 每日23:00自動發送任務摘要
- **特點**: 無LLM、零Token成本
- **狀態**: ✅已創建，待導入n8n UI並activate

---

## 技術細節

### n8n乾淨實例確認
- `OPENAI_API_KEY=` （空，未配置）
- `TELEGRAM_BOT_TOKEN=` （空，待配置）
- 無高成本API連接 ✅

### 可用服務整合
- **Qdrant**: port 6333（向量資料庫，閒置中）
- **PostgreSQL pgvector**: 已安裝（記憶快搜）
- **OpenClaw API**: http://localhost:3011

---

## 安全事項記錄

### ⚠️ Token暴露事件（2026-02-15）
1. **Telegram Bot Token**: 舊token曾暴露 → 已revoke並更新
2. **Supabase Service Key**: 曾暴露 → **需rotate（待處理）**

### 安全改進措施
- 所有敏感資料儲存於 `~/.openclaw/secrets/`
- 環境變數不commit到git
- Token使用後立即檢查是否外洩

---

## 下一步行動

- [x] n8n Skill建立
- [x] Telegram Bot配置
- [x] Webhook接收器建立
- [x] MVP通路驗證
- [x] Daily Wrap-up workflow創建
- [ ] 導入workflow到n8n UI
- [ ] 設定Telegram Credential
- [ ] Activate workflow
- [ ] 手動測試執行
- [ ] 驗證ROI（確認省下Token成本）
- [ ] **Rotate Supabase Service Key**

---

## 參考文件
- `memory/2026-02-15-n8n-progress-checkpoint.md`
- `memory/2026-02-15-n8n-setup-progress.md`
- `memory/discussions/2026-02-15-n8n-architecture-discussion.md`

---
**記錄者**: Claude
**記錄時間**: 2026-02-15 21:58
