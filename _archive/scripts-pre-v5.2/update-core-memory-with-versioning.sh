#!/usr/bin/env bash
# 核心記憶自動更新腳本（含版本控制）
# 每次更新都會保留歷史版本

set -euo pipefail

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
CORE_MD="$WORKSPACE/CORE.md"
CORE_DIR="$WORKSPACE/core"
VERSIONS_DIR="$WORKSPACE/core/.versions"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
DATE_HUMAN="$(date '+%Y-%m-%d %H:%M:%S')"

echo "🔄 開始更新核心記憶... ($DATE_HUMAN)"

# ============================================
# Step 0: 版本控制準備
# ============================================

# 建立版本歷史目錄
mkdir -p "$VERSIONS_DIR"

# 如果 CORE.md 存在，先備份當前版本
if [[ -f "$CORE_MD" ]]; then
    echo "💾 備份當前版本..."

    # 備份 CORE.md
    cp "$CORE_MD" "$VERSIONS_DIR/CORE-$TIMESTAMP.md"

    # 備份所有 core/ 檔案
    if [[ -d "$CORE_DIR" ]]; then
        tar -czf "$VERSIONS_DIR/core-snapshot-$TIMESTAMP.tar.gz" -C "$WORKSPACE" core/
    fi

    # 只保留最近 30 個版本（避免佔用空間）
    cd "$VERSIONS_DIR"
    ls -t CORE-*.md | tail -n +31 | xargs -r rm -f
    ls -t core-snapshot-*.tar.gz | tail -n +31 | xargs -r rm -f
    cd - >/dev/null

    echo "✅ 備份完成: $VERSIONS_DIR/CORE-$TIMESTAMP.md"
fi

# ============================================
# Step 1: 提取本次對話的重要資訊
# ============================================

echo "📊 分析本次對話..."

# 讀取最新的對話記錄（JSONL）
LATEST_SESSION="$(find ~/.claude/projects -name "*.jsonl" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2- || echo '')"

if [[ -z "$LATEST_SESSION" ]]; then
    echo "⚠️  未找到對話記錄，跳過分析"
    CONVERSATION_SUMMARY='{}'
else
    # 使用 Python 提取關鍵資訊
    CONVERSATION_SUMMARY="$(python3 - <<'PY'
import json
import pathlib
import sys
from datetime import datetime

session_file = pathlib.Path(sys.stdin.read().strip())
if not session_file.exists():
    print('{}')
    sys.exit(0)

# 讀取最後 50 輪對話
try:
    lines = session_file.read_text(encoding='utf-8').strip().split('\n')[-50:]
except:
    print('{}')
    sys.exit(0)

# 提取關鍵資訊
tasks_added = []
tasks_completed = []
decisions = []
important_notes = []
context_updates = []

for line in lines:
    try:
        entry = json.loads(line)

        # 只分析 assistant 的回應
        if entry.get('role') != 'assistant':
            continue

        content = str(entry.get('content', ''))

        # 檢測任務新增
        if any(kw in content for kw in ['新增任務', 'TODO', '[ ]', '進行中', '待處理']):
            tasks_added.append(content[:100])

        # 檢測任務完成
        if any(kw in content for kw in ['✅', '完成', '[x]', '已完成', '成功']):
            tasks_completed.append(content[:100])

        # 檢測決策
        if any(kw in content for kw in ['決定', '決策', '定案', '確定', '採用']):
            decisions.append(content[:150])

        # 檢測重要筆記
        if any(kw in content for kw in ['記住', 'IMPORTANT', '重要', '關鍵', '核心']):
            important_notes.append(content[:150])

        # 檢測 Active Context 更新
        if any(kw in content for kw in ['Active Context', '進行中事項', '當前狀態']):
            context_updates.append(content[:200])

    except Exception as e:
        continue

