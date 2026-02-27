#!/bin/bash
# submit-review.sh — 小蔡提交審核文件到 review/pending/
# 用法：bash scripts/submit-review.sh "任務名稱" "描述文字"
# 或：bash scripts/submit-review.sh "任務名稱" --file /path/to/detail.md

REVIEW_DIR="$HOME/.openclaw/workspace/review"
PENDING_DIR="$REVIEW_DIR/pending"
TEMPLATE="$REVIEW_DIR/TEMPLATE.md"

TASK_NAME="${1:-未命名任務}"
DETAIL="${2:-（無詳細說明）}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
SAFE_NAME=$(echo "$TASK_NAME" | tr ' /' '-' | tr -cd '[:alnum:]-_')
FILENAME="REVIEW-${TIMESTAMP}-${SAFE_NAME}.md"

mkdir -p "$PENDING_DIR"

# 如果第二個參數是 --file，從檔案讀取內容
if [ "$2" = "--file" ] && [ -f "$3" ]; then
  DETAIL=$(cat "$3")
fi

cat > "$PENDING_DIR/$FILENAME" << EOF
# REVIEW — ${TASK_NAME}

> 提交時間：$(date +"%Y-%m-%d %H:%M")
> 提交者：小蔡
> 狀態：pending

---

## 任務目標

${TASK_NAME}

## 討論摘要

${DETAIL}

## 修改範圍

| 操作 | 檔案路徑 | 說明 |
|------|----------|------|
| （小蔡填寫） | | |

## 風險評估

- [ ] 是否影響現有功能？
- [ ] 是否需要重啟 server？
- [ ] 是否涉及安全敏感操作？
- [ ] 是否有回滾方案？

## 驗證方式

（小蔡填寫）

---

## 老蔡 Claude 審核區

**審核結果**：[ ] approved  [ ] rejected
**審核時間**：
**審核意見**：
EOF

echo "✅ 審核文件已提交：$PENDING_DIR/$FILENAME"
echo "📋 等待老蔡 Claude 審核..."

# 計算 pending 數量
PENDING_COUNT=$(ls -1 "$PENDING_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "📊 目前 pending 文件數：$PENDING_COUNT"
