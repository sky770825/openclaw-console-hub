#!/bin/bash
#
# OpenClaw 快速移機安裝腳本
# 使用方法: bash install-openclaw-migration.sh [備份檔案路徑]
#

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 記錄檔
LOG_FILE="$HOME/openclaw-install-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  OpenClaw 快速移機安裝腳本 🐣${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 步驟 1: 檢查系統
echo -e "${YELLOW}[1/7] 檢查系統需求...${NC}"

# 檢查 macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}⚠️  目前僅支援 macOS${NC}"
    exit 1
fi

echo "✓ macOS 檢查通過"

# 檢查 Homebrew
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}⚠️  未檢測到 Homebrew，建議先安裝:${NC}"
    echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    read -p "是否繼續? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ Homebrew 已安裝"
fi

# 步驟 2: 安裝 Node.js
echo ""
echo -e "${YELLOW}[2/7] 檢查 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "正在安裝 Node.js..."
    brew install node
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${YELLOW}⚠️  Node.js 版本過低，正在更新...${NC}"
        brew upgrade node
    else
        echo "✓ Node.js $(node -v) 已安裝"
    fi
fi

# 步驟 3: 安裝 OpenClaw CLI
echo ""
echo -e "${YELLOW}[3/7] 安裝 OpenClaw CLI...${NC}"
if command -v openclaw &> /dev/null; then
    echo "✓ OpenClaw 已安裝 ($(openclaw --version 2>/dev/null || echo 'version unknown'))"
else
    echo "正在安裝 OpenClaw..."
    npm install -g openclaw
    echo "✓ OpenClaw 安裝完成"
fi

# 步驟 4: 處理備份檔案
echo ""
echo -e "${YELLOW}[4/7] 處理備份檔案...${NC}"

BACKUP_FILE=""

