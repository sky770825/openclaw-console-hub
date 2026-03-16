# Session Logs Skill

搜尋和分析 OpenClaw 會話日誌的工具，使用 jq 和 ripgrep 快速檢索歷史對話。

## 用途

- 搜尋歷史對話內容
- 分析會話成本和 Token 使用
- 查找之前的決策和討論
- 統計工具使用情況

## 安裝

```bash
# macOS
brew install jq ripgrep

# Ubuntu/Debian
sudo apt install jq ripgrep
```

## 使用範例

### 列出所有會話

```bash
# 按日期和大小列出
for f in ~/.openclaw/agents/<agentId>/sessions/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' | cut -dT -f1)
  size=$(ls -lh "$f" | awk '{print $5}')
  echo "$date $size $(basename $f)"
done | sort -r
```

### 搜尋關鍵字

```bash
# 搜尋所有會話
rg -l "phrase" ~/.openclaw/agents/<agentId>/sessions/*.jsonl

# 在助手回應中搜尋
jq -r 'select(.message.role == "assistant") | 
  .message.content[]? | 
  select(.type == "text") | .text' <session>.jsonl | rg -i "keyword"
```

### 成本統計

```bash
# 單個會話總成本
jq -s '[.[] | .message.usage.cost.total // 0] | add' <session>.jsonl

# 每日成本彙總
for f in ~/.openclaw/agents/<agentId>/sessions/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' | cut -dT -f1)
  cost=$(jq -s '[.[] | .message.usage.cost.total // 0] | add' "$f")
  echo "$date $cost"
done | awk '{a[$1]+=$2} END {for(d in a) print d, "$"a[d]}' | sort -r
```

### 工具使用統計

```bash
jq -r '.message.content[]? | select(.type == "toolCall") | .name' \
  <session>.jsonl | sort | uniq -c | sort -rn
```

## 日誌位置

```
~/.openclaw/agents/<agentId>/sessions/
├── sessions.json          # 會話索引
└── <session-id>.jsonl     # 對話記錄
```

## 日誌結構

```json
{
  "type": "message",
  "timestamp": "2026-01-06T10:30:00Z",
  "message": {
    "role": "user|assistant|toolResult",
    "content": [...],
    "usage": {
      "cost": {"total": 0.05}
    }
  }
}
```

## 系統需求

- jq
- ripgrep (rg)
- Bash/Zsh

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件
