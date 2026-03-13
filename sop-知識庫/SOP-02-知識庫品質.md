# SOP-2: 知識庫品質控管

## metadata

```yaml
id: sop-02
name: 知識庫品質控管
category: 日常操作
tags: [知識庫, 品質, 5KB, 表格, URL, knowledge, 寫入, 更新, CR-1]
version: 2.0
created: 2026-02-16
trigger: 寫入或更新 knowledge/ 目錄下的任何檔案
priority: P0
燈號: 🟡 先跟主人確認要寫哪個知識庫
related_cr: CR-1
```

---

## 目的

確保知識庫的每篇文件都有實際價值，不是骨架或空殼。

---

## 品質標準（全部必須滿足）

| 指標 | 最低要求 | 驗證方式 |
|------|---------|---------|
| 檔案大小 | ≥ 5KB | `wc -c 檔案路徑` |
| 表格數量 | ≥ 5 個 | `grep -c '|' 檔案路徑`（概估） |
| 真實 URL | ≥ 2 個 | `grep -c 'https://' 檔案路徑` |
| 內容品質 | 不是模板/骨架 | 人工抽查前 50 行 |
| 中文為主 | 繁體中文 | 視覺確認 |

---

## 執行流程

### Step 1: 確認目標

```bash
ls -la knowledge/{名稱}/
```

確認目錄存在。不存在 → 回報主人，不要自己建。

### Step 2: 檢查是否已有內容

```bash
wc -c knowledge/{名稱}/*.md
```

- 已有 ≥5KB 的檔案 → **停止！不可覆蓋**，先回報主人
- <5KB 或不存在 → 可以寫入

### Step 3: 子派寫入

**必須用 sessions_spawn**，不可自己寫（違反自幹防呆規則）。

```
sessions_spawn(
  task="寫入 {名稱} 知識庫，要求 ≥5KB、≥5 表格、≥2 真實 URL",
  label="知識庫-{名稱}",
  model="kimi/kimi-k2.5"  # 需要搜尋用 Kimi；不需搜尋可用 ollama/qwen2.5:14b
)
```

### Step 4: 驗收子代理產出

```bash
# 檔案存在？
ls -la knowledge/{名稱}/README-v1.1.md

# 大小 ≥5KB？
wc -c knowledge/{名稱}/README-v1.1.md

# 有表格？
grep -c '|' knowledge/{名稱}/README-v1.1.md

# 有真實 URL？
grep -c 'https://' knowledge/{名稱}/README-v1.1.md
```

**全部通過才算完成。任何一項不過 → 退回子代理重做。**

### Step 5: 回報

走 SOP-1 的回報流程。

---

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| 子代理寫出的檔案 <5KB | 退回重做，附上「大小不足，目前 X bytes，需要 ≥5120 bytes」 |
| 沒有真實 URL | 退回，附上「需要至少 2 個 https:// 開頭的真實連結」 |
| 內容是模板骨架 | 退回，附上「內容是空殼，需要真實資料」 |
| 覆蓋了既有檔案 | 🔴 立即回報主人，嘗試 git checkout 恢復 |
| 子代理超時沒回應 | 等 10 分鐘，沒回應就回報主人 |

---

## 回報格式

```
📚 知識庫寫入完成
名稱：{名稱}
檔案：knowledge/{名稱}/README-v1.1.md
大小：{X} KB
表格：{Y} 個
URL：{Z} 個
狀態：review
```

---

## 反面案例（不要學）

- ❌ 自己開 5 次 web_search 蒐集資料然後自己寫 → 違反自幹規則
- ❌ 寫出 2KB 的骨架然後說「完成」→ 不符品質標準
- ❌ URL 全部是 `https://example.com` → 假 URL，違反 CR-5
- ❌ 沒確認就覆蓋已有 8KB 的檔案 → 違反覆蓋禁令