# 檢查命令列參數
if [ $# -eq 1 ] && [ -f "$1" ]; then
    BACKUP_FILE="$1"
    echo "✓ 使用指定備份: $BACKUP_FILE"
else
    # 搜尋常見位置
    echo "正在搜尋備份檔案..."
    
    # 可能的備份位置
    POSSIBLE_BACKUPS=(
        "$HOME/Downloads/core-backup-*.tar.gz"
        "$HOME/Desktop/core-backup-*.tar.gz"
        "$HOME/.openclaw/backups/full/core-backup-*.tar.gz"
        "$PWD/core-backup-*.tar.gz"
    )
    
    FOUND_BACKUPS=()
    for pattern in "${POSSIBLE_BACKUPS[@]}"; do
        for file in $pattern; do
            [ -f "$file" ] && FOUND_BACKUPS+=("$file")
        done
    done
    
    if [ ${#FOUND_BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}❌ 未找到備份檔案${NC}"
        echo ""
        echo "請將 core-backup-*.tar.gz 放到以下位置之一:"
        echo "  - 下載資料夾 (~/Downloads/)"
        echo "  - 桌面 (~/Desktop/)"
        echo "  - 當前目錄 ($PWD)"
        echo ""
        echo "或手動指定路徑:"
        echo "  bash install-openclaw-migration.sh /path/to/backup.tar.gz"
        exit 1
    elif [ ${#FOUND_BACKUPS[@]} -eq 1 ]; then
        BACKUP_FILE="${FOUND_BACKUPS[0]}"
        echo "✓ 找到備份: $BACKUP_FILE"
    else
        echo "找到多個備份檔案:"
        for i in "${!FOUND_BACKUPS[@]}"; do
            echo "  [$((i+1))] ${FOUND_BACKUPS[$i]}"
        done
        echo ""
        read -p "請選擇要還原的備份 (1-${#FOUND_BACKUPS[@]}): " choice
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#FOUND_BACKUPS[@]} ]; then
            BACKUP_FILE="${FOUND_BACKUPS[$((choice-1))]}"
        else
            echo -e "${RED}❌ 無效選擇${NC}"
            exit 1
        fi
    fi
fi

# 驗證備份檔案
if ! tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
    echo -e "${RED}❌ 備份檔案損壞或無效${NC}"
    exit 1
fi
echo "✓ 備份檔案驗證通過"

# 步驟 5: 解壓備份
echo ""
echo -e "${YELLOW}[5/7] 解壓備份檔案...${NC}"

# 備份現有資料（如果存在）
if [ -d "$HOME/.openclaw" ]; then
    BACKUP_EXISTING="$HOME/.openclaw-backup-$(date +%Y%m%d-%H%M%S)"
    echo "檢測到現有 OpenClaw 資料，備份到: $BACKUP_EXISTING"
    mv "$HOME/.openclaw" "$BACKUP_EXISTING"
fi

# 創建目錄並解壓
mkdir -p "$HOME/.openclaw"
echo "正在解壓 $BACKUP_FILE..."
tar -xzf "$BACKUP_FILE" -C "$HOME/.openclaw" --strip-components=1 2>/dev/null || tar -xzf "$BACKUP_FILE" -C "$HOME/.openclaw"
echo "✓ 備份解壓完成"

# 步驟 6: 安裝 Ollama（可選）
echo ""
echo -e "${YELLOW}[6/7] 檢查 Ollama...${NC}"
if command -v ollama &> /dev/null; then
    echo "✓ Ollama 已安裝 ($(ollama --version))"
else
    read -p "是否安裝 Ollama (本機 AI 模型)? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在安裝 Ollama..."
        brew install ollama
        echo "✓ Ollama 安裝完成"
        echo ""
        echo "建議下載常用模型:"
        echo "  ollama pull qwen3:8b"
        echo "  ollama pull llama3.2"
    else
        echo "跳過 Ollama 安裝"
    fi
fi

# 步驟 7: 安裝技能依賴
echo ""
echo -e "${YELLOW}[7/7] 安裝技能依賴...${NC}"

SKILL_COUNT=0
if [ -d "$HOME/.openclaw/workspace/skills" ]; then
    for skill_dir in "$HOME/.openclaw/workspace/skills"/*/; do
        if [ -f "$skill_dir/package.json" ]; then
            skill_name=$(basename "$skill_dir")
            echo "安裝 $skill_name 依賴..."
            (cd "$skill_dir" && npm install --silent 2>/dev/null) && ((SKILL_COUNT++)) || true
        fi
    done
fi

echo "✓ 已安裝 $SKILL_COUNT 個技能的依賴"

# 驗證安裝
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  安裝完成！🎉${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "驗證項目:"

# 檢查 openclaw
if command -v openclaw &> /dev/null; then
    echo "  ✅ OpenClaw CLI: $(which openclaw)"
else
    echo "  ❌ OpenClaw CLI: 未找到"
fi

# 檢查 workspace
if [ -d "$HOME/.openclaw/workspace" ]; then
    echo "  ✅ Workspace: $HOME/.openclaw/workspace"
else
    echo "  ❌ Workspace: 未找到"
fi

# 檢查 memory
if [ -d "$HOME/.openclaw/memory" ]; then
    echo "  ✅ Memory: $HOME/.openclaw/memory"
else
    echo "  ❌ Memory: 未找到"
fi

# 檢查 agents
if [ -d "$HOME/.openclaw/agents" ]; then
    echo "  ✅ Agents: $HOME/.openclaw/agents"
else
    echo "  ❌ Agents: 未找到"
fi

# 檢查 config
if [ -d "$HOME/.openclaw/config" ]; then
    echo "  ✅ Config: $HOME/.openclaw/config"
else
    echo "  ❌ Config: 未找到"
fi

echo ""
echo "下一步:"
echo "  1. 檢查 API Keys: cat ~/.openclaw/.env"
echo "  2. 啟動 Gateway: openclaw gateway start"
echo "  3. 檢查狀態: openclaw status"
echo ""
echo "完整日誌: $LOG_FILE"
echo ""

# 提示啟動
read -p "是否現在啟動 Gateway? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "正在啟動 OpenClaw Gateway..."
    openclaw gateway start
fi
