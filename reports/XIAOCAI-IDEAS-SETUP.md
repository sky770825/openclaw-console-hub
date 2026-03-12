# 小蔡的發想審核中心 - 設定指南

## 🎯 概述

「小蔡的發想審核中心」已實作完成！這是一個獨立的發想管理系統，審核通過後會自動建立對應的任務到任務板。

---

## 📁 檔案結構

```
~/.openclaw/workspace/scripts/
├── add-xiaocai-idea.sh           # 新增單一發想
├── batch-add-xiaocai-ideas.sh    # 批次新增14個發想
├── approve-idea.sh               # 審核通過並建立任務
└── setup-xiaocai-ideas.sh        # 資料庫設定腳本

~/openclaw任務面版設計/server/src/
├── index.ts                      # API 端點已實作
└── openclawSupabase.ts           # 資料庫函數已實作
```

---

## 🔧 設定步驟

### 1. 建立 Supabase 表格

執行設定腳本取得 SQL：

```bash
./scripts/setup-xiaocai-ideas.sh
```

然後在 Supabase SQL Editor 執行輸出的 SQL。

### 2. 重新啟動後端

```bash
cd ~/openclaw任務面版設計
npm run dev
```

---

## 🚀 使用方式

### 新增單一發想

```bash
./scripts/add-xiaocai-idea.sh "標題" "摘要" "標籤1,標籤2"
```

範例：
```bash
./scripts/add-xiaocai-idea.sh \
  "語音指令系統" \
  "用語音直接指派任務給 Agent" \
  "voice,ui"
```

### 批次新增14個發想

```bash
./scripts/batch-add-xiaocai-ideas.sh
```

這會將剛才整理的14個發想全部加入系統。

### 審核通過發想

```bash
./scripts/approve-idea.sh <發想ID> [審核備註]
```

範例：
```bash
./scripts/approve-idea.sh idea-123 "這個功能很實用，開始做！"
```

審核通過後會：
1. 將發想標記為 `approved`
2. 自動建立對應的任務到任務板
3. 任務會帶有 `from-idea` 標籤

---

## 📊 API 端點

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/openclaw/ideas` | 取得所有發想 |
| POST | `/api/openclaw/ideas` | 新增發想 |
| PATCH | `/api/openclaw/ideas/:id` | 更新發想（審核） |

---

## 📋 發想狀態流程

```
🟡 pending（待審核）
    ↓ 老蔡審核
✅ approved（已通過）→ 自動建立任務
    或
❌ rejected（已駁回）
```

---

## 💡 發想清單（14個待審核）

| 編號 | 名稱 | 預估工時 |
|------|------|---------|
| #004 | AMBP Phase 4: 跨機器通信 | 6h |
| #005 | AMBP 消息持久化備份 | 4h |
| #006 | AMBP 效能優化 | 5h |
| #007 | Agent 版本控制系統 | 8h |
| #008 | Agent 協作學習系統 | 10h |
| #009 | 多模態 Agent 支援 | 8h |
| #010 | Agent 決策樹視覺化 | 6h |
| #011 | 即時協作模式 | 10h |
| #012 | Agent 成本追蹤儀表板 | 5h |
| #013 | 老蔡專屬 Agent 訓練 | 12h |
| #014 | Agent 任務品質評分 | 6h |
| #015 | Agent 技能市場整合 | 8h |
| #016 | 語音指令系統 | 6h |
| #017 | Agent 自動除錯 | 10h |

**總計：114 小時**

---

## ✅ 完成狀態

- [x] 後端 API 實作 (`index.ts`)
- [x] 資料庫函數 (`openclawSupabase.ts`)
- [x] CLI 工具腳本
- [ ] Supabase 表格建立（需要手動執行 SQL）
- [ ] 發想資料匯入（執行批次新增腳本）

---

## 🎉 接下來

1. 執行 `./scripts/setup-xiaocai-ideas.sh` 取得 SQL
2. 在 Supabase 執行 SQL 建立表格
3. 執行 `./scripts/batch-add-xiaocai-ideas.sh` 匯入14個發想
4. 在任務板「發想審核」頁面查看並審核！
