#!/bin/bash
# 指揮官小蔡建立的會員系統快速啟動腳本

TARGET_DIR="/Users/caijunchang/Desktop/小蔡資料夾/會員資料夾/basic-auth-system"

cd "$TARGET_DIR"

# 檢查伺服器是否已在運行，避免重複啟動
if pgrep -f "node index.js" > /dev/null
then
    echo "伺服器已經在跑了，不用重開。"
    exit 0
fi

# 在背景啟動伺服器，並將日誌寫入同目錄的 server.log
nohup node index.js > "$TARGET_DIR/server.log" 2>&1 &

echo "會員系統伺服器已在背景啟動。"
