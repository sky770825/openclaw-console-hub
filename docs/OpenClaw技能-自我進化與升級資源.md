# OpenClaw 技能：自我進化與升級資源

整理可讓 Agent 自我進化、升級或強化記憶的**技能**與**外掛**，以及 GitHub / ClawHub 上的相關資源。

---

## 一、你目前已有的相關技能（workspace skills）

以下已在 `~/.openclaw/workspace/skills/` 內，可直接用或搭配 cron／heartbeat 使用：

| 技能 | 用途 | 備註 |
|------|------|------|
| **daily-evolution** | 每日自我進化（潛龍計劃）：對話整理 → 工具盤點 → 最佳實踐固化 → 報告生成 | 建議用 cron 每日觸發（如 00:00 UTC+8），或手動說「執行潛龍計劃」 |
| **adaptive-reasoning** | 依任務複雜度調整推理層級（是否開 reasoning mode） | 每次請求前自我評估，可省 token 或提高複雜題品質 |
| **llm-supervisor** | 遇到 rate limit 時優雅 fallback（如切 Ollama）、通知使用者 | 減少中斷，維持可用性 |
| **ceo-delegation** | CEO 式委派：派子代理執行、監控、驗收，自己不親自動手 | 適合多任務並行、需要「協調者」的場景 |
| **ec-session-cleaner** | 把 session JSONL 轉成可讀 Markdown，方便回顧與沉澱 | 間接支援「從對話中學習」 |
| **session-logs** | 記錄／查詢 session 日誌 | 可與 daily-evolution 或記憶維護搭配 |

**小結**：你已有「每日進化 + 推理調整 + 委派 + 日誌／清理」的組合；若要再加強，可加上「長期記憶」或「自我改寫／寫新技能」的外掛（見下一節）。

---

## 二、可強化自我進化／升級的外掛與專案（GitHub）

這些是 **Plugin** 或獨立專案，安裝後可補足「記憶」與「自我改寫」能力。

### 1. Foundry — 自我改寫、觀察學習、寫新技能

- **Repo**: [lekt9/openclaw-foundry](https://github.com/lekt9/openclaw-foundry)
- **一句話**：觀察你的工作流程 → 研究文件 → 學到模式 → 寫出新 extension / skill / hook → 部署；成功模式可「結晶」成專用工具（例如 5+ 次、70%+ 成功率即自動化）。
- **安裝**：
  ```bash
  openclaw plugins install @getfoundry/foundry-openclaw
  ```
  或手動在 `~/.openclaw/openclaw.json` 的 `plugins.entries` 加 `"foundry": { "enabled": true }`，再重啟 gateway。
- **重點能力**：
  - `foundry_research`：搜 docs.openclaw.ai
  - `foundry_learnings`：看已記錄的模式與工作流
  - `foundry_write_skill` / `foundry_write_extension` / `foundry_write_hook`：寫新技能／擴充／hook
  - `foundry_extend_self`：改寫 Foundry 自己，實現遞迴自我升級
- **適合**：希望 Agent 不只「用」技能，還能「長出」新技能、並隨你的使用方式演進。

### 2. Supermemory — 長期記憶與回憶

- **Repo**: [supermemoryai/clawdbot-supermemory](https://github.com/supermemoryai/openclaw-supermemory)（OpenClaw 相容）
- **一句話**：雲端長期記憶，每輪自動 recall + 自動 capture，建用戶輪廓與過往對話脈絡。
- **安裝**：
  ```bash
  openclaw plugins install @supermemory/openclaw-supermemory
  ```
  需 [Supermemory Pro 或以上](https://console.supermemory.ai/billing)，並設定 `SUPERMEMORY_OPENCLAW_API_KEY`（或寫在 `openclaw.json`）。
- **重點能力**：
  - Auto-Recall：每輪前注入相關記憶
  - Auto-Capture：每輪後存對話
  - 工具：`supermemory_store`、`supermemory_search`、`supermemory_forget`、`supermemory_profile`
- **適合**：想要「跨 session、跨頻道」的持久記憶與個人化，讓自我進化（如 daily-evolution）有更多可回顧的素材。

---

## 三、GitHub / ClawHub 上的技能資源

### 官方與社群

| 資源 | 說明 | 連結 |
|------|------|------|
| **ClawHub** | 公開技能註冊表，可瀏覽、安裝、搜尋（含 vector search） | https://clawhub.ai（或 https://clawhub.com） |
| **openclaw/clawhub** | ClawHub 的原始碼與規格 | https://github.com/openclaw/clawhub |
| **openclaw/skills** | 從 ClawHub 備份的 skill 版本存檔 | https://github.com/openclaw/skills |
| **OpenClaw 文件 — Skills** | 技能載入順序、格式、gating、ClawHub 用法 | https://docs.openclaw.ai/tools/skills |

### 安裝技能（從 ClawHub）

```bash
# 安裝到目前工作目錄的 skills/（或設定的 workspace）
npx clawhub@latest install <skill-slug>

# 更新已安裝技能
npx clawhub@latest update --all

# 掃描並發佈你對技能的更新
npx clawhub@latest sync --all
```

### 安全提醒（ClawHub / 第三方技能）

- 第三方技能應視為**非受信任**：安裝前建議閱讀 SKILL.md 與腳本。
- 研究報告指出 ClawHub 上曾有惡意技能與憑證洩漏；建議：
  - 使用工作區內的 **GuavaGuard**（`guava-guard.js`）掃描再安裝；
  - 僅從信任來源或已審閱過的技能安裝。
- 官方建議：沙盒執行未信任輸入，見 [Security](https://docs.openclaw.ai/gateway/security)。

---

## 四、如何搭配使用（建議）

1. **維持現有**：繼續用 **daily-evolution**（cron）+ **adaptive-reasoning** + **llm-supervisor**，必要時加 **ceo-delegation**、**session-logs**／**ec-session-cleaner**。
2. **加強記憶**：若希望 Agent 有跨 session 的長期記憶與用戶輪廓 → 安裝 **Supermemory** plugin。
3. **加強自我升級**：若希望 Agent 能從你的工作流學到模式、並寫出新技能／擴充 → 安裝 **Foundry** plugin。
4. **找更多技能**：到 https://clawhub.ai 用關鍵字或向量搜尋（例如 evolution、memory、delegation、workflow）；安裝前用 GuavaGuard 掃描並閱讀內容。

若你之後裝了 Foundry 或 Supermemory，可把實際使用方式與路徑補進 TOOLS.md 或 MEMORY，方便小蔡與老蔡查詢。
