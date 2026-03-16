---
tags: [ask_ai, AI, 協作, 模型, Gemini, Claude, 決策樹, 子代理]
date: 2026-03-05
category: cookbook
---

# 17 — ask_ai 協作完全指南

> 你不再是一個人做事了。ask_ai 讓你有了協作夥伴。這份指南教你怎麼用好它。

---

## 模型選擇決策樹

```
我需要什麼？
│
├─ 快速摘要 / 分類 / 簡單問答
│  → model: "flash"（3-8 秒，最便宜）
│
├─ 深度分析 / 複雜推理 / 長文理解
│  → model: "pro"（10-30 秒，跟你同一個大腦）
│
├─ 程式碼審查 / 技術判斷 / 不同視角
│  → model: "claude" 或 "sonnet"（5-20 秒，走老蔡訂閱）
│
└─ 最強推理 / 架構設計 / 極深分析
   → model: "opus"（20-60 秒，走老蔡訂閱，慎用）
```

---

## 五種協作模式

### 模式 1：快速摘要
```json
{"action":"ask_ai","model":"flash","prompt":"用 3 個重點摘要這份報告","context":"<報告全文>"}
```
適合：分析長文件、提取關鍵資訊、快速分類

### 模式 2：程式碼審查
```
step 0: read_file 讀代碼
step 1: ask_ai(model="claude", prompt="找出這段代碼的 bug 和型別問題", context=代碼內容)
step 2: 整合 Claude 回覆，回覆老蔡
```
適合：寫完程式碼要檢查、分析別人的代碼

### 模式 3：深度分析
```json
{"action":"ask_ai","model":"pro","prompt":"分析這份資料的異常模式，列出可能原因","context":"<資料內容>"}
```
適合：診斷問題、找 root cause、分析趨勢

### 模式 4：方案設計
```json
{"action":"ask_ai","model":"claude","prompt":"設計一個解決 XX 問題的方案，列出 3 個選項的優缺點","context":"<背景資訊>"}
```
適合：架構決策、技術方案選擇

### 模式 5：自我驗證
```json
{"action":"ask_ai","model":"flash","prompt":"我的邏輯有問題嗎？","context":"我的分析：<你的判斷>"}
```
適合：決策前二次確認、避免盲點

---

## 正確的 prompt 寫法

### 好的 prompt
```
✅ "分析以下 TypeScript 代碼的 3 個最嚴重的問題，按嚴重程度排序"
✅ "這份 JSON 的 schema 設計有什麼不合理的地方？建議怎麼改？"
✅ "比較方案 A 和方案 B 的優缺點，推薦哪個？"
```

### 差的 prompt
```
❌ "分析"              ← 太模糊，不知道分析什麼
❌ "幫我看看"           ← 看什麼？看什麼面向？
❌ "這個好不好？"        ← 好的標準是什麼？
```

### prompt 公式
```
[動作] + [對象] + [面向] + [輸出格式]

例：「分析」+「這段代碼」+「的安全漏洞」+「按嚴重程度列表」
→ "分析以下代碼的安全漏洞，按嚴重程度從高到低列表"
```

---

## context 的正確用法

### 給足 context
```
✅ ask_ai(prompt="分析架構問題", context=完整的 index.ts 內容)
✅ ask_ai(prompt="這個 bug 的 root cause", context=錯誤 log + 相關代碼)
```

### 不要給空 context
```
❌ ask_ai(prompt="分析 index.ts 的架構")  ← AI 看不到 index.ts！
```
正確做法：先 read_file 讀到內容，再放到 context 裡。

### context 太長怎麼辦
如果檔案超過 2000 字（read_file 會截斷）：
1. 用 `run_script head -100 $FILE` 取前 100 行
2. 或用 `run_script grep -n "關鍵字" $FILE` 找重點段落
3. 把精華放到 context，不要塞整個檔案

---

## 避免的陷阱

### 陷阱 1：無限追問
```
❌ ask_ai("怎麼做") → 不確定 → ask_ai("確認一下") → 又不確定 → ask_ai("那另一個方案呢")
```
修復：一次問清楚，列出選項讓 AI 比較。

### 陷阱 2：盲信 AI 回覆
```
❌ ask_ai 說「沒問題」→ 直接標 ✅
```
修復：AI 的分析只是參考。自己 read_file 驗證，用 run_script 跑測試。

### 陷阱 3：該自己做的丟給 AI
```
❌ ask_ai("幫我讀一下 BLUEPRINT.md")  ← 你自己 read_file 就好！
```
修復：簡單查詢自己做，只有需要「分析、推理、創意」的才用 ask_ai。

### 陷阱 4：用錯模型
```
❌ 簡單摘要用 opus（浪費時間和額度）
❌ 複雜架構設計用 flash（回答太淺）
```
修復：看上面的決策樹。

---

## ask_ai 失敗怎麼辦

| 錯誤 | 原因 | 解決 |
|------|------|------|
| timeout | 模型太慢或 prompt 太長 | 換 flash、精簡 context |
| Claude CLI 無法啟動 | PATH 問題 | 通知老蔡（小蔡會修） |
| 回覆為空 | prompt 有問題 | 改寫 prompt，加更多 context |
| HTTP 401 | API key 問題 | Claude 用 CLI 不需要 key；Gemini 檢查 GOOGLE_API_KEY |

**ask_ai 失敗不該阻擋你**：失敗了就自己分析，或者換個模型重試一次。不要卡在那裡。
