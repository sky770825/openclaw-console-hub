# GitHub Skill

使用 GitHub CLI (`gh`) 與 GitHub 互動，管理 Issues、PRs、CI 工作流程。

## 用途

- 檢查 PR 狀態與 CI 結果
- 查看工作流程執行記錄
- 使用 GitHub API 進行進階查詢
- 管理 Issues 和 Pull Requests

## 安裝

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# 其他系統
# 見 https://github.com/cli/cli#installation
```

## 認證

```bash
gh auth login
```

## 使用範例

### Pull Requests

```bash
# 檢查 PR 的 CI 狀態
gh pr checks 55 --repo owner/repo

# 列出最近的 PR
gh pr list --repo owner/repo --limit 10

# 查看 PR 詳情
gh pr view 55 --repo owner/repo
```

### 工作流程 (Actions)

```bash
# 列出最近的工作流程執行
gh run list --repo owner/repo --limit 10

# 查看特定執行
gh run view <run-id> --repo owner/repo

# 只看失敗步驟的日誌
gh run view <run-id> --repo owner/repo --log-failed
```

### Issues

```bash
# 列出 Issues
gh issue list --repo owner/repo

# 查看特定 Issue
gh issue view 123 --repo owner/repo
```

### API 查詢

```bash
# 取得 PR 特定欄位
gh api repos/owner/repo/pulls/55 \
  --jq '.title, .state, .user.login'

# JSON 輸出並過濾
gh issue list --repo owner/repo \
  --json number,title \
  --jq '.[] | "\(.number): \(.title)"'
```

## 常用選項

- `--repo owner/repo` - 指定倉庫（非當前目錄時需要）
- `--json` - 輸出 JSON 格式
- `--jq '<filter>'` - 使用 jq 過濾輸出

## 系統需求

- GitHub CLI (`gh`)
- Git 倉庫（可選，可用 `--repo` 指定）

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件
- [GitHub CLI 文件](https://cli.github.com/manual/)
