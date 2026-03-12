#!/bin/bash
# ========================================
# OpenClaw 一鍵換 API Key
# ========================================
# 用法:
#   ./switch-key.sh google   <KEY>   換 Google Gemini
#   ./switch-key.sh kimi     <KEY>   換 Kimi/Moonshot
#   ./switch-key.sh anthropic <KEY>  換 Anthropic Claude
#   ./switch-key.sh xai      <KEY>   換 xAI Grok
#   ./switch-key.sh openrouter <KEY> 換 OpenRouter
#   ./switch-key.sh all              互動模式，逐一詢問
#   ./switch-key.sh show             顯示目前所有 key（遮蔽）

set -e

OPENCLAW_DIR="$HOME/.openclaw"
OPENCLAW_JSON="$OPENCLAW_DIR/openclaw.json"
MODELS_JSON="$OPENCLAW_DIR/agents/main/agent/models.json"

# ── 顏色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

mask_key() {
  local key="$1"
  if [ ${#key} -le 12 ]; then
    echo "$key"
  else
    echo "${key:0:8}...${key: -4}"
  fi
}

get_current_key() {
  local provider="$1"
  python3 -c "
import json
with open('$OPENCLAW_JSON') as f:
    d = json.load(f)
key = d.get('models',{}).get('providers',{}).get('$provider',{}).get('apiKey','')
print(key)
" 2>/dev/null
}

get_openrouter_key() {
  grep -o 'sk-or-v1-[a-f0-9]*' "$OPENCLAW_DIR/config/openrouter.env" 2>/dev/null || echo ""
}

replace_in_files() {
  local old="$1"
  local new="$2"
  local files=("$OPENCLAW_JSON" "$MODELS_JSON")

  for f in "${files[@]}"; do
    if [ -f "$f" ] && grep -q "$old" "$f" 2>/dev/null; then
      sed -i '' "s|$old|$new|g" "$f"
      echo -e "  ${GREEN}已更新${NC}: $(basename $f)"
    fi
  done
}

test_google() {
  local key="$1"
  local code=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$key" \
    -H "Content-Type: application/json" \
    -d '{"contents":[{"parts":[{"text":"hi"}]}]}' \
    --connect-timeout 5 --max-time 10)
  echo "$code"
}

test_kimi() {
  local key="$1"
  local code=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://api.moonshot.ai/v1/models" \
    -H "Authorization: Bearer $key" \
    --connect-timeout 5 --max-time 10)
  echo "$code"
}

test_anthropic() {
  local key="$1"
  local code=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://api.anthropic.com/v1/messages" \
    -H "x-api-key: $key" \
    -H "anthropic-version: 2023-06-01" \
    -H "Content-Type: application/json" \
    -d '{"model":"claude-haiku-4-5-20251001","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}' \
    --connect-timeout 5 --max-time 10)
  echo "$code"
}

test_xai() {
  local key="$1"
  local code=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://api.x.ai/v1/models" \
    -H "Authorization: Bearer $key" \
    --connect-timeout 5 --max-time 10)
  echo "$code"
}

test_openrouter() {
  local key="$1"
  local code=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://openrouter.ai/api/v1/models" \
    -H "Authorization: Bearer $key" \
    --connect-timeout 5 --max-time 10)
  echo "$code"
}

