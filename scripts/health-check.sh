#!/bin/bash

# health-check.sh
# 每日自動化健康巡檢腳本
# Created by 小蔡 on 2026-03-01

echo "🚀 小蔡健康巡檢啟動..."
echo "--------------------------"

# Function to check a URL and print status
check_service() {
    local service_name=$1
    local url=$2
    
    if curl --head --silent --fail --max-time 5 "$url" > /dev/null; then
        echo "✅ $service_name: 線上 (URL: $url)"
    else
        echo "❌ $service_name: 離線或錯誤 (URL: $url)"
    fi
}

# 1. OpenClaw Server
check_service "OpenClaw Server" "http://localhost:3011/api/health"

# 2. n8n (本地)
check_service "n8n (本地)" "http://localhost:5678"

# 3. Google AI（雲端 — 不需本地檢查）

# 4. Supabase (需透過 action 檢查)
echo "🟡 Supabase: 狀態將在下一步透過內部 action 檢查"

echo "--------------------------"
echo "✅ 巡檢完畢。"
