# 任務面版系統檢查報告 (Task Board Audit Report)
檢查時間: Sat Mar  7 21:00:01 CST 2026

## 1. 專案結構概覽
- 專案路徑: /Users/sky770825/openclaw任務面版設計
- 總檔案數:     7119
- 前端檔案數 (src/):      208
- 後端檔案數 (server/src/):       70

## 2. 依賴項分析 (package.json)
### 前端專案
- **名稱**: openclaw-starship-ui
- **版本**: 2.5.27
- **主要腳本**:
  - dev: vite
  - ports:free: bash scripts/free-ports.sh
  - dev:fresh: bash scripts/free-ports.sh && sleep 1 && vite
  - build: vite build
  - start: npm run build && cd server && npm run dev
  - build:dev: vite build --mode development
  - lint: eslint .
  - test: vitest run
  - test:watch: vitest
  - audit: npm audit --production
  - audit:fix: npm audit fix
  - preview: vite preview
  - deploy: npm run build && npx vercel --prod
  - deploy:preview: npm run build && npx vercel
  - deploy:ci: npm run build && npx vercel --prod --yes
  - deploy:ci:preview: npm run build && npx vercel --yes
  - ci: npm run lint && npm run test && npm run build
  - backup:auto: bash scripts/auto-project-backup.sh
  - backup:auto:30d: BACKUP_RETENTION_DAYS=30 BACKUP_KEEP_COUNT=50 bash scripts/auto-project-backup.sh
### 後端專案
- **名稱**: openclaw-server
- **版本**: 2.5.27
- **主要腳本**:
  - dev: tsx watch src/index.ts
  - build: tsc
  - start: node dist/index.js
  - seed: tsx src/seed.ts
  - audit: npm audit --production
  - audit:fix: npm audit fix
  - ci: npm run build
  - test: vitest run
  - test:watch: vitest

## 3. 程式碼潛在問題掃描 (Static Analysis)
- **待辦事項 (TODO)**:       65 處
  <details><summary>點擊展開詳情</summary>

```
/Users/sky770825/openclaw任務面版設計/openclaw-main/.agents/skills/prepare-pr/SKILL.md:- Execute the workflow. Do not stop after printing the TODO checklist.
/Users/sky770825/openclaw任務面版設計/openclaw-main/.agents/skills/prepare-pr/SKILL.md:## First: Create a TODO Checklist
/Users/sky770825/openclaw任務面版設計/openclaw-main/.agents/skills/review-pr/SKILL.md:- Execute the workflow. Do not stop after printing the TODO checklist.
/Users/sky770825/openclaw任務面版設計/openclaw-main/.agents/skills/review-pr/SKILL.md:## First: Create a TODO Checklist
/Users/sky770825/openclaw任務面版設計/openclaw-main/.agents/skills/merge-pr/SKILL.md:- Execute the workflow. Do not stop after printing the TODO checklist.
/Users/sky770825/openclaw任務面版設計/openclaw-main/.agents/skills/merge-pr/SKILL.md:## First: Create a TODO Checklist
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/tools/exec-approvals.md:          "lastUsedCommand": "rg -n TODO",
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN/tools/exec-approvals.md:          "lastUsedCommand": "rg -n TODO",
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN/refactor/exec-host.md:          "lastUsedCommand": "rg -n TODO",
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/refactor/exec-host.md:          "lastUsedCommand": "rg -n TODO",
... (還有 55 處)
```
</details>
- **修復標記 (FIXME)**:        3 處
  <details><summary>點擊展開詳情</summary>

```
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/open-prose/skills/prose/examples/36-bug-hunter.prose:2. Search for TODO/FIXME comments nearby
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:1. 掃描 server/src/ 真實程式碼，找具體品質問題（TODO/FIXME、大檔案、deprecated API）
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts.bak:1. 掃描 server/src/ 真實程式碼，找具體品質問題（TODO/FIXME、大檔案、deprecated API）
```
</details>
- **Debug 輸出 (console.log)**:      947 處
  <details><summary>點擊展開詳情</summary>

