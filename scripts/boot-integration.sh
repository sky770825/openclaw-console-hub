#!/bin/zsh
# Boot Integration v1.0 - 整合 Auto-Skill v2.0 + Triple Memory
# 執行時機：每次 /new 開新對話時

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
MEMORY_DIR="${WORKSPACE}/memory"
AUTO_SKILL_DIR="${WORKSPACE}/.auto-skill"
BOOT_LOG="${AUTO_SKILL_DIR}/boot.log"

# 初始化日誌
mkdir -p "$AUTO_SKILL_DIR"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 啟動整合開始" > "$BOOT_LOG"

# ============================================
# 第 1 層：必讀核心檔案 (3-4KB)
# ============================================

echo "🧠 載入核心記憶..." | tee -a "$BOOT_LOG"

# 1.1 SOUL.md - 人設
echo "  ✓ SOUL.md" >> "$BOOT_LOG"

# 1.2 USER.md - 用戶檔案  
echo "  ✓ USER.md" >> "$BOOT_LOG"

# 1.3 MEMORY.md Summary 區塊
echo "  ✓ MEMORY.md (Summary)" >> "$BOOT_LOG"

# 1.4 Auto-Skill 通用知識庫
if [[ -f "${AUTO_SKILL_DIR}/knowledge/communication-style.md" ]]; then
    echo "  ✓ communication-style.md" >> "$BOOT_LOG"
fi

# 1.5 Active Context - 進行中事項
if [[ -f "${MEMORY_DIR}/2026-02-15.md" ]]; then
    echo "  ✓ 最新每日記憶 (2026-02-15)" >> "$BOOT_LOG"
    # 提取 Summary 區塊
    grep -A 20 "^## ✅ 完成項目" "${MEMORY_DIR}/2026-02-15.md" 2>/dev/null | head -30 || true
fi

# ============================================
# 第 2 層：載入技能經驗庫索引
# ============================================

echo "" | tee -a "$BOOT_LOG"
echo "📚 技能經驗庫索引：" | tee -a "$BOOT_LOG"

for skill_file in "${AUTO_SKILL_DIR}/experience"/skill-*.md; do
    if [[ -f "$skill_file" ]]; then
        skill_name=$(basename "$skill_file" .md | sed 's/skill-//')
        echo "  • ${skill_name}" | tee -a "$BOOT_LOG"
    fi
done

# ============================================
# 第 3 層：讀取 Checkpoint 索引
# ============================================

echo "" | tee -a "$BOOT_LOG"
echo "📋 最近 Checkpoint：" | tee -a "$BOOT_LOG"

if [[ -f "${MEMORY_DIR}/CHECKPOINT-LATEST.md" ]]; then
    # 只讀最後 3 個項目
    tail -20 "${MEMORY_DIR}/CHECKPOINT-LATEST.md" 2>/dev/null | grep "^- " | tail -3 | while read line; do
        echo "  ${line}" | tee -a "$BOOT_LOG"
    done
else
    echo "  (無)" | tee -a "$BOOT_LOG"
fi

# ============================================
# 第 4 層：啟動時主動提示
# ============================================

echo "" | tee -a "$BOOT_LOG"

# 檢查進行中事項
active_tasks=$(grep -E "^\s*-\s*🔄" "${MEMORY_DIR}/2026-02-15.md" 2>/dev/null | head -3 || echo "")
if [[ -n "$active_tasks" ]]; then
    echo "🔄 進行中任務：" | tee -a "$BOOT_LOG"
    echo "$active_tasks" | tee -a "$BOOT_LOG"
fi

echo "" | tee -a "$BOOT_LOG"
echo "✅ 啟動整合完成" | tee -a "$BOOT_LOG"
echo "   可用指令: /skill <名稱> | /memory | /checkpoint" | tee -a "$BOOT_LOG"
