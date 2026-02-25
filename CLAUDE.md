# 星艦指揮中心 — 老蔡工作守則

> 主專案工作目錄：`/Users/caijunchang/openclaw任務面版設計`

---

## 🔄 每次對話開始

```bash
# 確認 server 狀態
curl -s http://localhost:3011/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'v{d[\"version\"]} · executor={d[\"autoExecutor\"][\"isRunning\"]}')"

# 如果 server 掛了，重啟：
lsof -ti:3011 | xargs kill -9 2>/dev/null; sleep 1
nohup node /Users/caijunchang/openclaw任務面版設計/server/dist/index.js > /tmp/openclaw-server.log 2>&1 &
```

---

## 📌 基本資訊

- **Port**：3011
- **版本**：v2.1.0
- **Owner 密碼**：sky36990
- **GitHub**：`git@github.com:sky770825/openclaw-console-hub.git`
- **小蔡 Mirror**：`git@github.com:andy825lay-tech/openclaw-workspace.git`（remote: `xiaoji`）

---

## 🤖 小蔡同步規則

每次 push 完主 repo，同步小蔡：

```bash
# 小蔡目錄同步
git -C /Users/caijunchang/Downloads/openclaw-console-hub-main pull origin main
git -C /Users/caijunchang/Downloads/openclaw-console-hub-main push xiaoji main
```

小蔡那邊的 GitHub Actions 有自動鏡像（`sync-xiaoji.yml`），
老蔡每次 push 到 origin 後，小蔡的 mirror 會自動更新。
但本地目錄需要手動 pull。

---

## 🏗️ Build 指令

```bash
# 前端
npm run build

# 後端
cd server && npm run build && cd ..

# 啟動 server
lsof -ti:3011 | xargs kill -9 2>/dev/null; sleep 1
nohup node server/dist/index.js > /tmp/openclaw-server.log 2>&1 &
```

---

## 📋 版本更新位置（改版時三個都要改）

1. `package.json` → `"version"`
2. `server/package.json` → `"version"`
3. `server/src/index.ts` → `version: 'x.x.x'`（第 3448 行附近）

---

## 📡 甲板路由對照表

| 甲板 | 路由 | 頁面 |
|------|------|------|
| AI 甲板 | `/center/ai` | `AIDeck.tsx` |
| 後勤甲板 | `/center/commerce` | `LogisticsDeck.tsx` |
| 工程甲板 | `/center/infra` | `InfraDeck.tsx` |
| 自動化甲板 | `/center/automation` | `AutomationDeck.tsx` |
| 通信甲板 | `/center/communication` | `CommunicationDeck.tsx` |
| 輪機艙 | `/center/engine` | `EngineDeck.tsx` |
| 防禦中心 | `/center/defense` | `DefenseCenter.tsx` |
| 保護中心 | `/center/protection` | `ProtectionCenter.tsx` |

---

## 📂 小蔡報告

- `PROPOSAL-REPORT.md` — 小蔡 2026-02-17 對 11 個客戶專案的分析（等老蔡審核）
- `RESULT.md` — Railway 部署失敗記錄（Token 過期，需重新產出）
