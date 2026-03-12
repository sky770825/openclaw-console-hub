# Git 工作流
> 學習日期：2026-03-02
> 對應 GROWTH.md #5

## 核心概念

Git 有三個區域：
- **工作目錄** (Working Directory) — 你正在改的檔案
- **暫存區** (Staging Area / Index) — `git add` 後進這裡
- **本地倉庫** (Repository) — `git commit` 後進這裡

## 日常指令速查

```bash
# 看狀態（每次操作前先看）
git status

# 看改了什麼
git diff                    # 未暫存的變更
git diff --staged           # 已暫存的變更

# 加檔案到暫存區
git add server/src/index.ts # 加單檔（推薦）
git add .                   # 加全部（小心 .env）

# 提交
git commit -m "feat: 新增健康檢查 API"

# 拉取遠端最新（先拉再推，避免衝突）
git pull origin main

# 推送
git push origin main
```

## 分支工作流（功能開發到合併）

```bash
# 1. 從 main 建新分支
git checkout -b feat/new-api

# 2. 開發、commit（可以多次）
git add .
git commit -m "feat: 新增 /api/signals endpoint"
git commit -m "fix: 修正回傳格式"

# 3. 推到遠端
git push -u origin feat/new-api

# 4. 在 GitHub 開 PR，review 後合併

# 5. 合併後回 main 拉最新
git checkout main
git pull origin main

# 6. 刪掉用完的分支
git branch -d feat/new-api
```

## 衝突解決

```bash
# pull 時出現 CONFLICT
git pull origin main
# 檔案裡會出現標記：
# <<<<<<< HEAD
# 你的版本
# =======
# 遠端版本
# >>>>>>> origin/main

# 手動編輯，保留正確的，刪掉標記
# 然後：
git add <衝突檔案>
git commit -m "fix: 解決合併衝突"
```

## 其他實用指令

```bash
# 暫存（手上做到一半，要切分支）
git stash               # 暫存
git stash pop           # 取回

# 挑單一 commit 到當前分支
git cherry-pick <commit-hash>

# 看歷史
git log --oneline -10   # 最近 10 筆
git log --graph         # 圖形化分支歷史
```

## OpenClaw 專案的 Git 規則

- 老蔡的 remote 叫 `origin`（sky770825/openclaw-console-hub）
- 小蔡的 mirror 叫 `xiaoji`（andy825lay-tech/openclaw-workspace）
- **push 前必須先 pull**：`git pull origin main && git push origin main`
- **push 到 origin main 前要問老蔡**（安全底線）
- commit 訊息格式：`feat:` / `fix:` / `chore:` / `refactor:`

## 還不懂的
- rebase 和 merge 的差別（什麼時候用哪個）
- interactive rebase（`git rebase -i`）的實際操作
