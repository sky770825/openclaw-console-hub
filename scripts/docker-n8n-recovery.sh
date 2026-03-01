#!/bin/bash
# Docker 啟動監控與 n8n 自動恢復腳本
# 授權執行時間: 2026-02-19

LOG_FILE="/Users/caijunchang/.openclaw/logs/docker-n8n-recovery.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date)] Docker/n8n 自動恢復腳本啟動" >> "$LOG_FILE"

# 等待 Docker 準備好
echo "[$(date)] 等待 Docker Desktop 完全啟動..." >> "$LOG_FILE"
for i in $(seq 1 30); do
    if docker ps &>/dev/null; then
        echo "[$(date)] ✅ Docker 已就緒" >> "$LOG_FILE"
        break
    fi
    echo "[$(date)] ⏳ 等待 Docker... ($i/30)" >> "$LOG_FILE"
    sleep 10
done

# 檢查 Docker 是否成功
if ! docker ps &>/dev/null; then
    echo "[$(date)] ❌ Docker 啟動超時，請手動檢查 Docker Desktop" >> "$LOG_FILE"
    exit 1
fi

# 檢查 n8n 容器
echo "[$(date)] 檢查 n8n 容器狀態..." >> "$LOG_FILE"
N8N_CONTAINERS=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -c "n8n-production-" || echo "0")

if [ "$N8N_CONTAINERS" -ge 4 ]; then
    echo "[$(date)] ✅ n8n 容器已運行 ($N8N_CONTAINERS 個)" >> "$LOG_FILE"
else
    echo "[$(date)] 🔄 啟動 n8n 容器..." >> "$LOG_FILE"
    cd /Users/caijunchang/n8n-production || exit 1
    docker compose up -d 2>&1 >> "$LOG_FILE"
    sleep 5
    N8N_CONTAINERS=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -c "n8n-production-" || echo "0")
    echo "[$(date)] ✅ n8n 啟動完成 ($N8N_CONTAINERS 個容器)" >> "$LOG_FILE"
fi

echo "[$(date)] 🎉 Docker/n8n 恢復完成" >> "$LOG_FILE"