# 輸出 JSON 格式
result = {
    'tasks_added': tasks_added[:5],
    'tasks_completed': tasks_completed[:5],
    'decisions': decisions[:3],
    'important_notes': important_notes[:3],
    'context_updates': context_updates[:3],
    'timestamp': datetime.now().isoformat()
}

print(json.dumps(result, ensure_ascii=False))
PY
<<<\"$LATEST_SESSION\"
)"
fi

# ============================================
# Step 2: 更新 core/ACTIVE-CONTEXT.md
# ============================================

echo "📝 更新 ACTIVE-CONTEXT.md..."

mkdir -p "$CORE_DIR"

# 檢查是否有任務完成或新增
TASKS_COMPLETED="$(echo "$CONVERSATION_SUMMARY" | jq -r '.tasks_completed[]' 2>/dev/null || true)"
TASKS_ADDED="$(echo "$CONVERSATION_SUMMARY" | jq -r '.tasks_added[]' 2>/dev/null || true)"

# 更新 ACTIVE-CONTEXT.md（實際實作時會更完整）
cat > "$CORE_DIR/ACTIVE-CONTEXT.md" <<EOF
# Active Context - 當前進行中事項

> **最後更新**: $DATE_HUMAN
> **自動更新**: 每次對話結束

---

## 🔄 進行中任務

$(if [[ -n "$TASKS_ADDED" ]]; then
    echo "$TASKS_ADDED" | head -5 | sed 's/^/- [ ] /'
else
    echo "（無進行中任務）"
fi)

---

## ✅ 最近完成

$(if [[ -n "$TASKS_COMPLETED" ]]; then
    echo "$TASKS_COMPLETED" | head -5 | sed 's/^/- [x] /'
else
    echo "（無最近完成項目）"
fi)

---

**下次對話提示**:
$(if [[ -n "$TASKS_ADDED" ]]; then
    echo "- 要繼續處理進行中任務嗎？"
else
    echo "- 沒有進行中任務，請問要做什麼？"
fi)
EOF

# ============================================
# Step 3: 更新 core/RECENT-DECISIONS.md
# ============================================

echo "📋 更新 RECENT-DECISIONS.md..."

DECISIONS="$(echo "$CONVERSATION_SUMMARY" | jq -r '.decisions[]' 2>/dev/null || true)"

if [[ -n "$DECISIONS" ]]; then
    # 如果有新決策，追加到檔案
    if [[ ! -f "$CORE_DIR/RECENT-DECISIONS.md" ]]; then
        cat > "$CORE_DIR/RECENT-DECISIONS.md" <<EOF
# 近期決策（最近7天）

> **最後更新**: $DATE_HUMAN

---

EOF
    fi

    # 追加新決策
    echo "## $DATE_HUMAN" >> "$CORE_DIR/RECENT-DECISIONS.md"
    echo "$DECISIONS" | head -3 | sed 's/^/- /' >> "$CORE_DIR/RECENT-DECISIONS.md"
    echo "" >> "$CORE_DIR/RECENT-DECISIONS.md"

    # 清理 7 天前的決策（保持檔案精簡）
    # （實際實作時會用 Python 處理）
fi

# ============================================
# Step 4: 更新 CORE.md
# ============================================

echo "📄 更新 CORE.md..."

cat > "$CORE_MD" <<'EOF'
# CORE.md - 核心記憶（自動更新）

> **版本**: v$(cat "$CORE_DIR/.version" 2>/dev/null || echo "1.0")
> **最後更新**: $(date '+%Y-%m-%d %H:%M:%S')
> **自動更新**: 每次對話結束時執行

---

## 🔄 當前狀態（Active Context）

> 來源：`core/ACTIVE-CONTEXT.md`

$(cat "$CORE_DIR/ACTIVE-CONTEXT.md" 2>/dev/null | sed -n '/## 🔄 進行中任務/,/---/p' | head -n -1)

