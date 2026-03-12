#!/bin/bash
set -e
# 從 quarantine 恢復技能到 skills/

if [ -z "$1" ]; then
    echo "用法: $0 <技能名稱>"
    echo "範例: $0 apple-notes"
    echo ""
    echo "可用的封存技能："
    ls -1 ~/.openclaw/workspace/quarantine/skills-archive-*/
    exit 1
fi

SKILL_NAME="$1"
WORKSPACE="$HOME/.openclaw/workspace"
ARCHIVE_DIR=$(ls -td "$WORKSPACE/quarantine/skills-archive-"* | head -1)

if [ ! -d "$ARCHIVE_DIR/$SKILL_NAME" ]; then
    echo "❌ 找不到技能: $SKILL_NAME"
    echo "可用的封存技能："
    ls -1 "$ARCHIVE_DIR"
    exit 1
fi

echo "📦 恢復技能: $SKILL_NAME"
mv "$ARCHIVE_DIR/$SKILL_NAME" "$WORKSPACE/skills/"

if [ $? -eq 0 ]; then
    echo "✅ 技能已恢復到 skills/$SKILL_NAME"
else
    echo "❌ 恢復失敗"
    exit 1
fi
