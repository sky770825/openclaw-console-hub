#!/bin/bash
# Windows OpenClaw 安裝腳本 - 即插即用
# 在 WSL2 中執行

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🪟 Windows OpenClaw 安裝腳本                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================
# 1. 檢查環境
# ============================================
echo "${YELLOW}📋 步驟 1/5: 檢查環境${NC}"

if ! grep -q "microsoft" /proc/version 2>/dev/null; then
    echo "❌ 這不是 WSL 環境"
    echo "請確保你在 Windows WSL2 中執行此腳本"
    exit 1
fi

echo "✅ WSL2 環境確認"

# ============================================
# 2. 安裝相依套件
# ============================================
echo ""
echo "${YELLOW}📦 步驟 2/5: 安裝相依套件${NC}"

sudo apt-get update -qq
sudo apt-get install -y -qq curl git jq nodejs npm sqlite3

# 安裝 Bun
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

echo "✅ 套件安裝完成"

# ============================================
# 3. 安裝 OpenClaw
# ============================================
echo ""
echo "${YELLOW}🔧 步驟 3/5: 安裝 OpenClaw${NC}"

mkdir -p ~/.openclaw
cd ~/.openclaw

# 下載 OpenClaw（使用 bun）
bun init -y
bun add openclaw

echo "✅ OpenClaw 安裝完成"

# ============================================
# 4. 複製設定檔
# ============================================
echo ""
echo "${YELLOW}⚙️  步驟 4/5: 設定 OpenClaw${NC}"

# 建立 workspace
mkdir -p ~/.openclaw/workspace
cd ~/.openclaw/workspace

# 複製 Mac 的設定（老蔡會手動複製過來）
if [[ -d "/mnt/c/openclaw-setup/config" ]]; then
    cp -r /mnt/c/openclaw-setup/config/* ~/.openclaw/workspace/
    echo "✅ 設定檔已複製"
else
    echo "⚠️  未找到設定檔，請手動複製"
    echo "   來源: Mac ~/.openclaw/workspace/"
    echo "   目標: WSL ~/.openclaw/workspace/"
fi

# ============================================
# 5. 安裝 Auto-Skill
# ============================================
echo ""
echo "${YELLOW}🧠 步驟 5/5: 安裝 Auto-Skill 系統${NC}"

# 複製腳本
if [[ -d "/mnt/c/openclaw-setup/scripts" ]]; then
    cp /mnt/c/openclaw-setup/scripts/*.sh ~/.openclaw/workspace/scripts/ 2>/dev/null || true
    chmod +x ~/.openclaw/workspace/scripts/*.sh
fi

# 建立 .auto-skill 結構
mkdir -p ~/.openclaw/workspace/.auto-skill/{experience,knowledge}

echo "✅ Auto-Skill 安裝完成"

# ============================================
# 完成
# ============================================
echo ""
echo "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo "${GREEN}║              ✅ 安裝完成！                                   ║${NC}"
echo "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "下一步:"
echo "  1. 複製 Mac 的 ~/.openclaw/workspace/ 到 WSL"
echo "  2. 設定 Syncthing 同步記憶"
echo "  3. 啟動 OpenClaw"
echo ""
echo "啟動指令:"
echo "  cd ~/.openclaw/workspace && openclaw"
echo ""
