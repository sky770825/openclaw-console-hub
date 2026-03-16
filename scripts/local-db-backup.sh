#!/bin/bash
# scripts/local-db-backup.sh
# 升級備份 2.0 - 全系統配置、向量資料庫快照與 Session 歷史備份
# 整合了日誌旋轉呼叫

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PARENT_DIR="/Users/sky770825/.openclaw/backups"
BACKUP_DIR="$BACKUP_PARENT_DIR/$TIMESTAMP"
WORKSPACE_DIR="/Users/sky770825/.openclaw/workspace"
BASE_DIR="/Users/sky770825/.openclaw"

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

echo "💾 開始執行 OpenClaw 備份 2.0 - $TIMESTAMP"

# 容錯複製函式
safe_copy() {
    local src=$1
    local dest=$2
    local label=$3
    if [ -e "$src" ]; then
        if [ -d "$src" ]; then
            mkdir -p "$dest"
            cp -R "$src/." "$dest/"
        else
            cp "$src" "$dest"
        fi
        echo "✅ $label 備份完成"
    else
        echo "⚠️ $label 路徑不存在: $src (跳過)"
    fi
}

# 先執行日誌旋轉與壓縮，確保備份的是處理過的日誌
if [ -f "$WORKSPACE_DIR/scripts/log-rotate.sh" ]; then
    bash "$WORKSPACE_DIR/scripts/log-rotate.sh"
fi

# 1. 備份任務 JSON 資料 (Tasks)
safe_copy "$BASE_DIR/tasks" "$BACKUP_DIR/tasks_root" "Root Tasks"
safe_copy "$WORKSPACE_DIR/worktrees/tasks" "$BACKUP_DIR/tasks_worktree" "Worktree Tasks"

# 2. 備份 Session 歷史記錄與對話 Log
safe_copy "$BASE_DIR/subagents" "$BACKUP_DIR/subagents" "Subagent Sessions"
safe_copy "$BASE_DIR/logs" "$BACKUP_DIR/logs" "對話 Logs"

# 3. 備份向量資料庫 (Qdrant & Local Index)
safe_copy "$BASE_DIR/qdrant" "$BACKUP_DIR/qdrant" "Qdrant 資料庫"
safe_copy "$WORKSPACE_DIR/memory" "$BACKUP_DIR/memory_index" "本地向量索引"

# 4. 備份核心設定檔與全系統配置
safe_copy "$WORKSPACE_DIR/AGENTS.md" "$BACKUP_DIR/AGENTS.md" "AGENTS.md"
safe_copy "$WORKSPACE_DIR/MEMORY.md" "$BACKUP_DIR/MEMORY.md" "MEMORY.md"
safe_copy "$BASE_DIR/.env" "$BACKUP_DIR/.env" "系統 .env"
safe_copy "$BASE_DIR/openclaw.json" "$BACKUP_DIR/openclaw.json" "openclaw.json"
safe_copy "$BASE_DIR/config.json" "$BACKUP_DIR/config.json" "config.json"

# 5. 備份自定義腳本與 SOP
safe_copy "$WORKSPACE_DIR/scripts" "$BACKUP_DIR/scripts" "自定義腳本"
safe_copy "$WORKSPACE_DIR/sop-知識庫" "$BACKUP_DIR/sop-knowledge" "SOP 知識庫"

# 6. 清理舊備份 (保留最近 14 天)
echo "🧹 清理 14 天前的舊備份..."
find "$BACKUP_PARENT_DIR" -maxdepth 1 -type d -mtime +14 -name "20*" -exec rm -rf {} \; 2>/dev/null

echo "📦 備份存儲於: $BACKUP_DIR"
echo "-----------------------------------"
