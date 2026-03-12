#!/bin/bash
#
# Git Commit Helper
# 自動分析 git diff 並生成 Conventional Commits 格式的提交訊息
#
# 使用方法:
#   chmod +x git-commit-helper.sh
#   ./git-commit-helper.sh
#

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 輔助函數
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          🚀 Git Commit Helper - 提交訊息助手              ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 檢查是否在 git repo 中
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "目前目錄不是 Git 儲存庫"
        exit 1
    fi
}

# 檢查是否有變更
check_changes() {
    if ! git diff --cached --quiet; then
        return 0  # 有 staged changes
    elif ! git diff --quiet; then
        return 1  # 只有 unstaged changes
    else
        return 2  # 完全沒有變更
    fi
}

# 分析 diff 內容
analyze_diff() {
    local diff_output=$(git diff --cached 2>/dev/null || git diff)
    
    # 初始化計數器
    local files_changed=0
    local insertions=0
    local deletions=0
    local file_types=""
    
    # 統計檔案變更
    files_changed=$(echo "$diff_output" | grep -c "^diff --git" || true)
    insertions=$(echo "$diff_output" | grep -c "^+" || true)
    deletions=$(echo "$diff_output" | grep -c "^-" || true)
    
    # 減去 diff 標頭的行數
    insertions=$((insertions - files_changed))
    deletions=$((deletions - files_changed))
    
    # 識別檔案類型
    file_types=$(echo "$diff_output" | grep "^diff --git" | sed 's/.* b\///' | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -5 | awk '{print $2}' | tr '\n' ', ' | sed 's/, $//')
    
    echo "$files_changed|$insertions|$deletions|$file_types"
}

# 根據 diff 推薦提交類型
suggest_type() {
    local diff_output=$(git diff --cached 2>/dev/null || git diff)
    local staged_files=$(git diff --cached --name-only 2>/dev/null || git diff --name-only)
    
    # 檢查關鍵字來判斷類型
    if echo "$staged_files" | grep -qE "(test|spec)\.(js|ts|jsx|tsx|py|go|java)$"; then
        echo "test"
    elif echo "$diff_output" | grep -q "^new file"; then
        echo "feat"
    elif echo "$staged_files" | grep -qE "(README|CHANGELOG|LICENSE|\.md)$"; then
        echo "docs"
    elif echo "$diff_output" | grep -qE "(fix|bug|repair|correct|resolve)"; then
        echo "fix"
    elif echo "$diff_output" | grep -qE "(refactor|restructure|rename|move)"; then
        echo "refactor"
    elif echo "$staged_files" | grep -qE "(package\.json|yarn\.lock|package-lock\.json|requirements\.txt|go\.mod)"; then
        echo "chore"
    elif echo "$diff_output" | grep -qE "(style|css|format|lint|prettier)"; then
        echo "style"
    elif echo "$staged_files" | grep -qE "(\.github|\.vscode|config|\.env)"; then
        echo "chore"
    else
        echo "feat"
    fi
}

# 生成提交訊息建議
generate_suggestions() {
    local type=$1
    local files_changed=$2
    local file_types=$3
    
    local scope=""
    local main_ext=$(echo "$file_types" | cut -d',' -f1)
    
    # 根據檔案類型建議 scope
    case "$main_ext" in
        js|ts|jsx|tsx) scope="src" ;;
        css|scss|less) scope="style" ;;
        md) scope="docs" ;;
        json) scope="config" ;;
        yml|yaml) scope="ci" ;;
        sh) scope="scripts" ;;
        *) scope="" ;;
    esac
    
    # 生成不同的描述建議
    case "$type" in
        feat)
            echo "新增$main_ext功能模組"
            echo "實作$main_ext相關功能"
            echo "添加$files_changed個檔案的功能支援"
            ;;
        fix)
            echo "修復$main_ext相關問題"
            echo "修正$main_ext錯誤"
            echo "解決$main_ext功能異常"
            ;;
        docs)
            echo "更新文件說明"
            echo "補充$main_ext文件"
            echo "修正文件格式"
            ;;
        style)
            echo "調整程式碼格式"
            echo "優化$main_ext樣式"
            echo "修正排版問題"
            ;;
        refactor)
            echo "重構$main_ext程式碼"
            echo "優化$main_ext結構"
            echo "重組$files_changed個檔案"
            ;;
        test)
            echo "新增測試案例"
            echo "補充$main_ext測試"
            echo "修正測試錯誤"
            ;;
        chore)
            echo "更新建置配置"
            echo "調整專案設定"
            echo "維護$main_ext檔案"
            ;;
    esac
}

