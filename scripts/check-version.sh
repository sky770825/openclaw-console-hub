#!/bin/bash
# 版本一致性快速檢查 — 掃描 6 處版本號並比對
BASE="/Users/caijunchang/openclaw任務面版設計"
MEMORY="/Users/caijunchang/.claude/projects/-Users-caijunchang-openclaw------/memory/MEMORY.md"
HEARTBEAT="/Users/caijunchang/.openclaw/workspace/HEARTBEAT.md"

VERSIONS=()
LABELS=()

add() {
  LABELS+=("$1")
  VERSIONS+=("$2")
  printf "%-25s → %s\n" "$1" "${2:-NOT FOUND}"
}

echo "=== 版本一致性檢查 ==="
echo ""

# 1. package.json
V=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$BASE/package.json" | head -1)
add "package.json" "$V"

# 2. server/package.json
V=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$BASE/server/package.json" | head -1)
add "server/package.json" "$V"

# 3. server/src/index.ts
V=$(sed -n "s/.*version:[[:space:]]*'\([^']*\)'.*/\1/p" "$BASE/server/src/index.ts" | head -1)
add "server/src/index.ts" "$V"

# 4. CLAUDE.md
V=$(grep -o 'v2\.[0-9]*\.[0-9]*' "$BASE/CLAUDE.md" | head -1 | sed 's/^v//')
add "CLAUDE.md" "$V"

# 5. MEMORY.md
V=$(grep -o 'v2\.[0-9]*\.[0-9]*' "$MEMORY" | head -1 | sed 's/^v//')
add "MEMORY.md" "$V"

# 6. HEARTBEAT.md
V=$(grep -o 'v2\.[0-9]*\.[0-9]*' "$HEARTBEAT" | head -1 | sed 's/^v//')
add "HEARTBEAT.md" "$V"

echo ""

# 比對
REF="${VERSIONS[0]}"
MISMATCH=0
for i in "${!VERSIONS[@]}"; do
  if [ "${VERSIONS[$i]}" != "$REF" ]; then
    MISMATCH=$((MISMATCH + 1))
  fi
done

if [ "$MISMATCH" -eq 0 ]; then
  echo "✅ 全部一致：v$REF"
else
  echo "❌ 不一致：$MISMATCH 處與 package.json (v$REF) 不同"
  echo ""
  for i in "${!VERSIONS[@]}"; do
    if [ "${VERSIONS[$i]}" != "$REF" ]; then
      echo "   ❌ ${LABELS[$i]}: ${VERSIONS[$i]} (應為 $REF)"
    fi
  done
fi
