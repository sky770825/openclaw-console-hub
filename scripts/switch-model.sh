#!/bin/bash
set -e
# switch-model.sh - 繞過 OpenClaw /model 指令 Bug 的模型切換腳本
# 使用方法: ./switch-model.sh <模型名稱>
# 範例: ./switch-model.sh anthropic/claude-opus-4-6

MODEL="$1"

if [ -z "$MODEL" ]; then
    echo "❌ 錯誤: 請提供模型名稱"
    echo "用法: ./switch-model.sh <模型名稱>"
    echo ""
    echo "可用模型範例:"
    echo "  anthropic/claude-opus-4-6"
    echo "  anthropic/claude-sonnet-4-5-20250929"
    echo "  anthropic/claude-haiku-4-5-20251001"
    echo "  kimi/kimi-k2.5"
    echo "  google/gemini-2.5-pro"
    exit 1
fi

echo "🔄 正在切換到模型: $MODEL ..."

# 使用 OpenClaw 的 session_status 工具來切換
# 這個工具會正確處理前綴，不會觸發 Telegram 插件的 Bug
if openclaw session_status --model="$MODEL" 2>/dev/null; then
    echo ""
    echo "✅ 模型切換成功！"
    echo "現在可以使用新模型了。"
else
    echo ""
    echo "❌ 模型切換失敗，請檢查模型名稱是否正確。"
    exit 1
fi
