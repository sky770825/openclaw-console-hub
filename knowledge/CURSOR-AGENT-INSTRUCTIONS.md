# 知識庫深度補完 — Cursor Agent 操作指令

> 給達爾：在 Cursor Agent Mode 裡按照這個流程執行
> 不要在聊天模式裡執行，必須用 Cursor Agent Mode

---

## 前置確認

1. 打開 Cursor
2. 開啟專案目錄：`~/.openclaw/workspace/knowledge/`
3. 確認在 **Agent Mode**（不是 Chat Mode）

---

## 執行流程（每個知識庫重複一次）

### Step 1: 執行腳本建立模板

在 Cursor 的 Terminal 裡執行：

```bash
cd ~/.openclaw/workspace/knowledge
./research.sh devin-ai
```

這會從 TEMPLATE.md 建立 `devin-ai/README-v1.1.md` 並顯示研究重點。

### Step 2: 用 Agent Mode 填寫

按 `Cmd+Shift+I` 開啟 Composer，輸入腳本顯示的 prompt（會自動提供），例如：

```
研究 Devin AI 並填寫 knowledge/devin-ai/README-v1.1.md 這個模板。
研究重點: Upwork freelancer 案例、自主 coding agent、SWE-bench 13.86%、Cognition Labs 融資、定價
要求：
- 搜尋最新資料 (2025-2026)
- 數據必須有來源 URL
- 不要編造 benchmark 分數
- 完成後 >= 5KB
```

### Step 3: 驗證

在 Terminal 執行：

```bash
./research.sh verify devin-ai
```

必須顯示 `🎉 通過驗證！可以定版`

如果顯示 ❌ 或 ⚠️，繼續補充直到通過。

### Step 4: 下一個

重複 Step 1-3，換下一個知識庫名稱。

---

## 待補清單（按順序執行）

1. `./research.sh devin-ai`
2. `./research.sh grok-4.1`
3. `./research.sh gpt-5.2`
4. `./research.sh gemini-vision`
5. `./research.sh auto-gpt`
6. `./research.sh salesforce-einstein`
7. `./research.sh sonnet-4.5`
8. `./research.sh trivy`

---

## 全部完成後

執行狀態檢查：

```bash
./research.sh all
```

應該全部顯示 ✅。截圖發給主人驗收。

---

## 禁止事項

- ❌ 不要在聊天模式裡「描述」你做了什麼
- ❌ 不要編造 benchmark 數字
- ❌ 不要寫「(10KB+省略...)」
- ❌ 不要改別人已完成的檔案（如 cursor-ai/README-v1.1.md）
- ✅ 必須在 Cursor Agent Mode 執行，確保真的寫入檔案
- ✅ 每個做完都跑 `./research.sh verify <名稱>` 確認
