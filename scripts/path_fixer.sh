#!/bin/bash
# 自動修正 M3 Ultra 環境下的路徑對映
export PROJECT_ROOT="/Users/sky770825/openclaw任務面版設計"
export WORKSPACE_ROOT="/Users/sky770825/.openclaw/workspace"
# 修復路徑錯誤：將源碼路徑映射至工作區
alias check_src="ls $PROJECT_ROOT"
echo "Path mapping initialized for M3 Ultra environment."
