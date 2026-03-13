# OpenClaw Node 版本防呆說明（請勿隨意修改）

## 為什麼需要這份說明

OpenClaw 的 **openguardrails-for-openclaw** 擴充使用原生模組 **better-sqlite3**。該模組會針對「編譯當下的 Node 版本」產生二進位檔；若 **執行 OpenClaw 的 Node 版本** 與 **編譯時的 Node 版本** 不一致，會出現類似下列錯誤：

```text
The module '.../better_sqlite3.node' was compiled against a different Node.js version using
NODE_MODULE_VERSION 141. This version of Node.js requires NODE_MODULE_VERSION 127.
```

因此：**請勿在未確認版本一致的情況下，修改 OpenClaw 使用的 Node 版本，或對該擴充隨意執行 `npm install` / `npm rebuild`。**

## 約束（修改前請先看）

| 項目 | 說明 |
|------|------|
| **建議 Node 版本** | **Node 22**（與目前擴充編譯版本一致） |
| **Gateway 啟動方式** | 必須用「與擴充編譯時相同」的 Node 啟動（例如先 `nvm use 22` 再 `openclaw gateway` 或 `openclaw gateway install`） |
| **擴充目錄** | `~/.openclaw/extensions/openguardrails-for-openclaw` — 在此目錄執行 `npm install` / `npm rebuild` 時，請確認當前 `node -v` 與實際跑 Gateway 的 Node 一致 |

## 若你打算做以下任一項

- 變更系統或 nvm 的預設 Node 版本  
- 修改 OpenClaw Gateway 的安裝/啟動方式（例如 launchd、PATH）  
- 在 openguardrails 擴充目錄執行 `npm install`、`npm update` 或 `npm rebuild`  

請先確認：

1. 執行 `node -v` 的版本 = 實際用來跑 OpenClaw Gateway 的 Node 版本。  
2. 若有變更 Node 或重新安裝擴充相依，請在**同一 Node 版本**下執行 `npm rebuild better-sqlite3`，並用**該 Node** 重新啟動（或重新安裝）Gateway。

## 快速修復（若已出現 NODE_MODULE_VERSION 錯誤）

- **方案 A**：讓 Gateway 改為用 Node 22 跑（建議）  
  - `nvm use 22`（或 `nvm alias default 22`）  
  - 若使用服務：`openclaw gateway stop` → `openclaw gateway install` → `openclaw gateway start`  
- **方案 B**：用「目前跑 Gateway 的 Node 版本」重新編譯擴充  
  - 切換到該 Node（例如 `nvm use 18`）  
  - `cd ~/.openclaw/extensions/openguardrails-for-openclaw && npm rebuild better-sqlite3`  
  - 重啟 Gateway  

---

*此文件為防呆說明，避免因 Node 版本或擴充編譯不一致導致 OpenClaw 載入 openguardrails 失敗。*
