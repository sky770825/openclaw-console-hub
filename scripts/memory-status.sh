#!/usr/bin/env bash
# memory-status.sh — NEUXA 記憶庫健康狀態報告
# 功能：統計 memory/ 目錄所有 md 檔案的字數、最大/最舊檔案，輸出健康度報告
# 位置：~/.openclaw/workspace/scripts/memory-status.sh
# 用法：bash ~/.openclaw/workspace/scripts/memory-status.sh

MEMORY_DIR="${HOME}/.openclaw/workspace/memory"
TODAY=$(date +%s)

echo "=========================================="
echo "  NEUXA 記憶庫健康報告 — $(date '+%Y-%m-%d %H:%M')"
echo "=========================================="
echo ""

# ── 1. 基本統計 ──
total_files=0
total_words=0
declare -a file_list=()
declare -a word_list=()
declare -a age_list=()

while IFS= read -r -d '' file; do
  wc_out=$(wc -w < "$file" 2>/dev/null || echo "0")
  wc_out="${wc_out// /}"
  file_mtime=$(stat -f '%m' "$file" 2>/dev/null || echo "$TODAY")
  age_days=$(( (TODAY - file_mtime) / 86400 ))

  file_list+=("$file")
  word_list+=("$wc_out")
  age_list+=("$age_days")

  total_files=$((total_files + 1))
  total_words=$((total_words + wc_out))

done < <(find "$MEMORY_DIR" -name "*.md" -print0 2>/dev/null)

echo "--- 基本統計 ---"
echo "  總檔案數：${total_files} 個"
echo "  總字數：${total_words} 字"
echo ""

# ── 2. 最大的 5 個檔案 ──
echo "--- 最大的 5 個檔案 ---"

# 用 python3 排序（bash 關聯陣列不保證排序）
python3 - <<PYEOF
import os, subprocess

memory_dir = os.path.expanduser("~/.openclaw/workspace/memory")
entries = []
for root, dirs, files in os.walk(memory_dir):
    for f in files:
        if f.endswith('.md'):
            full = os.path.join(root, f)
            try:
                with open(full, 'r', errors='ignore') as fh:
                    content = fh.read()
                    wc = len(content.split())
                entries.append((wc, full))
            except:
                pass

entries.sort(reverse=True)
for i, (wc, path) in enumerate(entries[:5]):
    rel = path.replace(os.path.expanduser("~"), "~")
    flag = " *** 大檔警告" if wc > 5000 else ""
    print(f"  {i+1}. {wc:>6} 字  {rel}{flag}")
PYEOF

echo ""

# ── 3. 最舊的 5 個檔案（超過 14 天）──
echo "--- 最舊的 5 個檔案（> 14 天）---"

python3 - <<PYEOF
import os, time

memory_dir = os.path.expanduser("~/.openclaw/workspace/memory")
now = time.time()
entries = []
for root, dirs, files in os.walk(memory_dir):
    for f in files:
        if f.endswith('.md'):
            full = os.path.join(root, f)
            try:
                mtime = os.path.getmtime(full)
                age_days = int((now - mtime) / 86400)
                if age_days >= 14:
                    entries.append((age_days, full))
            except:
                pass

entries.sort(reverse=True)
if not entries:
    print("  （沒有超過 14 天的檔案）")
else:
    for i, (age, path) in enumerate(entries[:5]):
        rel = path.replace(os.path.expanduser("~"), "~")
        flag = " *** 老化警告" if age > 30 else ""
        print(f"  {i+1}. {age:>4} 天前  {rel}{flag}")
PYEOF

echo ""

# ── 4. 健康度判定 ──
echo "--- 健康度報告 ---"

python3 - <<PYEOF
import os, time

memory_dir = os.path.expanduser("~/.openclaw/workspace/memory")
now = time.time()
total_words = 0
has_big_old_file = False  # 超過 7 天且超過 5000 字
has_very_old_big_file = False  # 超過 30 天且超過 5000 字

for root, dirs, files in os.walk(memory_dir):
    for f in files:
        if f.endswith('.md'):
            full = os.path.join(root, f)
            try:
                with open(full, 'r', errors='ignore') as fh:
                    content = fh.read()
                    wc = len(content.split())
                mtime = os.path.getmtime(full)
                age_days = int((now - mtime) / 86400)
                total_words += wc
                if wc > 5000:
                    if age_days > 7:
                        has_big_old_file = True
                    if age_days > 30:
                        has_very_old_big_file = True
            except:
                pass

# 判定健康度
if total_words > 100000 or has_very_old_big_file:
    status = "RED"
    emoji = "[RED]"
    reason = []
    if total_words > 100000:
        reason.append(f"總字數 {total_words} > 100,000")
    if has_very_old_big_file:
        reason.append("有超過 30 天的大型記憶檔（>5000字）")
    print(f"  狀態：{emoji} 需要立即壓縮！")
    for r in reason:
        print(f"    原因：{r}")
    print(f"  建議：執行 bash ~/.openclaw/workspace/scripts/memory-compress.sh")
elif total_words > 50000:
    status = "YELLOW"
    emoji = "[YELLOW]"
    print(f"  狀態：{emoji} 記憶庫偏大，建議壓縮")
    print(f"    總字數：{total_words} / 100,000")
    print(f"  建議：執行 bash ~/.openclaw/workspace/scripts/memory-compress.sh")
else:
    status = "GREEN"
    emoji = "[GREEN]"
    print(f"  狀態：{emoji} 健康")
    print(f"    總字數：{total_words} / 50,000（安全範圍內）")
    if has_big_old_file:
        print(f"    提醒：有超過 7 天的大型檔案，可選擇性壓縮")

print()
print(f"  快速指令：")
print(f"    查看狀態：bash ~/.openclaw/workspace/scripts/memory-status.sh")
print(f"    執行壓縮：bash ~/.openclaw/workspace/scripts/memory-compress.sh")
PYEOF

echo ""
echo "=========================================="
