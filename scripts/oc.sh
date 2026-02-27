#!/usr/bin/env bash
# OpenClaw 智能 CLI (oc) v1.0
# 整合核心智能功能：任務拆解、智能召回、資源調度、任務管理

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 定義顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

TASK_BOARD="$SCRIPT_DIR/task-board-api.sh"
SPLITTER="$SCRIPT_DIR/task-splitter.sh"
RECALL="$SCRIPT_DIR/smart-recall.py"
SCHEDULER="$SCRIPT_DIR/intelligent-scheduler.sh"

usage() {
    echo "使用方法: oc <command> [args]"
    echo ""
    echo "核心指令:"
    echo "  plan <desc>       智能任務拆解"
    echo "  recall <query>    智能記憶召回"
    echo "  check             系統狀態檢查"
    echo "  list              列出所有任務"
    echo "  add <name> <desc> 手動新增任務"
    echo "  run <id>          啟動任務"
    echo "  done <run_id>     標記任務完成"
    echo "  dev [dir]         智能識別並推薦啟動腳本"
    echo "  security auto-fix <CVE_ID> <file_path>  自動修復安全漏洞"
    echo "  notion <subcmd>   Notion 整合功能"
    echo "    - link <title> <url> <category>"
    echo "    - search <keyword>"
    echo "    - event <title> <date> <type> <summary>"
    echo "    - insight <title> <content> <format>"
    echo ""
}

# 檢查是否需要自然語言處理
# 如果輸入的第一個參數不是預定義的子指令，則交給 NLI 處理
is_raw_cmd() {
    case "$1" in
        plan|recall|check|ls|list|add|run|done|status|dev|notion|help|--help|-h) return 0 ;;
        *) return 1 ;;
    esac
}

cmd="${1:-}"
[ -z "$cmd" ] && usage && exit 0

if ! is_raw_cmd "$cmd"; then
    # 呼叫自然語言解析腳本
    if python3 "$SCRIPT_DIR/oc-nli.py" "$@"; then
        exit 0
    else
        # 如果 NLI 返回非 0 (通常是 2)，則繼續原本的 logic
        RET=$?
        if [ $RET -ne 2 ]; then exit $RET; fi
    fi
fi

shift

case "$cmd" in
    plan)
        desc="${1:-}"
        [ -z "$desc" ] && echo -e "${RED}錯誤: 需要提供任務描述${NC}" && exit 1
        echo -e "${GREEN}正在進行智能任務拆解...${NC}"
        "$SPLITTER" "$desc"
        echo ""
        echo -e "${YELLOW}提示: 您可以使用 'oc add' 將建議的子任務加入任務板。${NC}"
        ;;

    recall)
        query="${1:-}"
        [ -z "$query" ] && echo -e "${RED}錯誤: 需要提供查詢詞${NC}" && exit 1
        python3 "$RECALL" "$query"
        ;;

    check)
        "$SCRIPT_DIR/oc-detect.sh"
        ;;

    ls|list)
        "$TASK_BOARD" list-tasks | jq -r '.[] | "[\(.id)] \(.status) \t \(.name) (\(.assignee))"'
        ;;

    add)
        name="${1:-}"
        desc="${2:-}"
        [ -z "$name" ] && echo -e "${RED}錯誤: 需要提供任務名稱${NC}" && exit 1
        "$TASK_BOARD" add-task "$name" "$desc" | jq -r '"✅ 已新增任務 [\(.id)]: \(.name)"'
        ;;

    run)
        id="${1:-}"
        [ -z "$id" ] && echo -e "${RED}錯誤: 需要提供任務 ID${NC}" && exit 1
        
        # 1. 資源檢查與調度
        echo -e "${GREEN}執行環境檢查...${NC}"
        "$SCHEDULER" monitor
        
        # 2. 獲取任務資訊以決定引擎 (簡單規則示範)
        task_info=$("$TASK_BOARD" get-task "$id")
        task_name=$(echo "$task_info" | jq -r '.name')
        
        # 決定引擎 (預設使用 qwen3:8b)
        engine="ollama:qwen3:8b"
        if [[ "$task_name" =~ "思考"|"推理"|"debug" ]]; then engine="ollama:deepseek-r1:8b"; fi
        
        echo -e "${GREEN}智能調度中... 預計使用 $engine${NC}"
        "$SCHEDULER" dispatch "$task_name" 3 "$engine"
        
        # 3. 更新任務板狀態
        "$TASK_BOARD" run-task "$id" | jq -r '"🚀 任務啟動成功 (RunID: \(.runId))"'
        ;;

    done)
        run_id="${1:-}"
        [ -z "$run_id" ] && echo -e "${RED}錯誤: 需要提供 Run ID${NC}" && exit 1
        "$TASK_BOARD" complete-run "$run_id" | jq -r '"✅ 任務 RunID [\(.id)] 已標記完成"'
        ;;

    status)
        "$TASK_BOARD" status | jq -r '"任務統計: 總計 \(.tasks) 個任務, \(.running) 個執行中"'
        ;;

    dev)
        project_dir="${1:-.}"
        "$SCRIPT_DIR/find-start-script.sh" "$project_dir"
        ;;

    security)
        subcmd="${1:-}"
        case "$subcmd" in
            auto-fix)
                shift
                cve_id="${1:-}"
                file_path="${2:-}"
                [ -z "$cve_id" ] || [ -z "$file_path" ] && echo -e "${RED}用法: oc security auto-fix <CVE_ID> <file_path>${NC}" && exit 1
                python3 "$SCRIPT_DIR/../core/auto-security/main.py" "$file_path" "$cve_id"
                ;;
            *)
                echo -e "${RED}未知 Security 子指令: $subcmd${NC}"
                exit 1
                ;;
        esac
        ;;

    notion)
        subcmd="${1:-}"
        case "$subcmd" in
            link|add-link)
                shift
                "$SCRIPT_DIR/notion-sync.sh" link "$@"
                ;;
            search|find)
                shift
                "$SCRIPT_DIR/notion-sync.sh" search "$@"
                ;;
            event|schedule)
                shift
                "$SCRIPT_DIR/notion-sync.sh" event "$@"
                ;;
            insight|post)
                shift
                "$SCRIPT_DIR/notion-sync.sh" insight "$@"
                ;;
            *)
                echo -e "${RED}未知 Notion 子指令: $subcmd${NC}"
                echo "用法: oc notion [link|search|event|insight] [args]"
                exit 1
                ;;
        esac
        ;;

    help|--help|-h)
        usage
        ;;

    *)
        echo -e "${RED}未知指令: $cmd${NC}"
        usage
        exit 1
        ;;
esac
