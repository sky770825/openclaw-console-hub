#!/usr/bin/env bash
# 版本對比與學習系統
# 功能：對比前後版本差異，總結改進點，持續學習

set -euo pipefail

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
VERSIONS_DIR="$WORKSPACE/core/.versions"
LEARNING_DIR="$WORKSPACE/learning"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

echo "🔍 版本對比與學習分析"
echo "================================"

# ============================================
# Step 1: 取得最近兩個版本
# ============================================

LATEST_VERSION="$(ls -t "$VERSIONS_DIR"/CORE-*.md 2>/dev/null | head -1)"
PREVIOUS_VERSION="$(ls -t "$VERSIONS_DIR"/CORE-*.md 2>/dev/null | head -2 | tail -1)"

if [[ -z "$LATEST_VERSION" ]] || [[ -z "$PREVIOUS_VERSION" ]]; then
    echo "⚠️  版本不足，需要至少 2 個版本才能對比"
    exit 0
fi

echo "📊 對比版本："
echo "   前版本: $(basename "$PREVIOUS_VERSION")"
echo "   新版本: $(basename "$LATEST_VERSION")"
echo ""

# ============================================
# Step 2: 使用 Python 進行智能對比分析
# ============================================

echo "🤖 執行智能分析..."

python3 - <<'PY'
import difflib
import pathlib
import sys
import json
from datetime import datetime

# 讀取兩個版本
prev_file = pathlib.Path(sys.argv[1])
latest_file = pathlib.Path(sys.argv[2])

prev_content = prev_file.read_text(encoding='utf-8')
latest_content = latest_file.read_text(encoding='utf-8')

prev_lines = prev_content.split('\n')
latest_lines = latest_content.split('\n')

# 計算差異
differ = difflib.Differ()
diff = list(differ.compare(prev_lines, latest_lines))

# 分析差異
added_lines = [line[2:] for line in diff if line.startswith('+ ')]
removed_lines = [line[2:] for line in diff if line.startswith('- ')]
changed_sections = []

# 提取改變的章節
current_section = None
for i, line in enumerate(latest_lines):
    if line.startswith('##'):
        current_section = line.strip('# ').strip()

    # 檢查這一行是否在新增的內容中
    if line in [l.strip() for l in added_lines]:
        if current_section and current_section not in changed_sections:
            changed_sections.append(current_section)

# 分析改進點
improvements = []
regressions = []

# 檢測新增任務
for line in added_lines:
    if any(kw in line for kw in ['✅', '完成', '[x]']):
        improvements.append(f"新增完成項目: {line.strip()[:80]}")
    elif any(kw in line for kw in ['🔄', '進行中', '[ ]']):
        improvements.append(f"新增進行中任務: {line.strip()[:80]}")

# 檢測移除的完成項目（可能是退步）
for line in removed_lines:
    if any(kw in line for kw in ['✅', '完成', '[x]']):
        regressions.append(f"移除了完成項目: {line.strip()[:80]}")

# 統計數據
stats = {
    'added_lines': len(added_lines),
    'removed_lines': len(removed_lines),
    'changed_sections': changed_sections,
    'improvements': improvements[:5],
    'regressions': regressions[:3],
    'timestamp': datetime.now().isoformat()
}

# 輸出 Markdown 報告
print("## 📊 版本對比分析報告")
print(f"\n**分析時間**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"\n### 變更統計")
print(f"- ➕ 新增行數: {stats['added_lines']}")
print(f"- ➖ 刪除行數: {stats['removed_lines']}")
print(f"- 🔧 變更章節數: {len(stats['changed_sections'])}")

if changed_sections:
    print(f"\n### 變更的章節")
    for section in changed_sections[:10]:
        print(f"- {section}")

if improvements:
    print(f"\n### ✅ 改進點")
    for imp in improvements:
        print(f"- {imp}")

if regressions:
    print(f"\n### ⚠️ 潛在退步")
    for reg in regressions:
        print(f"- {reg}")

# 學習建議
print(f"\n### 💡 學習建議")

if stats['added_lines'] > stats['removed_lines'] * 2:
    print("- ⚠️ 新增內容過多，可能導致記憶膨脹，建議精簡")
elif stats['removed_lines'] > stats['added_lines'] * 2:
    print("- ✅ 成功精簡內容，保持記憶清晰")

if len(improvements) > len(regressions):
    print("- ✅ 整體進步，繼續保持")
else:
    print("- ⚠️ 需要檢查是否有重要資訊遺失")

# 保存分析結果到 JSON
json_output = {
    'prev_version': str(prev_file.name),
    'latest_version': str(latest_file.name),
    'stats': stats
}

output_file = pathlib.Path(sys.argv[3]) / f"version-compare-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
output_file.write_text(json.dumps(json_output, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"\n📁 詳細分析已保存: {output_file}")

PY "$PREVIOUS_VERSION" "$LATEST_VERSION" "$LEARNING_DIR"

# ============================================
# Step 3: 提取學習重點（保存到學習筆記）
# ============================================

echo ""
echo "📚 更新學習筆記..."

# 檢查是否有「進化學習筆記」
EVOLUTION_LOG="$LEARNING_DIR/00-evolution-log.md"

if [[ ! -f "$EVOLUTION_LOG" ]]; then
    cat > "$EVOLUTION_LOG" <<'EOF'
# 小蔡進化日誌

> 記錄每次版本更新的改進與學習

---

EOF
fi

# 追加本次學習記錄
cat >> "$EVOLUTION_LOG" <<EOF

## $TIMESTAMP

**版本對比**: $(basename "$PREVIOUS_VERSION") → $(basename "$LATEST_VERSION")

### 本次學習重點
- 待補充（由 AI 分析對話內容後填寫）

### 改進方法
- 待補充

### 避免重蹈覆轍
- 待補充

---

EOF

echo "✅ 學習記錄已追加到: $EVOLUTION_LOG"
echo ""
echo "🎓 小蔡又進化了一點點！"