switch_provider() {
  local provider="$1"
  local new_key="$2"

  if [ "$provider" = "openrouter" ]; then
    local old_key=$(get_openrouter_key)
  else
    local old_key=$(get_current_key "$provider")
  fi

  if [ -z "$old_key" ]; then
    echo -e "  ${RED}找不到 $provider 的目前 key${NC}"
    return 1
  fi

  if [ "$old_key" = "$new_key" ]; then
    echo -e "  ${YELLOW}新舊 Key 相同，跳過${NC}"
    return 0
  fi

  # 測試新 key
  echo -n "  測試新 Key... "
  local test_func="test_$provider"
  local http_code=$($test_func "$new_key")

  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}OK${NC} (HTTP 200)"
  elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    echo -e "${RED}FAIL${NC} (HTTP $http_code - 無效的 key)"
    return 1
  else
    echo -e "${YELLOW}HTTP $http_code${NC} (可能有效，繼續)"
  fi

  # 替換
  echo -e "  ${CYAN}舊${NC}: $(mask_key "$old_key")"
  echo -e "  ${CYAN}新${NC}: $(mask_key "$new_key")"

  replace_in_files "$old_key" "$new_key"

  # 額外的 env 檔
  case "$provider" in
    google)
      for ef in "$OPENCLAW_DIR/config/google.env" "$OPENCLAW_DIR/config/google.env.bak"; do
        if [ -f "$ef" ]; then
          sed -i '' "s|$old_key|$new_key|g" "$ef"
          echo -e "  ${GREEN}已更新${NC}: $(basename $ef)"
        fi
      done
      ;;
    openrouter)
      sed -i '' "s|$old_key|$new_key|g" "$OPENCLAW_DIR/config/openrouter.env"
      echo -e "  ${GREEN}已更新${NC}: openrouter.env"
      # openclaw.json env section
      if grep -q "$old_key" "$OPENCLAW_JSON" 2>/dev/null; then
        sed -i '' "s|$old_key|$new_key|g" "$OPENCLAW_JSON"
      fi
      ;;
  esac

  echo -e "  ${GREEN}完成${NC}"
}

# ── show: 顯示目前所有 key ──
cmd_show() {
  echo -e "\n${CYAN}=== 目前的 API Keys ===${NC}\n"

  for p in google kimi anthropic xai; do
    local key=$(get_current_key "$p")
    if [ -n "$key" ]; then
      echo -e "  ${YELLOW}$p${NC}: $(mask_key "$key")"
    else
      echo -e "  ${YELLOW}$p${NC}: (未設定)"
    fi
  done

  local or_key=$(get_openrouter_key)
  if [ -n "$or_key" ]; then
    echo -e "  ${YELLOW}openrouter${NC}: $(mask_key "$or_key")"
  else
    echo -e "  ${YELLOW}openrouter${NC}: (未設定)"
  fi
  echo ""
}

# ── all: 互動模式 ──
cmd_all() {
  echo -e "\n${CYAN}=== OpenClaw API Key 批次更換 ===${NC}"
  echo -e "（直接按 Enter 跳過不換）\n"

  for p in google kimi anthropic xai openrouter; do
    if [ "$p" = "openrouter" ]; then
      local cur=$(get_openrouter_key)
    else
      local cur=$(get_current_key "$p")
    fi
    echo -e "${YELLOW}[$p]${NC} 目前: $(mask_key "$cur")"
    read -p "  新 Key（Enter 跳過）: " new_key
    if [ -n "$new_key" ]; then
      switch_provider "$p" "$new_key"
    else
      echo "  跳過"
    fi
    echo ""
  done

  echo -e "${GREEN}Gateway 會自動 hot reload，不需要重啟。${NC}"
  echo "測試: openclaw agent -m 'hi' --agent main"
}

# ── 主程式 ──
case "$1" in
  show)
    cmd_show
    ;;
  all)
    cmd_all
    ;;
  google|kimi|anthropic|xai|openrouter)
    if [ -z "$2" ]; then
      echo "用法: $0 $1 <新的API_KEY>"
      exit 1
    fi
    echo -e "\n${CYAN}=== 更換 $1 API Key ===${NC}\n"
    switch_provider "$1" "$2"
    echo -e "\n${GREEN}Gateway 會自動 hot reload。${NC}"
    ;;
  *)
    echo "OpenClaw API Key 管理工具"
    echo ""
    echo "用法:"
    echo "  $0 show                    顯示目前所有 key"
    echo "  $0 all                     互動模式，逐一詢問"
    echo "  $0 google    <KEY>         換 Google Gemini"
    echo "  $0 kimi      <KEY>         換 Kimi/Moonshot"
    echo "  $0 anthropic <KEY>         換 Anthropic Claude"
    echo "  $0 xai       <KEY>         換 xAI Grok"
    echo "  $0 openrouter <KEY>        換 OpenRouter"
    ;;
esac
