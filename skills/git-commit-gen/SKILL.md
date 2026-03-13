---
name: git-commit-gen
description: |
  根據 git diff 自動生成符合 Conventional Commits 規範的提交訊息。
  
  使用時機：
  1. 當需要快速生成標準化的 Git 提交訊息
  2. 當不確定該用什麼 type（feat/fix/docs 等）
  3. 當想要遵循 Conventional Commits 規範
  4. 當需要根據變更內容自動推薦 scope
---

# Git Commit Gen - 提交訊息自動生成

自動分析 git diff，生成符合 Conventional Commits 規範的提交訊息。

## 快速開始

### 基本用法

```bash
# 生成已暫存變更的提交訊息
python3 scripts/commit-gen.py

# 輸出示例：
# ============================================================
# 📝 生成的提交訊息
# ============================================================
# 
# Type:        feat
# Scope:       auth
# Description: add login functionality
# 
# ------------------------------------------------------------
# 完整訊息:
#   feat(auth): add login functionality
# ------------------------------------------------------------
# 
# 變更統計: 3 files changed, 45 insertions(+), 12 deletions(-)
```

### 常用指令

```bash
# 使用已暫存的變更（預設）
python3 scripts/commit-gen.py

# 使用未暫存的變更
python3 scripts/commit-gen.py --unstaged

# 以 JSON 格式輸出
python3 scripts/commit-gen.py --json

# 複製到剪貼簿（macOS）
python3 scripts/commit-gen.py --copy

# 直接使用生成的訊息提交
python3 scripts/commit-gen.py --apply

# 指定倉庫路徑
python3 scripts/commit-gen.py --path /path/to/repo
```

## Type 自動判斷規則

根據變更的檔案類型和內容自動選擇 type：

| 條件 | Type | 說明 |
|------|------|------|
| 全是文檔檔案 | `docs` | README、Markdown 等 |
| 全是測試檔案 | `test` | 測試程式碼 |
| 全是 CI/CD 配置 | `ci` | GitHub Actions 等 |
| 全是構建配置 | `build` | package.json、Dockerfile 等 |
| 新增多於刪除 | `feat` | 新增功能 |
| 刪除多於新增 | `fix` 或 `refactor` | 修復或重構 |
| 其他 | `chore` | 雜務更新 |

### 檔案類型對應

```
*.md, README, LICENSE → docs
*.test.js, tests/     → test
.github/workflows/    → ci
package.json, Cargo.toml → build
config/, *.json       → chore
```

## Scope 自動推測

從變更檔案的目錄結構推測 scope：

```bash
# 變更 src/auth/login.js → scope: auth
# 變更 docs/README.md    → scope: docs
# 變更 tests/api.test.js → scope: tests
```

如果變更跨越多個目錄，會省略 scope。

## 完整範例

### 場景 1：新增功能

```bash
$ git add src/auth/login.js src/auth/logout.js
$ python3 scripts/commit-gen.py

📝 生成的提交訊息
============================================================

Type:        feat
Scope:       auth
Description: add login.js and logout.js

完整訊息:
  feat(auth): add login.js and logout.js

變更統計: 2 files changed, 120 insertions(+), 0 deletions(-)
```

### 場景 2：直接提交

```bash
$ git add .
$ python3 scripts/commit-gen.py --apply

✅ 已提交: feat(api): add user endpoints
```

### 場景 3：查看 JSON 輸出

```bash
$ python3 scripts/commit-gen.py --json

{
  "type": "fix",
  "scope": "db",
  "description": "fix connection timeout",
  "full": "fix(db): fix connection timeout",
  "files_changed": "1",
  "insertions": "5",
  "deletions": "3",
  "summary": "1 files changed, 5 insertions(+), 3 deletions(-)"
}
```

## 快捷別名設置

添加到 `~/.zshrc` 或 `~/.bashrc`：

```bash
# 基本用法
alias gcg='python3 ~/.openclaw/workspace/skills/git-commit-gen/scripts/commit-gen.py'

# 常用組合
alias gcgc='gcg --copy'           # 生成並複製
alias gcga='gcg --apply'          # 生成並提交
alias gcgj='gcg --json'           # JSON 輸出
```

## 工作流程整合

### 在 Cursor / VS Code 中使用

創建 `.vscode/tasks.json`：

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate Commit Message",
      "type": "shell",
      "command": "python3 ${workspaceFolder}/../skills/git-commit-gen/scripts/commit-gen.py --copy",
      "problemMatcher": []
    }
  ]
}
```

### 作為 Git 別名

```bash
git config --global alias.gen-commit '!python3 ~/.openclaw/workspace/skills/git-commit-gen/scripts/commit-gen.py --apply'

# 使用
git add .
git gen-commit
```

## 與 OpenClaw 整合

```bash
# 在 OpenClaw 中詢問
"幫我生成這次變更的提交訊息"

# AI 會執行
python3 skills/git-commit-gen/scripts/commit-gen.py --json

# 然後幫你分析並建議最終訊息
```

## 故障排除

### 沒有檢測到變更

```bash
# 確認有變更
 git status

# 使用 --unstaged 檢查未暫存的變更
 python3 scripts/commit-gen.py --unstaged
```

### 權限問題

```bash
# 添加執行權限
 chmod +x scripts/commit-gen.py scripts/git-commit-gen
```

### 不在 git 倉庫中

```bash
# 確認 .git 目錄存在
 ls -la .git

# 或指定正確路徑
 python3 scripts/commit-gen.py --path /correct/path
```

## 限制

- 基於檔案路徑和統計數據推測，非 100% 準確
- 無法理解程式碼邏輯變更的語義
- 建議作為起點，可能需要人工調整

## 參考

- [Conventional Commits](https://www.conventionalcommits.org/)
- [references/conventional-commits.md](references/conventional-commits.md)
