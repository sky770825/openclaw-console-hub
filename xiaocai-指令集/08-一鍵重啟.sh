#!/bin/bash
# ============================================================
# 一鍵重啟 — 老蔡專用
# 用途: 清理 + 巡檢 + 重啟面板，一個指令搞定
# 使用: bash xiaocai-指令集/08-一鍵重啟.sh
# ============================================================

WORKSPACE="/Users/caijunchang/.openclaw/workspace"
cd "$WORKSPACE" || exit 1

echo "==============================="
echo "  🔄 一鍵重啟 OpenClaw"
echo "==============================="
echo ""

# 1. 停止面板 polling
echo "1️⃣  停止面板 polling..."
bash scripts/telegram-panel.sh stop 2>/dev/null
echo ""

# 2. 跑 self-heal fix（清理 + 修復）
echo "2️⃣  執行清理修復..."
zsh scripts/self-heal.sh fix 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
echo ""

# 3. CR-7 掃描
echo "3️⃣  CR-7 未授權自動化掃描..."
zsh scripts/self-heal.sh cr7 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
echo ""

# 4. 重啟面板 polling
echo "4️⃣  重啟面板 polling..."
bash scripts/telegram-panel.sh start
echo ""

# 5. 送一個新面板到 Telegram
echo "5️⃣  送出新面板..."
bash scripts/telegram-panel.sh send
echo ""

echo "==============================="
echo "  ✅ 一鍵重啟完成"
echo "==============================="
