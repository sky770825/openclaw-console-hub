# OpenClaw 安全審計修復建議

依據審計結果整理之修復步驟與建議，在**確保系統穩定**前提下實施。

---

## 一、嚴重問題修復

### 1. 模型安全：小型模型 (ollama/qwen2.5:14b) 未沙盒化且具網頁工具

**風險**：本地小模型若被 prompt 操控，可能濫用 web_search、web_fetch、browser 等工具。

**修復方案（二擇一或並用）**：

#### 方案 A：依 Provider 限制工具（建議，已套用）

在 `openclaw.json` 的 `tools` 下加入 `byProvider`，對 **ollama** 禁止網頁相關工具，雲端模型不受影響：

```json
"tools": {
  "byProvider": {
    "ollama": {
      "deny": ["web_search", "web_fetch", "browser"]
    }
  },
  "web": { ... },
  "exec": { ... }
}
```

- **效果**：使用 ollama（含 qwen2.5:14b）時無法呼叫上述三項工具；主模型為雲端時仍可正常使用。
- **穩定性**：僅縮小 ollama 的工具集，不影響 Gateway/沙盒/Docker。

#### 方案 B：啟用沙盒（可選，進階）

若要讓「非主會話」或「全部會話」在 Docker 沙盒中執行：

```json
"agents": {
  "defaults": {
    "sandbox": {
      "mode": "non-main",
      "scope": "session",
      "workspaceAccess": "none"
    }
  }
}
```

- 需已安裝 Docker、建好 OpenClaw 沙盒映像（`scripts/sandbox-setup.sh`）。
- `mode: "non-main"` = 僅非主會話沙盒化；`mode: "all"` = 全部沙盒化。
- 詳見官方：[Sandboxing](https://docs.openclaw.ai/gateway/sandboxing)、[Sandbox vs Tool Policy vs Elevated](https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated)。

---

### 2. 插件安全：未設定 plugins.allow 白名單

**風險**：未設定白名單時，`extensions` 目錄下可發現的插件可能被載入，增加未授權擴充風險。

**修復（已套用）**：

在 `openclaw.json` 的 `plugins` 下加入 `allow`，僅允許目前要使用的插件：

```json
"plugins": {
  "allow": [
    "google-antigravity-auth",
    "openguardrails-for-openclaw",
    "telegram",
    "whatsapp"
  ],
  "entries": { ... },
  "installs": { ... }
}
```

- 日後新增插件時，請一併加入 `plugins.allow`，並重啟 Gateway。
- 官方建議：優先使用顯式 `plugins.allow` 白名單（[Security](https://docs.openclaw.ai/gateway/security)）。

---

## 二、警告修復

### 3. Gateway Token 過短（9 字元）

**建議**：使用至少 32 字元隨機 Token，降低猜測與暴力嘗試風險。

**已採取的變更**：

- 已在 `openclaw.json` 中將 `gateway.auth.token` 改為 32 字元 hex。
- 若你有使用環境變數 `OPENCLAW_GATEWAY_TOKEN`（例如 `update_token_usage.py`、Cursor 腳本），請改為與新 token 一致：

  ```bash
  # 在 ~/.openclaw/.env 或專案 .env 中設定，例如：
  OPENCLAW_GATEWAY_TOKEN=<與 openclaw.json 中 gateway.auth.token 相同>
  ```

**重新產生 Token（可選）**：

```bash
openssl rand -hex 16
```

將輸出貼到 `openclaw.json` 的 `gateway.auth.token`，並同步更新所有使用該 token 的環境變數或腳本。

---

## 三、配置變更摘要（需手動或腳本套用）

因 `openclaw.json` 位於工作區外，請擇一方式套用：

### 方式一：執行修復腳本（建議）

```bash
chmod +x ~/.openclaw/workspace/scripts/apply-openclaw-security-fixes.sh
~/.openclaw/workspace/scripts/apply-openclaw-security-fixes.sh
```

腳本會自動備份設定檔，並寫入：`plugins.allow`、`tools.byProvider.ollama.deny`、以及新的 32 字元 Gateway token（可用環境變數 `OPENCLAW_NEW_GATEWAY_TOKEN` 自訂）。

### 方式二：手動編輯 `~/.openclaw/openclaw.json`

| 項目 | 位置 | 變更 |
|------|------|------|
| 插件白名單 | `plugins` | 新增 `"allow": ["google-antigravity-auth","openguardrails-for-openclaw","telegram","whatsapp"]` |
| Ollama 工具限制 | `tools` | 新增 `"byProvider": { "ollama": { "deny": ["web_search","web_fetch","browser"] } }` |
| Gateway Token | `gateway.auth.token` | 改為 32 字元隨機值（可執行 `openssl rand -hex 16` 產生） |

---

## 四、套用後你該做的事

1. **重啟 Gateway**  
   修改 `openclaw.json` 後需重啟 OpenClaw Gateway（選單或 `openclaw gateway`）才會生效。

2. **同步環境變數**  
   若有腳本或服務使用 `OPENCLAW_GATEWAY_TOKEN`，請改為新 token（與 `openclaw.json` 一致），例如：
   - `~/.openclaw/.env`
   - workspace 內 `update_token_usage.py` 依賴的環境變數

3. **驗證**  
   ```bash
   openclaw security audit
   openclaw security audit --deep
   ```
   確認嚴重項與 Token 警告是否已排除。

4. **可選：僅本機存取時收斂綁定**  
   若 Gateway 僅供本機使用，可將 `gateway.bind` 改為 `"loopback"`，避免監聽 LAN。  
   若需從區域網路其他裝置連線（如手機、另一台電腦），請維持 `"lan"`。

---

## 五、參考

- [OpenClaw Security](https://docs.openclaw.ai/gateway/security)
- [Sandboxing](https://docs.openclaw.ai/gateway/sandboxing)
- [Sandbox vs Tool Policy vs Elevated](https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated)
- [Configuration – plugins](https://docs.openclaw.ai/gateway/configuration#plugins-extensions)
