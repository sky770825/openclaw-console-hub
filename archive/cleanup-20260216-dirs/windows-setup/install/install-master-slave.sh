#!/bin/bash
# 安裝主從模式控制器

echo "🎯 安裝 OpenClaw 主從模式"
echo "═══════════════════════════════════════"
echo ""

# 複製腳本
sudo cp /mnt/c/openclaw-setup/scripts/openclaw-master-slave.sh /usr/local/bin/openclaw-slave
sudo chmod +x /usr/local/bin/openclaw-slave

echo "✅ 已安裝 openclaw-slave 指令"
echo ""

# 詢問 Mac IP
echo "請輸入 Mac（主節點）的 IP 位址："
echo "（可以在 Mac 的 系統偏好設定 → 網路 查看）"
read -r master_ip

# 設定環境變數
echo "export MASTER_IP=$master_ip" >> ~/.bashrc
echo "export MASTER_IP=$master_ip" >> ~/.zshrc

echo ""
echo "✅ 主從模式設定完成！"
echo ""
echo "═══════════════════════════════════════"
echo "使用方式："
echo ""
echo "  openclaw-slave          # 啟動主從控制器"
echo "  openclaw-slave status   # 查看狀態"
echo "  openclaw-slave force-start  # 強制啟動（忽略主節點）"
echo ""
echo "═══════════════════════════════════════"
