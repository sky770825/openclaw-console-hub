#!/bin/bash

# 990 安裝包 - install-990.sh
# 任務：P3 990 安裝包 — 建立 install-990.sh 腳本
# 位置：/Users/caijunchang/Downloads/openclaw-console-hub-main/scripts/install-990.sh

# --------------------------------------------------------
# 功能描述：
# 1. 偵測作業系統 (macOS/Ubuntu)
# 2. 安裝 Node.js (via NVM) 和 PM2
# 3. clone openclaw-console-hub repo
# 4. 設定 .env 環境變數
# 5. 啟動 server
# --------------------------------------------------------

set -e # 任何指令失敗時立即退出

REPO_URL="https://github.com/sky770825/openclaw-console-hub.git"
INSTALL_DIR="/opt/openclaw-990"
NVM_INSTALL_URL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh"
NODE_VERSION="18"

# --- 顏色定義 ---
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 無色

echo -e "${GREEN}🚀 啟動 NEUXA 990 服務安裝程序...${NC}"

# --- 1. 偵測作業系統 ---
echo -e "${YELLOW}⚙️ 偵測作業系統...${NC}"
OS="$(uname -s)"

case "$OS" in
  Linux)
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      if [[ "$ID" == "ubuntu" || "$ID_LIKE" == "ubuntu" ]]; then
        DISTRO="Ubuntu"
      else
        echo -e "${RED}❌ 不支援的 Linux 發行版：$ID${NC}"
        exit 1
      fi
    else
      echo -e "${RED}❌ 不支援的 Linux 系統${NC}"
      exit 1
    fi
    ;; 
  Darwin)
    DISTRO="macOS"
    ;; 
  *) 
    echo -e "${RED}❌ 不支援的作業系統：$OS${NC}"
    exit 1
    ;; 
esac
echo -e "${GREEN}✅ 偵測到作業系統：${DISTRO}${NC}"

# --- 2. 安裝 Node.js (NVM) 和 PM2 ---
echo -e "${YELLOW}📦 安裝 Node.js (NVM) 和 PM2...${NC}"

# 檢查並安裝 NVM
if [ ! -d "$HOME/.nvm" ]; then
  echo -e "${YELLOW} installing nvm...${NC}"
  curl -o- "$NVM_INSTALL_URL" | bash
  # 重新載入 shell 環境
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
else
  echo -e "${GREEN} NVM 已安裝。${NC}"
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
fi

# 安裝指定版本的 Node.js
nvm install $NODE_VERSION
nvm use $NODE_VERSION
nvm alias default $NODE_VERSION
echo -e "${GREEN}✅ Node.js v${NODE_VERSION} 已安裝並設定為預設版本。${NC}"

# 安裝 PM2
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
  pm2 startup systemd -u $(whoami) --hp $HOME || true # 嘗試設定 PM2 開機啟動，非必要，失敗不影響後續
  pm2 save
else
  echo -e "${GREEN} PM2 已安裝。${NC}"
fi
echo -e "${GREEN}✅ PM2 已安裝。${NC}"

# --- 3. clone openclaw-console-hub repo ---
echo -e "${YELLOW}⬇️ 下載 openclaw-console-hub 服務程式碼...${NC}"
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW} 安裝目錄 ${INSTALL_DIR} 已存在，更新程式碼。${NC}"
  cd "$INSTALL_DIR"
  git pull origin main
else
  echo -e "${YELLOW} 安裝目錄 ${INSTALL_DIR} 不存在，clone 程式碼。${NC}"
  sudo mkdir -p "$INSTALL_DIR"
  sudo chown $(whoami):$(whoami) "$INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi
echo -e "${GREEN}✅ 程式碼已下載/更新到 ${INSTALL_DIR}${NC}"

# 安裝依賴
echo -e "${YELLOW}🛠️ 安裝服務依賴項...${NC}"
cd "$INSTALL_DIR"/server
npm install
echo -e "${GREEN}✅ 服務依賴項已安裝。${NC}"

# --- 4. 設定 .env 環境變數 ---
echo -e "${YELLOW}📝 設定 .env 環境變數...${NC}"
ENV_FILE="$INSTALL_DIR"/server/.env
if [ ! -f "$ENV_FILE" ]; then
  cp "$INSTALL_DIR"/server/.env.example "$ENV_FILE"
  echo "請手動編輯 ${ENV_FILE} 設定 API Keys 和其他環境變數。"
  echo "目前將使用 .env.example 作為基礎。"
  # 基本設定
  echo "PORT=3011" >> "$ENV_FILE"
  echo "TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN" >> "$ENV_FILE"
  echo "TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID" >> "$ENV_FILE"
  echo "N8N_WEBHOOK_URL=YOUR_N8N_WEBHOOK_URL" >> "$ENV_FILE"
  echo -e "${YELLOW}創建了基礎 .env 文件，請務必手動編輯！${NC}"
else
  echo -e "${GREEN} .env 文件已存在，跳過創建。${NC}"
fi
echo -e "${GREEN}✅ .env 環境變數已檢查。${NC}"

# --- 5. 啟動 server ---
echo -e "${YELLOW}🚀 啟動 NEUXA 990 服務...${NC}"
cd "$INSTALL_DIR"/server
pm2 start ecosystem.config.cjs --env production || pm2 restart ecosystem.config.cjs --env production
pm2 save
echo -e "${GREEN}✅ NEUXA 990 服務已透過 PM2 啟動/更新。${NC}"

echo -e "${GREEN}✨ 安裝完成！NEUXA 990 服務已在後台運行。${NC}"
echo -e "${GREEN}請檢查 PM2 狀態：pm2 list${NC}"
echo -e "${GREEN}並確認端口 3011 是否在監聽：sudo lsof -i :3011${NC}"
echo -e "${GREEN}首次安裝後，請務必手動編輯 .env 文件。${NC}"