```
/Users/sky770825/openclaw任務面版設計/beauty-industry-website/src/index.ts:console.log('美業網站專案骨架已建立。等待核心功能開發任務。');
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/src/ui/markdown.test.ts:    const html = toSanitizedMarkdownHtml(["```ts", "console.log(1)", "```"].join("\n"));
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/src/ui/markdown.test.ts:    expect(html).toContain("console.log(1)");
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/test-env.ts:      console.log(`[live] loaded ${applied} env vars from ~/.profile`);
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/plugin.md:        console.log("Hello");
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN/plugin.md:        console.log("Hello");
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN/concepts/typebox.md:    console.log("health:", msg.payload);
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN/hooks.md:  console.log(`[my-hook] New command triggered`);
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN/hooks.md:  console.log(`  Session: ${event.sessionKey}`);
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN/hooks.md:  console.log(`  Timestamp: ${event.timestamp.toISOString()}`);
... (還有 937 處)
```
</details>
- **硬編碼本地位址 (localhost:)**:      875 處
  <details><summary>點擊展開詳情</summary>

```
/Users/sky770825/openclaw任務面版設計/monitoring_engine.py:                for url in ["http://localhost:18789/health", "http://localhost:18789/status", "http://127.0.0.1:18789/"]:
/Users/sky770825/openclaw任務面版設計/armory/skills/health-check.sh:curl -sS --fail http://localhost:3011/api/health || echo "❌ 錯誤：伺服器 API 無法連線或回應不正常。"
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/platforms/oracle.md:curl http://localhost:18789
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/platforms/oracle.md:Then open `http://localhost:18789`.
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/platforms/oracle.md:curl http://localhost:18789
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/platforms/raspberry-pi.md:ssh -L 18789:localhost:18789 user@gateway-host
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/platforms/raspberry-pi.md:open http://localhost:18789
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/platforms/digitalocean.md:ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/platforms/digitalocean.md:# Then open: http://localhost:18789
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/install/fly.md:# Then open http://localhost:3000 in browser
... (還有 865 處)
```
</details>
- **TypeScript 'any' 類型使用 (any)**:     2395 處
  <details><summary>點擊展開詳情</summary>

```
Binary file /Users/sky770825/openclaw任務面版設計/bun.lockb matches
/Users/sky770825/openclaw任務面版設計/openclaw-main/pnpm-lock.yaml:    resolution: {integrity: sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==}
/Users/sky770825/openclaw任務面版設計/openclaw-main/pnpm-lock.yaml:  any-promise@1.3.0:
/Users/sky770825/openclaw任務面版設計/openclaw-main/pnpm-lock.yaml:    resolution: {integrity: sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==}
/Users/sky770825/openclaw任務面版設計/openclaw-main/pnpm-lock.yaml:  any-promise@1.3.0: {}
/Users/sky770825/openclaw任務面版設計/openclaw-main/pnpm-lock.yaml:      any-promise: 1.3.0
/Users/sky770825/openclaw任務面版設計/openclaw-main/pnpm-lock.yaml:      any-promise: 1.3.0
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/src/ui/app-tool-stream.ts:  // Clear any existing timer
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/src/ui/views/usage.ts:    overflow-wrap: anywhere;
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/src/ui/views/usage.ts:            // Shorter label for many days (just day number)
... (還有 2385 處)
```
</details>

## 4. 關鍵文件完整性檢查
- [x] src/App.tsx 存在
- [x] src/main.tsx 存在
- [x] server/src/index.ts 存在
- [x] .env.example 存在
- [x] tsconfig.json 存在

## 5. 後端 API 定義掃描 (Express/Koa routes)
掃描 server/src 中的路由定義...
```
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:        this.clients.delete(ws);
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:        this.clients.delete(ws);
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:          client.subscriptions.delete(`run:${runId}`);
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:          client.subscriptions.delete(`task:${taskId}`);
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:          this.clients.delete(ws);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:  const existing = memorySessions.get(sessionId);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:app.post('/internal/notify', async (req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:app.get('/api/domains', (_req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:app.get('/api/features', (_req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:app.patch('/api/features', (req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:app.patch('/api/tasks/:id', validateBody(updateTaskSchema), async (req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:app.patch('/api/tasks/:id/progress', async (req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:app.post('/api/tasks', validateBody(createTaskSchema), async (req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:app.get('/api/runs', async (req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:app.get('/api/runs/:id', async (req, res) => {
```

---
結論: 檢查完成。請參閱上述詳情以評估「任務版」是否存在問題。
