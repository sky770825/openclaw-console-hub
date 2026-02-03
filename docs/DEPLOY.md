# OpenClaw Console Hub 部署說明

Build 指令與產出目錄（Vite 預設）：

- **Build**：`npm run build`
- **產出**：`dist/`（靜態檔案）

---

## CLI 一鍵部署（Vercel）

在專案目錄執行：

```bash
# 預覽部署（產生預覽網址，不影響正式站）
npm run deploy:preview

# 正式部署（部署到 production）
npm run deploy
```

- 會先自動執行 `npm run build`，再呼叫 `npx vercel` 上傳並部署。
- **第一次** 請先登入：`npx vercel login`（依提示完成）。
- 若尚未連結專案，執行時會詢問是否連結現有 Vercel 專案或建立新專案。

### 非互動式 / CI 用（CLI 自動執行）

在 CI、腳本或無需手動確認時可使用：

```bash
# 正式部署（跳過互動提示）
npm run deploy:ci

# 預覽部署（跳過互動提示）
npm run deploy:ci:preview
```

- `deploy:ci` / `deploy:ci:preview` 會加上 `--yes`，適合自動化腳本。
- 若在 CI 環境執行，請先設定 `VERCEL_TOKEN`（見下方 GitHub Actions）。

---

## GitHub Actions 自動部署（CLI 自動執行）

專案內建兩個 workflow，push 後會**自動**部署 Vercel：

| 觸發條件 | Workflow | 說明 |
|----------|----------|------|
| push 到 **main** | `.github/workflows/deploy-production.yml` | 部署正式環境（production） |
| push 到 **其他分支** | `.github/workflows/deploy-preview.yml` | 部署預覽環境（preview） |

### 啟用前需在 GitHub 設定 Secrets

1. 取得 Vercel 資訊：
   - [Vercel Access Token](https://vercel.com/account/tokens)
   - 本機在專案目錄執行 `npx vercel link`，在產生的 `.vercel/project.json` 內取得 `orgId`、`projectId`
2. 在 GitHub repo：**Settings → Secrets and variables → Actions** 新增：
   - `VERCEL_TOKEN`：上述 Access Token
   - `VERCEL_ORG_ID`：上述 orgId
   - `VERCEL_PROJECT_ID`：上述 projectId

設定完成後，每次 push 會自動 build 並部署，無需手動執行 CLI。

---

## Vercel 網頁匯入（不用 CLI）

1. 在 [vercel.com](https://vercel.com) 匯入此 repo（GitHub/GitLab/Bitbucket）。
2. 建置設定（通常會自動偵測）：
   - **Build Command**：`npm run build`
   - **Output Directory**：`dist`
3. 部署後會得到一個 `*.vercel.app` 網址。

（若需自訂）專案根目錄已有 `vercel.json`：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

---

## Netlify

1. 在 [netlify.com](https://netlify.com) 新增 site，選擇「Import an existing project」並連到此 repo。
2. 建置設定：
   - **Build command**：`npm run build`
   - **Publish directory**：`dist`
3. 儲存後會自動 build 並產生網址。

（可選）在專案根目錄加 `netlify.toml`：

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

---

## 其他靜態 hosting

只要支援「上傳一個資料夾」即可：

1. 本機執行 `npm run build`。
2. 將 `dist/` 內所有檔案上傳到 hosting 的根目錄（或指定為靜態站台根目錄）。

---

## 注意

- 此專案為 **純前端**，資料存於 **localStorage**；換裝置或清除瀏覽資料會清空。
- 部署後第一次進入會自動 seed；若要「重灌」種子，在該網站頁面打開 Console 執行 README 中的重灌指令即可。
