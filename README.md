# OpenClaw 任務中控台（Console Hub）

OpenClaw 任務自動化管理面板：任務看板、執行紀錄、日誌、警報、設定。目前為 **可展示、可操作、可擴充** 的模板，資料來自 localStorage + 種子，尚未接真實後端。

---

## 快速開始

```bash
npm i
npm run dev
```

瀏覽器開啟 http://localhost:8080/ 即可使用。

---

## 專案結構（簡要）

| 目錄／檔案 | 說明 |
|------------|------|
| `docs/OPENCLAW-CONCEPT.md` | 名詞定義（Task / Run / Log / Alert）、任務卡標準模板、最短路徑 |
| `docs/TASK-TEMPLATE.md` | 任務卡 6 欄空白模板（Goal / Inputs / Outputs / Acceptance / Owner / Priority） |
| `src/types/` | 型別定義（task / run / alert / log） |
| `src/data/seedTasks.ts` | 種子任務 T-01～T-15 |
| `src/data/seedRunsAlerts.ts` | 種子 Runs + Alerts（展示用） |
| `src/services/seed.ts` | 初始化與 localStorage 讀寫（tasks / runs / alerts） |
| `src/services/api.ts` | API 抽象（listTasks / listRuns / runNow / rerun / updateTask / updateAlert 等） |

---

## 種子與重灌

- **首次進入**：`main.tsx` 會呼叫 `seedOpenClawIfNeeded()`，若尚未 seed 會寫入 tasks / runs / alerts 到 localStorage（key：`openclaw:seeded:v2`）。
- **快速重灌**（想重新測 seed 時）：在瀏覽器 **Console** 執行：
  ```js
  Object.keys(localStorage).filter(k=>k.startsWith("openclaw:")).forEach(k=>localStorage.removeItem(k));
  location.reload();
  ```

---

## 建議路線（與 OpenClaw 對齊用）

1. **先部署一版 demo**  
   把此 repo 部署到 Vercel / Netlify 等，讓團隊「打開就懂」、不用先講技術細節。  
   詳見 [docs/DEPLOY.md](docs/DEPLOY.md)。

2. **請 OpenClaw 團隊看模板**  
   用 demo + `docs/OPENCLAW-CONCEPT.md` + `docs/TASK-TEMPLATE.md` 一起 review，對齊：
   - Task / Run / Log / Alert 名詞與欄位
   - 任務卡 6 欄與 Kanban 六欄（Draft → Ready → Running → Review → Done → Blocked）
   - Run List / Run Detail / Logs / Alerts 是否符合預期

3. **再決定串接方式**  
   對齊後再設計 API 契約（可依 `src/types/*.ts`），把 `api.ts` 從 localStorage 改為呼叫 OpenClaw 後端（或透過 proxy）。

---

## 給 OpenClaw 團隊

- **目前狀態**：UI 與型別、種子任務皆已就緒；**尚未**接真實執行引擎（runNow / rerun 僅寫入 localStorage，未觸發實際執行）。
- **請先確認**：  
  - 名詞與欄位是否與你們一致（見 `docs/OPENCLAW-CONCEPT.md`）  
  - 任務卡 6 欄與 Kanban 流程是否可當作「官方模板」  
- **之後**：再約 API 格式與誰負責哪一段（中控台只負責顯示與操作，執行由 OpenClaw 後端負責）。

---

## 技術棧

- Vite、TypeScript、React
- shadcn/ui、Tailwind CSS
- 資料：localStorage + seed（可替換為 API）

---

## 部署

**CLI 一鍵部署（Vercel）**

```bash
# 第一次請先登入
npx vercel login

# 預覽部署
npm run deploy:preview

# 正式部署
npm run deploy
```

**CLI 自動執行（CI / 非互動）**

```bash
npm run deploy:ci        # 正式部署，跳過互動
npm run deploy:ci:preview # 預覽部署，跳過互動
```

**GitHub Actions 自動部署**

- Push 到 `main` → 自動部署正式環境  
- Push 到其他分支 → 自動部署預覽環境  

需在 GitHub 設定 `VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`（詳見 [docs/DEPLOY.md](docs/DEPLOY.md)）。

產出也可手動部署：`npm run build` 後將 `dist/` 上傳至任一靜態 hosting。
