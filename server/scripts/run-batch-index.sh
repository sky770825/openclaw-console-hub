#!/bin/bash
# 輕量 batch-index 腳本 — 繞過 server，直接用 curl 呼叫 Google + Supabase API
# 用法: bash scripts/run-batch-index.sh [目錄] [category]

DIR="${1:-/Users/caijunchang/openclaw任務面版設計/cookbook}"
CATEGORY="${2:-cookbook}"
GOOGLE_KEY="${GOOGLE_API_KEY:-}"
SB_URL="https://vbejswywswaeyfasnwjq.supabase.co"
SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZWpzd3l3c3dhZXlmYXNud2pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTg4NywiZXhwIjoyMDg2MTk1ODg3fQ.VHwlh1LZ77B_IIL9tXi3UM-yJKh7LvZMirMH6wfqh_A"

TOTAL=0
INDEXED=0
FAILED=0

echo "=== Batch Index: $DIR (category=$CATEGORY) ==="

for mdfile in "$DIR"/*.md; do
  [ -f "$mdfile" ] || continue
  FILENAME=$(basename "$mdfile")
  TOTAL=$((TOTAL + 1))

  # 讀檔案內容（截斷到 2000 chars 作為 embedding text）
  CONTENT=$(head -c 4000 "$mdfile" | tr '\n' ' ' | sed 's/["\]/\\&/g' | head -c 2000)
  TITLE=$(grep -m1 '^# ' "$mdfile" | sed 's/^# //' | head -c 100)
  [ -z "$TITLE" ] && TITLE="$FILENAME"

  # 取 frontmatter tags
  TAGS=$(sed -n '/^---$/,/^---$/p' "$mdfile" | grep 'tags:' | sed 's/tags: *\[//;s/\]//;s/, */","/g;s/^/["/;s/$/"]/' 2>/dev/null)
  [ -z "$TAGS" ] && TAGS='[]'

  # 先刪舊的
  RELPATH="${FILENAME}"
  curl -s -X DELETE "$SB_URL/rest/v1/openclaw_embeddings?file_name=eq.$FILENAME" \
    -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $SB_KEY" > /dev/null 2>&1

  # 呼叫 Google Embedding
  EMBED_TEXT="[$TITLE] [$CATEGORY] $CONTENT"
  RESPONSE=$(curl -s --max-time 30 -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=$GOOGLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"content\": {\"parts\": [{\"text\": $(echo "$EMBED_TEXT" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))")}]}, \"outputDimensionality\": 768}")

  # 提取 vector
  VECTOR=$(echo "$RESPONSE" | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    v=d.get('embedding',{}).get('values',[])
    if v: print(json.dumps(v))
    else: print('')
except: print('')
" 2>/dev/null)

  if [ -z "$VECTOR" ]; then
    echo "FAIL: $FILENAME (embedding failed)"
    FAILED=$((FAILED + 1))
    continue
  fi

  # 產生 ID
  POINT_ID=$(echo -n "$FILENAME:v2:0" | md5sum 2>/dev/null || echo -n "$FILENAME:v2:0" | md5 -q)
  POINT_ID_NUM=$(python3 -c "print(int('${POINT_ID:0:15}', 16))" 2>/dev/null)
  [ -z "$POINT_ID_NUM" ] && POINT_ID_NUM=$RANDOM$RANDOM

  # 取檔案大小
  FSIZE=$(wc -c < "$mdfile" | tr -d ' ')
  DATE=$(date +%Y-%m-%d)
  NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  PREVIEW=$(echo "$CONTENT" | head -c 200 | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))")
  CONTENT_JSON=$(echo "$CONTENT" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))")
  TITLE_JSON=$(echo "$TITLE" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))")

  # Upsert to Supabase
  UPSERT_RESULT=$(curl -s -X POST "$SB_URL/rest/v1/openclaw_embeddings" \
    -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $SB_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "{
      \"id\": $POINT_ID_NUM,
      \"doc_title\": $TITLE_JSON,
      \"section_title\": \"full-doc\",
      \"content\": $CONTENT_JSON,
      \"content_preview\": $PREVIEW,
      \"file_path\": \"cookbook/$FILENAME\",
      \"file_name\": \"$FILENAME\",
      \"category\": \"$CATEGORY\",
      \"chunk_index\": 0,
      \"chunk_total\": 1,
      \"size\": $FSIZE,
      \"date\": \"$DATE\",
      \"embedding\": \"$VECTOR\",
      \"status\": \"active\",
      \"content_type\": \"reference\",
      \"zone\": \"hot\",
      \"is_pinned\": false,
      \"indexed_at\": \"$NOW\",
      \"tags\": $TAGS
    }")

  # 檢查結果
  if echo "$UPSERT_RESULT" | grep -q '"code"'; then
    echo "FAIL: $FILENAME (upsert error: $(echo "$UPSERT_RESULT" | head -c 100))"
    FAILED=$((FAILED + 1))
  else
    echo "OK: $FILENAME"
    INDEXED=$((INDEXED + 1))
  fi

  # 短暫延遲避免 API 限速
  sleep 0.3
done

echo ""
echo "=== 完成！total=$TOTAL indexed=$INDEXED failed=$FAILED ==="
