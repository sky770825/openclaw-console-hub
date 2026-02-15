# Telegram 與 OpenClaw 穩定性建議

> 目標：減少因代碼或設定變動導致整個系統掛掉，讓 Telegram 與 OpenClaw 更穩定。

---

## 一、誰會影響誰（隔離關係）

| 元件 | 掛掉時影響範圍 | 不影響 |
|------|----------------|--------|
| **OpenClaw Gateway**（LaunchAgent） | Telegram 收發、所有透過 Gateway 的對話與模型呼叫 | 任務板網頁、任務板 API、n8n 觸發（仍可跑，但「執行 OpenClaw 任務」會失敗） |
| **任務板後端 server** | 任務板 API、從任務板觸發的「立即執行」、openclaw-taskboard 技能呼叫任務板時 | **Telegram 直接與 bot 對話**、Gateway 本身（兩者為獨立行程） |
| **openclaw.json 設定錯誤** | Gateway 啟動失敗或執行時報錯，可能導致 Telegram 無回應 | 任務板程式碼、Supabase |
| **openclaw 套件升級** | Gateway 可能需重啟或 plist 需重裝 | 任務板、Telegram Bot Token |

結論：**Telegram 與 bot 的對話只依賴 Gateway**。任務板或技能掛掉時，**不影響**你在 Telegram 裡直接跟 @bot 聊天。

---

## 二、已具備的穩定機制

1. **Gateway 與任務板分離**  
   Gateway 是獨立行程（LaunchAgent），任務板是另一個 Node 服務；任務板崩潰不會拉下 Gateway。

2. **LaunchAgent KeepAlive**  
   `ai.openclaw.gateway.plist` 設有 `KeepAlive=true`，Gateway 崩潰後會由 launchd 自動重啟。

3. **任務板呼叫 OpenClaw 有 timeout**  
   `executor-agents.ts` 裡用 `timeout 60 openclaw agent ...`，避免單一任務卡死過久。

4. **任務板 API 有限流與金鑰**  
   降低濫用或單一來源打掛後端的風險。

---

## 三、建議做法（降低代碼/設定變動的影響）

### 3.1 改設定前：備份與驗證

- **改 openclaw.json 前**  
  ```bash
  cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%Y%m%d-%H%M)
  ```
- **改完後**  
  ```bash
  openclaw doctor
  openclaw gateway restart
  ```
  若 doctor 報錯，用備份還原再排查。

### 3.2 升級 openclaw 後

- 每次 `npm update -g openclaw` 或重裝後：
  ```bash
  openclaw gateway restart
  ```
  若曾改過 Node 路徑或版本，可再跑一次：
  ```bash
  openclaw gateway install
  ```
  讓 plist 裡的 Node 路徑正確，避免因 Node 變動導致 Gateway 起不來。

### 3.3 避免 Gateway 重啟風暴（可選）

- LaunchAgent 的 `KeepAlive` 會在行程退出時重啟；若程式一直崩潰，會短時間內反覆重啟。
- 若**手動編輯** `~/Library/LaunchAgents/ai.openclaw.gateway.plist`，可加入（單位：秒）：
  ```xml
  <key>ThrottleInterval</key>
  <integer>10</integer>
  ```
  表示至少間隔 10 秒才再重啟，避免重啟風暴。  
  注意：之後執行 `openclaw gateway install` 可能會覆寫 plist，需再手動加一次或改用腳本注入。

### 3.4 任務板與技能的容錯

- **任務板後端**：若呼叫 `openclaw agent` 或任務板 API 的程式有 try/catch、timeout，可避免單一失敗拖垮整個請求；錯誤處理建議維持在現有 `error-handler` / `executor-agents` 流程。
- **openclaw-taskboard 技能**：若 `OPENCLAW_TASKBOARD_URL` 連不到（任務板掛掉或網路問題），只會是該次技能呼叫失敗，**不影響** Telegram 其他對話或 Gateway 其他功能。可確保技能端有 timeout，避免長時間卡住。

### 3.5 健康檢查與自動重啟（可選）

- 若希望「Gateway 卡住但行程沒退出」時也能恢復，可用定時健康檢查：
  - 專案內 **`scripts/gateway-healthcheck.sh`**：探測 `http://127.0.0.1:18789/`，失敗時執行 `openclaw gateway restart`，並有冷卻時間（預設 60 秒內不重複重啟）。
  - 用法：`./scripts/gateway-healthcheck.sh`；可設 `GATEWAY_PORT=18789`、`COOLDOWN=60`。
  - Cron 範例（每 5 分鐘）：`*/5 * * * * /path/to/scripts/gateway-healthcheck.sh >> /tmp/gateway-healthcheck.log 2>&1`
- 建議探測間隔不要太密（例如 5 分鐘一次），避免因短暫抖動就重啟。

### 3.6 代碼變動時的習慣

- **只改任務板**：部署或重啟任務板即可；不影響 Gateway，Telegram 照常可用。
- **只改 OpenClaw 設定**：改完跑 doctor + gateway restart；必要時用備份還原。
- **改 OpenClaw 套件或 Node**：升級後 gateway restart，必要時 gateway install。

---

## 四、快速對照：變動後該做什麼

| 變動類型 | 建議動作 |
|----------|----------|
| 編輯 `~/.openclaw/openclaw.json` | 先備份 → 改完 `openclaw doctor` → `openclaw gateway restart` |
| `npm update -g openclaw` | `openclaw gateway restart`（若 Node 路徑有變再跑 `openclaw gateway install`） |
| 更新 Node（nvm 等） | `openclaw gateway install` 再 `openclaw gateway restart` |
| 只部署任務板後端 / 前端 | 重啟或部署任務板即可，無需動 Gateway |
| 新增/修改 Telegram groupAllowFrom 等 | 改 openclaw.json 後依上表「編輯 openclaw.json」流程 |

---

## 五、小結

- **穩定性**：靠「Gateway 與任務板分離」+ 「KeepAlive 自動重啟」+ 「改設定前備份與 doctor 驗證」+ 「升級後重啟 Gateway」即可大幅降低因單一變動導致整體掛掉的機率。
- **Telegram**：只要 Gateway 正常，直接與 @bot 的對話就可用；任務板或技能掛掉只影響「從任務板觸發的執行」與「技能呼叫任務板」。
- **可選加強**：ThrottleInterval、定時健康檢查腳本、技能/任務板端 timeout 與錯誤處理，依需要加上即可。
