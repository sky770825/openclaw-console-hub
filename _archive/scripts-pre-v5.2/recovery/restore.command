#!/bin/bash
# OpenClaw 系統恢復中心 - 一鍵恢復

cd "$(dirname "$0")"

# 顯示歡迎畫面
clear
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           🏥 OpenClaw 系統恢復中心                           ║"
echo "║           System Recovery Center v1.0                        ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "   備份位置: ~/Desktop/小蔡/系統備份/"
echo ""

# 檢查是否有備份
BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' | head -1)

if [[ -n "$LATEST_BACKUP" ]]; then
    echo "   ✅ 最新備份: $LATEST_BACKUP"
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR/$LATEST_BACKUP" 2>/dev/null | cut -f1)
    echo "   📦 備份大小: $BACKUP_SIZE"
else
    echo "   ⚠️  尚無備份"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "   請選擇操作："
echo ""
echo "      [1] 🔍 查看系統健康狀態"
echo "      [2] 📋 查看所有備份列表"
echo "      [3] ⏪ 一鍵恢復到最新備份 ⚡"
echo "      [4] 📅 選擇特定日期恢復"
echo "      [5] 🏷️  恢復到基線版本"
echo "      [6] ⚙️  僅恢復設定檔 (config)"
echo "      [7] 🔄 重啟 OpenClaw"
echo ""
echo "      [0] ❌ 離開"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

read -p "   請輸入選項 (0-7): " choice
echo ""

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"

# 顏色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

