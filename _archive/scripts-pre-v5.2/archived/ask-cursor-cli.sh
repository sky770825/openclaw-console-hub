#!/usr/bin/env bash
set -e
# 做法二：用 Cursor CLI 問 Cursor，回覆會直接回傳給堤諾米斯達爾（達爾）（可多輪、最後再回報主人）
# 需先安裝 Cursor CLI：curl https://cursor.com/install -fsS | bash，並登入
#
# 用法: ./scripts/ask-cursor-cli.sh "問題描述" "路徑"
# 範例: ./scripts/ask-cursor-cli.sh "gateway 啟動失敗 connection refused" "~/.openclaw/workspace"

# OpenClaw 執行時 PATH 可能沒有 agent，加入常見安裝路徑
export PATH="$HOME/.cursor-agent/bin:$HOME/.local/bin:/usr/local/bin:$PATH"

problem="${1:-}"
paths="${2:-$HOME/.openclaw/workspace}"
prompt="這是 OpenClaw 的問題，請依路徑幫忙解決。

**問題：**
${problem}

**路徑：**
${paths}
---"

if ! command -v agent &>/dev/null; then
  echo "找不到 agent 指令。請先安裝 Cursor CLI："
  echo "  curl https://cursor.com/install -fsS | bash"
  echo "安裝後在終端執行 agent 完成登入。"
  echo "若已安裝，請確認 agent 所在目錄（例如 ~/.cursor-agent/bin）已加入 PATH。"
  exit 1
fi

echo "[ask-cursor-cli] 正在呼叫 Cursor Agent (--model ${CURSOR_AGENT_MODEL:-auto})..." >&2
model="${CURSOR_AGENT_MODEL:-auto}"
agent -p --model "$model" "$prompt"
