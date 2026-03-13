# QMD 記憶索引 — 連線與檢查

QMD 是 OpenClaw 的**選用記憶後端**（memory backend）。預設為 `builtin`（OpenClaw 內建向量索引）；若設為 `qmd`，則改由 **QMD 側車程式**負責索引與搜尋。

---

## 一、如何確認 QMD 有沒有「連上」

### 1. 看設定是否啟用 QMD

在 `~/.openclaw/openclaw.json`（或你使用的 state dir 對應的 config）中要有：

```json
{
  "memory": {
    "backend": "qmd",
    "qmd": {
      "command": "qmd",
      "includeDefaultMemory": true
    }
  }
}
```

- 若沒有 `memory` 或 `memory.backend` 不是 `"qmd"`，則**不會**使用 QMD，而是用內建 `builtin`。
- `memory.qmd.command` 預設為 `"qmd"`，代表系統 PATH 裡要能執行 `qmd` 指令。

### 2. 用 CLI 看記憶狀態（是否用 QMD、索引是否正常）

在終端執行：

```bash
openclaw memory status
```

或更詳細（含向量／embedding 檢查與必要時觸發索引）：

```bash
openclaw memory status --deep --index
```

看輸出：

- **Provider / Store**  
  - 若 QMD 有成功啟用，會看到與 QMD 相關的 provider／store 路徑（例如 `~/.openclaw/agents/<agentId>/qmd/xdg-cache/qmd/index.sqlite`）。
- **Indexed**  
  - 會顯示已索引的檔案數與 chunk 數；若數字合理且沒有錯誤，代表索引有在運作。
- 若出現 **「qmd memory unavailable; falling back to builtin」** 或類似錯誤，代表 QMD **沒連上**，已自動退回內建索引。

### 3. 確認 `qmd` 指令存在且可執行

QMD 是獨立專案，需自行安裝。在終端執行：

```bash
qmd --version
```

若找不到指令（`command not found`），代表 QMD 未安裝或不在 PATH，OpenClaw 會無法啟動 QMD 後端，只能使用 builtin。

---

## 二、常見狀況：沒連上的原因

| 狀況 | 說明 | 作法 |
|------|------|------|
| **未設 backend** | 設定裡沒有 `memory.backend: "qmd"` | 在 `openclaw.json` 的 `memory` 下加上 `"backend": "qmd"` 與 `qmd` 區塊（見上文）。 |
| **未安裝 QMD** | 系統沒有 `qmd` 指令 | 安裝 QMD 並確認 `qmd --version` 可執行；必要時把安裝路徑加入 PATH。 |
| **QMD 建立失敗** | 索引目錄或 QMD 執行錯誤 | 看 Gateway／CLI 日誌是否有 `qmd memory unavailable` 或 QMD 的錯誤訊息；確認 `~/.openclaw/agents/<agentId>/qmd/` 目錄可寫。 |
| **自動退回 builtin** | QMD 首次或執行時失敗，OpenClaw 會改用內建索引 | 同上，查日誌確認 QMD 失敗原因；`openclaw memory status` 會顯示目前實際使用的 backend／store。 |

---

## 三、總結：快速檢查清單

1. **設定**：`openclaw.json` 內 `memory.backend === "qmd"` 且 `memory.qmd` 存在。
2. **指令**：終端執行 `qmd --version` 可成功。
3. **狀態**：執行 `openclaw memory status`（必要時加 `--deep --index`），確認沒有 fallback 錯誤、且 Indexed／Store 顯示正常。

若以上都符合，QMD 記憶索引即算「有連上」；若有任一步不符合，就會用內建索引或報錯。

---

## 四、相關文件

- **Memory 概念**：openclaw-main 內 `docs/concepts/memory.md`
- **CLI**：`docs/cli/memory.md`（`openclaw memory status` / `index` / `search`）
