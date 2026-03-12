# Git Notes Memory Skill

基於 Git Notes 的知識圖譜記憶系統，實現跨會話的持久化記憶。

## 用途

- 跨會話持久化記憶
- 分支感知記憶隔離
- 自動實體提取與關聯
- 上下文檢索與回憶

## 安裝

此技能隨 OpenClaw 安裝，無需額外安裝。

## 使用範例

### 會話開始（必需）

```bash
python3 skills/git-notes-memory/memory.py -p <project-dir> sync --start
```

輸出包含：
- 當前分支
- 熱門主題
- 關鍵記憶
- 記憶總數

### 儲存記憶

```bash
# 儲存決策（高重要性）
python3 skills/git-notes-memory/memory.py -p <dir> remember \
  '{"decision": "Use PostgreSQL", "reason": "team expertise"}' \
  -t architecture -i h

# 儲存偏好（關鍵重要性）
python3 skills/git-notes-memory/memory.py -p <dir> remember \
  '{"preference": "tabs over spaces"}' \
  -t style -i c
```

重要性等級：
- `-i c`：關鍵（永不忘記）
- `-i h`：高（重要決策）
- `-i n`：普通（預設）
- `-i l`：低（可能清理）

### 檢索記憶

```bash
# 取得主題相關記憶
python3 skills/git-notes-memory/memory.py -p <dir> get authentication

# 全文搜尋
python3 skills/git-notes-memory/memory.py -p <dir> search "database migration"

# 取得特定記憶詳情
python3 skills/git-notes-memory/memory.py -p <dir> recall -i <id>

# 查看最新記憶
python3 skills/git-notes-memory/memory.py -p <dir> recall --last 5
```

### 更新記憶

```bash
# 更新內容
python3 skills/git-notes-memory/memory.py -p <dir> update <id> \
  '{"new": "content"}'

# 合併內容
python3 skills/git-notes-memory/memory.py -p <dir> update <id> \
  '{"extra": "field"}' -m

# 添加演進記錄
python3 skills/git-notes-memory/memory.py -p <dir> evolve <id> \
  "User changed preference to dark mode"
```

### 會話結束（建議）

```bash
python3 skills/git-notes-memory/memory.py -p <dir> sync --end \
  '{"summary": "Implemented auth flow"}'
```

### 分支操作

```bash
# 列出所有分支記憶
python3 skills/git-notes-memory/memory.py -p <dir> branches

# 合併分支記憶（git merge 後執行）
python3 skills/git-notes-memory/memory.py -p <dir> merge-branch feature-auth
```

## 記憶類型（自動檢測）

| 類型 | 觸發詞 |
|------|--------|
| decision | decided, chose, picked, selected |
| preference | prefer, favorite, like best |
| learning | learned, understood, realized |
| task | todo, task, need to, plan to |
| question | wondering, curious, research |
| note | noticed, observed, important |
| progress | completed, finished, done |

## 系統需求

- Python 3.8+
- Git
- 專案 Git 倉庫

## 注意事項

- 記憶儲存在 `refs/notes/mem-*`
- 每個分支有獨立記憶空間
- 新分支自動繼承 main/master 記憶

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件
