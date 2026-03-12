import sys
import re
import os

file_path = sys.argv[1]
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Double Penalty: Ensure score reduction is mutually exclusive
# Look for logic that subtracts 50 and 35
# Pattern: if (error) { score -= 50 } if (!output.includes('TASK_COMPLETE')) { score -= 35 }
# We want to change the second one to an 'else if' or wrap them.

# Attempt to find the scoring block
# This regex targets the specific pattern described in the task
if "score -= 50" in content and "score -= 35" in content:
    # Change independent if to else if for the task complete check
    # Logic: if (failed) -50 else if (!complete) -35
    content = re.sub(
        r"(if\s*\(.*?(?:error|failed).*?\{[^}]*score\s*[-=]+\s*50;?\s*\})\s*if\s*\(!?.*?\.includes\(['\"]TASK_COMPLETE['\"]\)\s*\)",
        r"\1 else if (!output.includes('TASK_COMPLETE'))",
        content,
        flags=re.DOTALL
    )
    print("Applied Double Penalty fix.")

# 2. Fix Fragile Output Requirement: Add trimmed check and case insensitivity
content = content.replace(".includes('TASK_COMPLETE')", ".toUpperCase().includes('TASK_COMPLETE')")
content = content.replace('.includes("TASK_COMPLETE")', '.toUpperCase().includes("TASK_COMPLETE")')
print("Applied TASK_COMPLETE fragility fix (Case Insensitive).")

# 3. Fix Error Detection: Use exitCode instead of stderr content if possible
# Look for logic: const isError = stderr.length > 0
# Replace with: const isError = exitCode !== 0
if "stderr.length > 0" in content or "stderr.trim()" in content:
    content = re.sub(
        r"(const|let|var)\s+(\w+Error)\s*=\s*.*?stderr\.length\s*>\s*0",
        r"\1 \2 = code !== 0 && code !== undefined",
        content
    )
    print("Applied Error Detection fix (Exit Code based).")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
