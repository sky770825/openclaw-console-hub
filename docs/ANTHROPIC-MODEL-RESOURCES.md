# OpenClaw Anthropic 模型問題 - 完整資源索引

> 多方參考的除錯資源總整理

---

## 📚 官方資源

| 資源 | 網址 | 內容重點 |
|------|------|---------|
| **OpenClaw 官方文件 - Anthropic** | https://docs.openclaw.ai/providers/anthropic | 官方設定教學、API Key 與 setup-token 兩種認證方式、Prompt caching 配置 |
| **OpenClaw GitHub Issues #10301** | https://github.com/openclaw/openclaw/issues/10301 | Opus 4.6 支援請求，包含 "invalid config" 問題討論 |
| **OpenClaw GitHub Issues #10124** | https://github.com/openclaw/openclaw/issues/10124 | opus alias 對應問題、手動 patch 方法 |
| **OpenClaw GitHub Issues #9450** | https://github.com/openclaw/openclaw/issues/9450 | Gateway 成功但 Claude API 無回應問題（lane wait exceeded 錯誤） |

---

## 📝 部落格與教學文章

| 資源 | 網址 | 內容重點 |
|------|------|---------|
| **jangwook.net - Opus 4.6 設定教學** | https://jangwook.net/en/blog/en/openclaw-opus-4-6-setup-guide/ | **最完整教學！** 兩層設定架構、`mode: "merge"` 關鍵參數、完整 config 範例 |
| **velvetshark.com - 多模型路由** | https://velvetshark.com/openclaw-multi-model-routing | 成本優化、fallback chain 設定、不同任務用不同模型 |
| **amankhan1.substack.com - 入門教學** | https://amankhan1.substack.com/p/how-to-get-clawdbotmoltbotopenclaw | 硬體、帳號、電話號碼等實務設定 |
| **portkey.ai - 整合文件** | https://portkey.ai/docs/integrations/libraries/openclaw | Portkey + OpenClaw 整合、`mode: "merge"` 範例 |
| **OpenRouter 整合指南** | https://openrouter.ai/docs/guides/guides/openclaw-integration | OpenRouter 作為統一入口、簡化多 provider 配置 |

---

## 🦞 Moltbook 社群討論

### 直接相關的問題與解法

| 貼文 | 作者 | 問題 | 解法 |
|------|------|------|------|
| **OpenClaw: DeepSeek config looks right but still running on Claude?** | James | 設定 DeepSeek 但仍使用 Claude | **Config 檔案層級問題！** `~/.openclaw/openclaw.json` 會覆蓋 `~/.clawdbot/clawdbot.json` |
| **OpenClaw config issue - All models failed** | AlienBot | 多 provider 配置問題、rate_limit | 使用 `auth-profiles.json` 統一管理多個 API key |
| **OpenClaw Browser Control Service Unreachable** | MrNonce | Browser service 無法啟動 | Snap Chromium 的 AppArmor 限制、需安裝非 snap 版本 Chrome |
| **Fubot 的分享** | Fubot | Fixed a model configuration issue | 從 OpenAI 切換到 Anthropic Opus 的經驗 |
| **Javis 的筆記** | Javis | API redirect 問題 | `moltbook.com` 會 redirect 到 `www.moltbook.com` 並 strip Authorization header |

### Moltbook 上的關鍵討論

```
搜尋關鍵字：
- "openclaw config issue" → 15+ 相關貼文
- "anthropic model" → 多篇設定分享
- "404 error" → 解法討論
```

---

## 🔴 Reddit 討論

| 貼文 | 問題/內容 |
|------|---------|
| **r/AI_Agents: "no output" errors** | Anthropic "no output" 錯誤、fallback 無效（48k tokens 超過 OpenAI 30k 限制） |
| **r/ClaudeAI: Opus 4.6 on OpenClaw** | ClawGPT UI、Opus 4.6 運行經驗 |
| **r/ClaudeCode: Setup in under a minute** | 快速設定方法、Anthropic auth 問題 |
| **r/ClaudeAI: Claude Code vs OpenClaw** | 兩者差異、TOS 注意事項 |

---

## 🛠️ 常見問題分類與解法來源

### 1. Config 相關

| 問題 | 解法來源 |
|------|---------|
| "invalid config" | jangwook.net、Moltbook James |
| "unknown model" | GitHub #10301、jangwook.net |
| 設定完仍用舊模型 | Moltbook James（檔案層級問題） |
| Config 不生效 | GitHub #9450、Moltbook 討論 |

### 2. API Key 相關

| 問題 | 解法來源 |
|------|---------|
| API Key 衝突 | memory/2026-02-12.md（備份檔案清理） |
| 多 provider Key 管理 | Moltbook AlienBot（auth-profiles.json） |
| Rate limit | velvetshark.com（fallback chain） |
| 401 Invalid Authentication | Moltbook AlienBot、OpenRouter 整合 |

### 3. 連線相關

| 問題 | 解法來源 |
|------|---------|
| "404 Not Found" | jangwook.net、docs.openclaw.ai |
| Gateway 成功但無回應 | GitHub #9450 |
| Browser service timeout | Moltbook MrNonce |

---

## 🔗 替代方案與整合

| 方案 | 優點 | 參考 |
|------|------|------|
| **OpenRouter** | 統一入口、簡化多 provider 配置 | openrouter.ai/docs |
| **Portkey** | 進階路由、成本控管 | portkey.ai/docs |
| **AnyRouter** | 免費 Claude Opus 4.5 額度 | Moltbook AnyRouterBot |

---

## 📋 除錯檢查清單（多方位）

### 層級 1：Config 檔案
- [ ] 檢查 `~/.openclaw/openclaw.json` 存在且格式正確
- [ ] 檢查 `~/.clawdbot/clawdbot.json` 是否被覆蓋（Moltbook James 案例）
- [ ] 確認 `"mode": "merge"` 存在
- [ ] 確認兩層設定都有（providers + agents.defaults）

### 層級 2：API Key
- [ ] 檢查 `~/.openclaw/config/anthropic.env`
- [ ] 清理 `.bak*` 備份檔案
- [ ] 驗證 Key 有效性：`curl -H "Authorization: Bearer $KEY" https://api.anthropic.com/v1/models`

### 層級 3：服務狀態
- [ ] `openclaw models status` 檢查模型狀態
- [ ] `openclaw gateway restart` 重啟 Gateway
- [ ] 開新 Session（`/new`）

### 層級 4：進階診斷
- [ ] 檢查 `lane wait exceeded` 錯誤（GitHub #9450）
- [ ] 檢查 `auth-profiles.json` 配置（多 provider）
- [ ] 考慮使用 OpenRouter 簡化配置

---

## 🆘 緊急聯絡與社群

| 資源 | 用途 |
|------|------|
| **OpenClaw Discord** | 即時社群支援 |
| **Moltbook m/openclaw-explorers** | Agent 社群討論 |
| **GitHub Issues** | 官方 bug 回報 |
| **Anthropic Support** | https://support.anthropic.com/ |

---

## 💡 多方位除錯策略

1. **官方文件優先**：docs.openclaw.ai 永遠是最準確的
2. **社群搜尋**：Moltbook、Reddit、Discord 可能有相同問題的討論
3. **GitHub Issues**：查看是否有已知的 bug 或 workaround
4. **替代方案**：OpenRouter、Portkey 等整合方案可繞過複雜配置
5. **簡化測試**：先用最基本的 config 測試，再逐步增加複雜度

---

*最後更新：2026-02-12*  
*資源數量：20+ 個來源*
