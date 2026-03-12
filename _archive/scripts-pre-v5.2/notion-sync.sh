#!/usr/bin/env bash
# OpenClaw Notion 整合核心工具 v1.0
# 用於管理 Notion 資料庫的 CRUD 操作

set -euo pipefail

# 載入環境變數 (如果存在)
NOTION_ENV="$HOME/.openclaw/secrets/notion.env"
if [ -f "$NOTION_ENV" ]; then
    source "$NOTION_ENV"
fi

NOTION_API_KEY="${NOTION_API_KEY:-}"
NOTION_VERSION="2022-06-28"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "使用方法: $0 <command> [args]"
    echo ""
    echo "指令:"
    echo "  event <title> <date> <type> <summary>  新增行程事件"
    echo "  link <title> <url> <category>          新增/更新連結"
    echo "  search <keyword>                       搜尋連結"
    echo "  insight <title> <content> <format>     發布 Notebook LM 產出"
    echo ""
}

check_api_key() {
    if [ -z "$NOTION_API_KEY" ]; then
        echo -e "${RED}錯誤: 未設定 NOTION_API_KEY。請檢查 $NOTION_ENV${NC}"
        exit 1
    fi
}

# 新增頁面到資料庫
# args: db_id, json_payload
notion_add_page() {
    local db_id="$1"
    local payload="$2"
    
    curl -s -X POST "https://api.notion.com/v1/pages" \
        -H "Authorization: Bearer $NOTION_API_KEY" \
        -H "Content-Type: application/json" \
        -H "Notion-Version: $NOTION_VERSION" \
        --data "$payload"
}

case "${1:-}" in
    event)
        check_api_key
        title="$2"
        date="$3"
        type="$4"
        summary="$5"
        db_id="$NOTION_DB_TIMELINE"
        
        payload=$(cat <<EOF
{
  "parent": { "database_id": "$db_id" },
  "properties": {
    "Name": { "title": [ { "text": { "content": "$title" } } ] },
    "Date": { "date": { "start": "$date" } },
    "Type": { "select": { "name": "$type" } },
    "Summary": { "rich_text": [ { "text": { "content": "$summary" } } ] }
  }
}
EOF
)
        notion_add_page "$db_id" "$payload" | jq -r '"✅ 已同步行程至 Notion: \(.url)"'
        ;;

    link)
        check_api_key
        title="$2"
        url="$3"
        category="$4"
        db_id="$NOTION_DB_LINKS"
        
        payload=$(cat <<EOF
{
  "parent": { "database_id": "$db_id" },
  "properties": {
    "Title": { "title": [ { "text": { "content": "$title" } } ] },
    "URL": { "url": "$url" },
    "Category": { "multi_select": [ { "name": "$category" } ] }
  }
}
EOF
)
        notion_add_page "$db_id" "$payload" | jq -r '"✅ 已儲存連結至 Notion: \(.url)"'
        ;;

    search)
        check_api_key
        keyword="$2"
        db_id="$NOTION_DB_LINKS"
        
        curl -s -X POST "https://api.notion.com/v1/databases/$db_id/query" \
            -H "Authorization: Bearer $NOTION_API_KEY" \
            -H "Content-Type: application/json" \
            -H "Notion-Version: $NOTION_VERSION" \
            --data "{ \"filter\": { \"property\": \"Title\", \"title\": { \"contains\": \"$keyword\" } } }" | \
            jq -r '.results[] | "\(.properties.Title.title[0].text.content) \t \(.properties.URL.url)"'
        ;;

    insight)
        check_api_key
        title="$2"
        content="$3"
        format="$4"
        db_id="$NOTION_DB_INSIGHTS"
        
        payload=$(cat <<EOF
{
  "parent": { "database_id": "$db_id" },
  "properties": {
    "Topic": { "title": [ { "text": { "content": "$title" } } ] },
    "Format": { "select": { "name": "$format" } },
    "Date": { "date": { "start": "$(date +%Y-%m-%d)" } }
  },
  "children": [
    {
      "object": "block",
      "type": "paragraph",
      "paragraph": {
        "rich_text": [ { "type": "text", "text": { "content": "$content" } } ]
      }
    }
  ]
}
EOF
)
        notion_add_page "$db_id" "$payload" | jq -r '"✅ Notebook LM 產出已展示至 Notion: \(.url)"'
        ;;

    *)
        usage
        exit 1
        ;;
esac