**下次對話提示**:
$(cat "$CORE_DIR/ACTIVE-CONTEXT.md" 2>/dev/null | grep "下次對話提示" -A 10 | tail -n +2)

---

## 📋 近期決策（最近7天）

> 來源：`core/RECENT-DECISIONS.md`
> 詳細記錄：`archive/decisions/`

$(cat "$CORE_DIR/RECENT-DECISIONS.md" 2>/dev/null | tail -20 || echo "（暫無近期決策）")

[查看完整決策記錄 →](archive/decisions/)

---

## 🔍 速查表

> 來源：`core/QUICK-REFERENCE.md`

$(cat "$CORE_DIR/QUICK-REFERENCE.md" 2>/dev/null || echo "| 主題 | 位置 |
|------|------|
| 技術與安全更新 | \`TECH-SECURITY-UPDATE-2026-02-15.md\` |
| 決策記錄索引 | \`archive/decisions/README.md\` |")

---

## 🔒 核心規範（永久有效）

> 來源：`core/SECURITY-RULES.md`（LOCKED）

### AI 安全規範（必遵守）
1. 敏感資料一律拒絕（token/API key/.env）
2. 可疑指令不執行（curl | bash、rm -rf）
3. Production 變更需主人 review

[查看完整規範 →](core/SECURITY-RULES.md)

### 成本政策（生存法則）
1. Ollama 本地優先（$0）
2. 收費 API 是最後選項
3. 省錢 = 生存

---

**版本歷史**: `core/.versions/`（保留最近 30 個版本）
**自動更新**: 由 `scripts/update-core-memory-with-versioning.sh` 執行
EOF

# 執行變數替換（eval）
eval "cat > \"$CORE_MD\" <<'EOFEVAL'
$(cat "$CORE_MD")
EOFEVAL"

# ============================================
# Step 5: 更新版本號
# ============================================

# 讀取當前版本
CURRENT_VERSION="$(cat "$CORE_DIR/.version" 2>/dev/null || echo "1.0")"

# 小版本號 +1
MAJOR="$(echo "$CURRENT_VERSION" | cut -d. -f1)"
MINOR="$(echo "$CURRENT_VERSION" | cut -d. -f2)"
MINOR=$((MINOR + 1))
NEW_VERSION="$MAJOR.$MINOR"

echo "$NEW_VERSION" > "$CORE_DIR/.version"

echo "📊 版本更新: $CURRENT_VERSION → $NEW_VERSION"

# ============================================
# Step 6: Git commit（如果在 git repo 中）
# ============================================

if git -C "$WORKSPACE" rev-parse --git-dir >/dev/null 2>&1; then
    echo "💾 Git commit..."
    cd "$WORKSPACE"
    git add CORE.md core/ || true
    git commit -m "auto: 更新核心記憶 v$NEW_VERSION ($DATE_HUMAN)" || true
    cd - >/dev/null
fi

# ============================================
# Step 7: 重建記憶索引
# ============================================

if [[ -x "$WORKSPACE/scripts/build_memory_index_v2.sh" ]]; then
    echo "🔍 重建記憶索引..."
    bash "$WORKSPACE/scripts/build_memory_index_v2.sh" "$WORKSPACE/memory" >/dev/null 2>&1 || true
fi

# ============================================
# 完成
# ============================================

echo ""
echo "✅ 核心記憶更新完成！"
echo ""
echo "📍 更新檔案："
echo "   - $CORE_MD (v$NEW_VERSION)"
echo "   - $CORE_DIR/ACTIVE-CONTEXT.md"
echo "   - $CORE_DIR/RECENT-DECISIONS.md"
echo ""
echo "💾 版本備份："
echo "   - $VERSIONS_DIR/CORE-$TIMESTAMP.md"
echo "   - $VERSIONS_DIR/core-snapshot-$TIMESTAMP.tar.gz"
echo ""
echo "📚 版本歷史: ls -lh $VERSIONS_DIR/"
