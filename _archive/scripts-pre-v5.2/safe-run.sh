#!/bin/bash
# OpenClaw 自動檢查點包裝器
# 用途：在執行命令前自動建立檢查點，失敗時可回滾

set -eo pipefail

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
CHECKPOINT_SCRIPT="$OPENCLAW_HOME/workspace/scripts/checkpoint.sh"

# 顏色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 顯示說明
show_help() {
    cat <<EOF
自動檢查點包裝器 - 安全執行任務

用法:
  $0 [選項] <命令>

選項:
  -t, --task <名稱>     任務名稱（預設: 自動任務）
  -s, --step <名稱>     步驟名稱（預設: 執行前）
  -n, --no-checkpoint   不建立檢查點
  -r, --rollback        失敗時自動回滾
  -h, --help            顯示說明

範例:
  $0 -t "資料遷移" ./scripts/migrate-data.sh
  $0 -t "系統更新" -s "更新前" -- openclaw update
  $0 -r -- ./scripts/risky-operation.sh

說明:
  這個工具會在執行命令前自動建立檢查點。
  如果命令失敗，可以選擇自動回滾到執行前的狀態。

EOF
}

# 預設值
TASK_NAME="自動任務"
STEP_NAME="執行前"
USE_CHECKPOINT=true
AUTO_ROLLBACK=false
COMMAND=""

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--task)
            TASK_NAME="$2"
            shift 2
            ;;
        -s|--step)
            STEP_NAME="$2"
            shift 2
            ;;
        -n|--no-checkpoint)
            USE_CHECKPOINT=false
            shift
            ;;
        -r|--rollback)
            AUTO_ROLLBACK=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        --)
            shift
            COMMAND="$@"
            break
            ;;
        *)
            COMMAND="$@"
            break
            ;;
    esac
done

# 檢查命令
if [[ -z "$COMMAND" ]]; then
    echo -e "${RED}[ERROR]${NC} 請指定要執行的命令"
    show_help
    exit 1
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}              🔒 自動檢查點保護執行                            ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  任務: $TASK_NAME"
echo "  步驟: $STEP_NAME"
echo "  命令: $COMMAND"
echo ""

# 步驟 1：建立檢查點
if [[ "$USE_CHECKPOINT" == true ]]; then
    echo -e "${BLUE}[STEP 1/3]${NC} 建立檢查點..."
    AUTO_CHECKPOINT=true "$CHECKPOINT_SCRIPT" create "$TASK_NAME" "$STEP_NAME"
    CHECKPOINT_ID=$(cat "$HOME/Desktop/達爾/檢查點/.current" 2>/dev/null)
    echo -e "  ${GREEN}✓${NC} 檢查點: $CHECKPOINT_ID"
    echo ""
else
    echo -e "${YELLOW}[SKIP]${NC} 跳過檢查點建立"
    echo ""
fi

# 步驟 2：執行命令
echo -e "${BLUE}[STEP 2/3]${NC} 執行命令..."
echo "───────────────────────────────────────────────────────────────"
echo ""

# 記錄開始時間
START_TIME=$(date +%s)

# 執行命令並捕獲結果
set +e
$COMMAND
EXIT_CODE=$?
set -e

# 計算執行時間
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "───────────────────────────────────────────────────────────────"
echo ""

# 步驟 3：處理結果
if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}[STEP 3/3]${NC} ✅ 執行成功!"
    echo "  耗時: ${ELAPSED}秒"
    echo ""
    
    # 成功的話，詢問是否保留檢查點
    if [[ "$USE_CHECKPOINT" == true ]]; then
        echo -n "保留此檢查點? (Y/n): "
        read -r keep
        if [[ "$keep" == "n" || "$keep" == "N" ]]; then
            echo "  檢查點將在下次清理時移除"
        fi
    fi
else
    echo -e "${RED}[STEP 3/3]${NC} ❌ 執行失敗!"
    echo "  退出碼: $EXIT_CODE"
    echo "  耗時: ${ELAPSED}秒"
    echo ""
    
    # 失敗處理
    if [[ "$AUTO_ROLLBACK" == true && "$USE_CHECKPOINT" == true ]]; then
        echo -e "${YELLOW}自動回滾已啟用，準備回滾...${NC}"
        "$CHECKPOINT_SCRIPT" rollback "$CHECKPOINT_ID"
    elif [[ "$USE_CHECKPOINT" == true ]]; then
        echo -e "${YELLOW}是否要回滾到檢查點?${NC}"
        echo "  檢查點: $CHECKPOINT_ID"
        echo ""
        echo -n "回滾? (yes/no): "
        read -r rollback
        if [[ "$rollback" == "yes" ]]; then
            "$CHECKPOINT_SCRIPT" rollback "$CHECKPOINT_ID"
        fi
    fi
fi

echo ""
exit $EXIT_CODE