case "$choice" in
    1)
        echo "🔍 執行健康檢查..."
        echo ""
        # openclaw.json 檢查
        if [[ -f "$OPENCLAW_HOME/openclaw.json" ]]; then
            if jq . "$OPENCLAW_HOME/openclaw.json" >/dev/null 2>&1; then
                echo "   ✅ openclaw.json - 正常"
            else
                echo "   ❌ openclaw.json - JSON 語法錯誤"
            fi
        else
            echo "   ❌ openCLAW.json - 不存在"
        fi
        
        # config 檢查
        if [[ -d "$OPENCLAW_HOME/config" ]]; then
            CONFIG_COUNT=$(find "$OPENCLAW_HOME/config" -type f 2>/dev/null | wc -l)
            echo "   ✅ config/ - 正常 ($CONFIG_COUNT 個檔案)"
        else
            echo "   ⚠️  config/ - 不存在"
        fi
        
        # Node.js
        if command -v node &>/dev/null; then
            NODE_VER=$(node --version)
            echo "   ✅ Node.js - $NODE_VER"
        else
            echo "   ❌ Node.js - 未安裝"
        fi
        
        echo ""
        echo "健康檢查完成！"
        ;;
        
    2)
        echo "📋 備份列表："
        echo ""
        i=1
        for d in "$BACKUP_DIR"/*/; do
            [[ -d "$d" ]] || continue
            NAME=$(basename "$d")
            SIZE=$(du -sh "$d" 2>/dev/null | cut -f1)
            echo "   $i) $NAME ($SIZE)"
            i=$((i + 1))
        done
        ;;
        
    3)
        if [[ -z "$LATEST_BACKUP" ]]; then
            echo "❌ 沒有可用的備份！"
        else
            echo "⚡ 準備恢復到: $LATEST_BACKUP"
            echo ""
            read -p "   確認要恢復嗎？這會覆蓋現有設定 (yes/no): " confirm
            
            if [[ "$confirm" == "yes" ]]; then
                echo ""
                echo "⏳ 正在恢復..."
                
                # 解壓備份
                TEMP_DIR=$(mktemp -d)
                tar xzf "$BACKUP_DIR/$LATEST_BACKUP/backup.tar.gz" -C "$TEMP_DIR" 2>/dev/null
                
                # 恢復檔案
                [[ -d "$TEMP_DIR/config" ]] && cp -r "$TEMP_DIR/config"/* "$OPENCLAW_HOME/config/" 2>/dev/null && echo "   ✅ config 已恢復"
                [[ -f "$TEMP_DIR/openclaw.json" ]] && cp "$TEMP_DIR/openclaw.json" "$OPENCLAW_HOME/" 2>/dev/null && echo "   ✅ openclaw.json 已恢復"
                [[ -d "$TEMP_DIR/memory" ]] && cp -r "$TEMP_DIR/memory"/* "$OPENCLAW_HOME/memory/" 2>/dev/null && echo "   ✅ memory 已恢復"
                [[ -d "$TEMP_DIR/scripts" ]] && cp -r "$TEMP_DIR/scripts"/* "$WORKSPACE/scripts/" 2>/dev/null && echo "   ✅ scripts 已恢復"
                
                rm -rf "$TEMP_DIR"
                
                echo ""
                echo -e "${GREEN}✅ 恢復完成！${NC}"
                echo ""
                read -p "   是否重啟 OpenClaw? (y/N): " restart
                if [[ "$restart" == "y" || "$restart" == "Y" ]]; then
                    echo ""
                    echo "🔄 正在重啟 OpenClaw..."
                    openclaw gateway restart 2>/dev/null || echo "   請手動執行: openclaw gateway restart"
                fi
            else
                echo "   已取消"
            fi
        fi
        ;;
        
    4)
        echo "📅 可用備份："
        echo ""
        i=1
        declare -a BACKUPS
        for d in "$BACKUP_DIR"/*/; do
            [[ -d "$d" ]] || continue
            NAME=$(basename "$d")
            BACKUPS[$i]="$NAME"
            echo "   [$i] $NAME"
            i=$((i + 1))
        done
        
        echo ""
        read -p "   請輸入編號: " num
        
        if [[ -n "${BACKUPS[$num]}" ]]; then
            SELECTED="${BACKUPS[$num]}"
            echo ""
            echo "選擇了: $SELECTED"
            read -p "   確認恢復? (yes/no): " confirm
            
            if [[ "$confirm" == "yes" ]]; then
                echo "⏳ 正在恢復 $SELECTED..."
                TEMP_DIR=$(mktemp -d)
                tar xzf "$BACKUP_DIR/$SELECTED/backup.tar.gz" -C "$TEMP_DIR" 2>/dev/null
                [[ -d "$TEMP_DIR/config" ]] && cp -r "$TEMP_DIR/config"/* "$OPENCLAW_HOME/config/" 2>/dev/null
                [[ -f "$TEMP_DIR/openclaw.json" ]] && cp "$TEMP_DIR/openclaw.json" "$OPENCLAW_HOME/" 2>/dev/null
                [[ -d "$TEMP_DIR/memory" ]] && cp -r "$TEMP_DIR/memory"/* "$OPENCLAW_HOME/memory/" 2>/dev/null
                rm -rf "$TEMP_DIR"
                echo -e "${GREEN}✅ 恢復完成！${NC}"
            fi
        else
            echo "❌ 無效的選擇"
        fi
        ;;
        
    5)
        echo "🏷️ 可用基線："
        for d in "$BACKUP_DIR"/基線-*/; do
            [[ -d "$d" ]] || continue
            echo "   • $(basename "$d" | sed 's/基線-//')"
        done
        echo ""
        read -p "   輸入基線名稱 (或按 Enter 取消): " baseline
        if [[ -n "$baseline" && -d "$BACKUP_DIR/基線-$baseline" ]]; then
            echo "⏳ 恢復基線: $baseline..."
            TEMP_DIR=$(mktemp -d)
            tar xzf "$BACKUP_DIR/基線-$baseline/backup.tar.gz" -C "$TEMP_DIR" 2>/dev/null
            [[ -d "$TEMP_DIR/config" ]] && cp -r "$TEMP_DIR/config"/* "$OPENCLAW_HOME/config/" 2>/dev/null
            [[ -f "$TEMP_DIR/openclaw.json" ]] && cp "$TEMP_DIR/openclaw.json" "$OPENCLAW_HOME/" 2>/dev/null
            rm -rf "$TEMP_DIR"
            echo -e "${GREEN}✅ 基線恢復完成！${NC}"
        else
            echo "   取消或找不到基線"
        fi
        ;;
        
    6)
        echo "⚙️ 僅恢復 config..."
        if [[ -f "$BACKUP_DIR/$LATEST_BACKUP/backup.tar.gz" ]]; then
            TEMP_DIR=$(mktemp -d)
            tar xzf "$BACKUP_DIR/$LATEST_BACKUP/backup.tar.gz" -C "$TEMP_DIR" 2>/dev/null
            [[ -d "$TEMP_DIR/config" ]] && cp -r "$TEMP_DIR/config"/* "$OPENCLAW_HOME/config/" 2>/dev/null && echo "   ✅ config 已恢復"
            rm -rf "$TEMP_DIR"
        fi
        ;;
        
    7)
        echo "🔄 重啟 OpenClaw..."
        openclaw gateway restart 2>/dev/null || echo "   重啟指令已發送"
        ;;
        
    0)
        echo "👋 再見！"
        exit 0
        ;;
        
    *)
        echo "❌ 無效的選項"
        ;;
esac

echo ""
read -p "   按 Enter 結束..."