# 顯示互動式選單
show_interactive_menu() {
    local suggested_type=$1
    local suggestions=($2)
    
    echo ""
    echo -e "${CYAN}📋 Conventional Commits 類型選擇:${NC}"
    echo ""
    
    local types=(
        "feat:     新功能 (feature)"
        "fix:      修復問題 (bug fix)"
        "docs:     文件更新 (documentation)"
        "style:    格式調整 (formatting)"
        "refactor: 重構 (refactoring)"
        "perf:     效能優化 (performance)"
        "test:     測試 (testing)"
        "chore:    雜務 (maintenance)"
        "ci:       CI/CD 配置"
        "build:    建置相關"
    )
    
    for i in "${!types[@]}"; do
        local num=$((i + 1))
        local type_line="${types[$i]}"
        local type_code=$(echo "$type_line" | cut -d':' -f1)
        
        if [ "$type_code" == "$suggested_type" ]; then
            echo -e "${GREEN}  [$num] $type_line ← 推薦${NC}"
        else
            echo -e "  [$num] $type_line"
        fi
    done
    
    echo ""
    read -p "請選擇類型 (1-10) 或直接輸入類型: " type_choice
    
    # 處理選擇
    case "$type_choice" in
        1) selected_type="feat" ;;
        2) selected_type="fix" ;;
        3) selected_type="docs" ;;
        4) selected_type="style" ;;
        5) selected_type="refactor" ;;
        6) selected_type="perf" ;;
        7) selected_type="test" ;;
        8) selected_type="chore" ;;
        9) selected_type="ci" ;;
        10) selected_type="build" ;;
        *) selected_type="$type_choice" ;;
    esac
    
    echo ""
    echo -e "${CYAN}💡 描述建議:${NC}"
    echo ""
    
    local i=1
    for suggestion in "${suggestions[@]}"; do
        if [ -n "$suggestion" ]; then
            echo -e "  [$i] $suggestion"
            ((i++))
        fi
    done
    echo -e "  [0] 自訂描述"
    echo ""
    
    read -p "請選擇描述 (0-$((i-1))): " desc_choice
    
    if [ "$desc_choice" == "0" ]; then
        read -p "請輸入提交描述: " custom_desc
        selected_desc="$custom_desc"
    else
        selected_desc="${suggestions[$((desc_choice-1))]}"
    fi
    
    echo ""
    read -p "請輸入 scope (可選，按 Enter 跳過): " scope
    
    # 組合提交訊息
    if [ -n "$scope" ]; then
        commit_msg="${selected_type}(${scope}): ${selected_desc}"
    else
        commit_msg="${selected_type}: ${selected_desc}"
    fi
    
    echo ""
    echo -e "${CYAN}📝 預覽提交訊息:${NC}"
    echo -e "${YELLOW}$commit_msg${NC}"
    echo ""
    read -p "確認提交? (y/n/e-edit): " confirm
    
    case "$confirm" in
        y|Y)
            git commit -m "$commit_msg"
            print_success "已提交: $commit_msg"
            ;;
        e|E)
            read -p "請輸入新的提交訊息: " new_msg
            git commit -m "$new_msg"
            print_success "已提交: $new_msg"
            ;;
        *)
            print_info "已取消提交"
            exit 0
            ;;
    esac
}

# 主程式
main() {
    print_header
    
    # 檢查環境
    check_git_repo
    
    # 檢查變更
    check_changes
    local changes_status=$?
    
    if [ $changes_status -eq 2 ]; then
        print_warning "目前沒有任何變更"
        print_info "使用 'git add <檔案>' 將變更加入暫存區"
        exit 0
    elif [ $changes_status -eq 1 ]; then
        print_warning "有未暫存的變更"
        echo ""
        git status -s
        echo ""
        read -p "是否自動將所有變更加入暫存區? (y/n): " auto_add
        if [ "$auto_add" == "y" ] || [ "$auto_add" == "Y" ]; then
            git add .
            print_success "已將所有變更加入暫存區"
        else
            print_info "請手動使用 'git add' 後再執行此腳本"
            exit 0
        fi
    fi
    
    # 分析 diff
    print_info "分析變更中..."
    local diff_stats=$(analyze_diff)
    local files_changed=$(echo "$diff_stats" | cut -d'|' -f1)
    local insertions=$(echo "$diff_stats" | cut -d'|' -f2)
    local deletions=$(echo "$diff_stats" | cut -d'|' -f3)
    local file_types=$(echo "$diff_stats" | cut -d'|' -f4)
    
    # 顯示統計
    echo ""
    echo -e "${CYAN}📊 變更統計:${NC}"
    echo -e "  檔案變更: $files_changed"
    echo -e "  新增行數: ${GREEN}+$insertions${NC}"
    echo -e "  刪除行數: ${RED}-$deletions${NC}"
    echo -e "  檔案類型: $file_types"
    echo ""
    
    # 推薦類型
    local suggested_type=$(suggest_type)
    print_info "建議的提交類型: ${YELLOW}$suggested_type${NC}"
    
    # 生成建議
    local suggestions=$(generate_suggestions "$suggested_type" "$files_changed" "$file_types")
    
    # 顯示互動選單
    show_interactive_menu "$suggested_type" "$suggestions"
}

# 執行主程式
main "$@"
