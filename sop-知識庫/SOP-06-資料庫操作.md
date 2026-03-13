# SOP-6: 資料庫操作

## metadata

```yaml
id: sop-06
name: 資料庫操作
category: 系統管理
tags: [資料庫, DB, postgres, qdrant, sqlite, SQL, 備份, 紅燈]
version: 2.0
created: 2026-02-16
trigger: 需要直接操作 Postgres / Qdrant / SQLite
priority: P0
燈號: 🟢 SELECT / 🟡 INSERT / 🔴 UPDATE, DELETE, DDL
```

---

## 目的

資料庫操作不可逆。錯一個 DELETE 整張表就沒了。所以分級管控。

---

## 操作分級

| 操作 | 燈號 | 規則 |
|------|------|------|
| SELECT / 查詢 | 🟢 | 直接做 |
| INSERT / 新增 | 🟡 | 先跟主人說要插什麼 |
| UPDATE / 修改 | 🔴 | 必須主人批准 |
| DELETE / 刪除 | 🔴 | 必須主人批准 |
| CREATE TABLE | 🔴 | 必須主人批准 |
| DROP TABLE | 🔴🔴 | 絕對禁止，除非主人親口說 |
| ALTER TABLE | 🔴 | 必須主人批准 |

---

## 執行流程

### Step 1: 確認影響範圍

**任何修改操作前，先跑 SELECT 確認會影響多少筆：**

```sql
-- 例如要 UPDATE，先 SELECT 看影響範圍
SELECT COUNT(*) FROM tasks WHERE status = 'running' AND created_at < NOW() - INTERVAL '24 hours';
```

### Step 2: 回報影響範圍

```
🗄️ 資料庫操作請求

操作：UPDATE tasks SET status = 'failed'
條件：WHERE status = 'running' AND created_at < 24h ago
影響筆數：{X} 筆
風險等級：🔴

要執行嗎？
```

### Step 3: 備份（>50 筆時必須）

```bash
# Postgres
pg_dump -t {table_name} > backup-{table}-$(date +%Y%m%d).sql

# SQLite
cp {db_file} {db_file}.backup-$(date +%Y%m%d)
```

### Step 4: 執行（主人批准後）

執行 SQL，記錄結果。

### Step 5: 驗證

```sql
-- 確認結果正確
SELECT * FROM {table} WHERE {condition} LIMIT 10;
```

---

## Qdrant 向量庫特殊規則

| 操作 | 燈號 |
|------|------|
| 讀取/搜尋 collection | 🟢 |
| 插入/更新 points | 🟡 |
| 建立 collection | 🔴 |
| 刪除 collection | 🔴🔴 |
| 重建索引 | 🟡 |

---

## 絕對禁止

- ❌ 沒有 WHERE 的 UPDATE / DELETE
- ❌ DROP TABLE（除非主人親口說）
- ❌ 未經批准的 schema 變更
- ❌ 直接在 production DB 做實驗性操作
- ❌ 不備份就修改超過 50 筆資料

---

## 回報格式

```
🗄️ 資料庫操作完成

操作：{SQL 摘要}
影響：{X} 筆
備份：{有/無} — {備份路徑}
驗證：{通過/異常}
```

---

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| SQL 執行錯誤 | 停止，回報錯誤訊息，不要重試 |
| 影響筆數比預期多 | 立即停止，回報主人 |
| 備份失敗 | 不要繼續操作，先修備份問題 |
| 需要回滾 | 用備份恢復，回報主人 |
