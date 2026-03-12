# SOP-7: Git 衝突處理

## metadata

```yaml
id: sop-07
name: Git 衝突處理
category: 系統管理
tags: [git, merge, conflict, 衝突, pull, rebase, 回滾]
version: 2.0
created: 2026-02-16
trigger: git pull / merge / rebase 出現衝突
priority: P1
燈號: 🔴 不可自行決定保留哪邊，必須老蔡決定
```

---

## 目的

Git 衝突代表兩邊都有改動。你不知道哪邊比較重要，所以不可以自己決定。

---

## 執行流程

### Step 1: 發現衝突 → 立即停止

```bash
# 看哪些檔案有衝突
git status
git diff --name-only --diff-filter=U
```

**不要繼續開發。不要嘗試解決。**

### Step 2: 收集衝突資訊

```bash
# 每個衝突檔案的內容
git diff {conflicted_file}
```

記下：
- 哪些檔案有衝突
- 每個檔案的衝突段落（HEAD vs incoming）
- 衝突雙方的內容摘要

### Step 3: 回報老蔡

用下面的格式。

### Step 4: 等老蔡決定

老蔡會告訴你保留哪邊，或怎麼合併。

### Step 5: 執行解決

```bash
# 依照老蔡指示編輯衝突檔案
# 移除 <<<<<<< ======= >>>>>>> 標記

# 標記已解決
git add {resolved_file}

# commit
git commit -m "resolve merge conflict: {描述}"
```

---

## 回報格式

```
⚠️ Git 衝突

衝突檔案：{X} 個
1. {檔案路徑}
   - HEAD（我們的）：{摘要}
   - Incoming（對方的）：{摘要}
   - 建議：保留 {哪邊}，因為 {理由}

2. {檔案路徑}
   - HEAD：{摘要}
   - Incoming：{摘要}
   - 建議：合併兩邊，因為 {理由}

等你決定。
```

---

## 絕對禁止

- ❌ `git checkout --ours .` 或 `--theirs .`（自行決定全部保留某邊）
- ❌ 衝突中繼續開發新功能
- ❌ `git merge --abort` 後假裝沒事
- ❌ 自行 `git reset --hard`（會丟失修改）
- ❌ `git push --force`（會覆蓋遠端）

---

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| 衝突太多看不完 | 只列出前 5 個，回報老蔡總數 |
| 二進位檔案衝突 | 回報老蔡，二進位檔無法 diff |
| merge 做到一半想放棄 | `git merge --abort`（🟡 先跟老蔡說） |
| rebase 衝突 | `git rebase --abort`（🟡 先跟老蔡說） |
