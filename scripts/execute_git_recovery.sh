#!/bin/bash
# 達爾的核心文件緊急修復指令工具
# 該腳本提供自動化的恢復選項

echo "--- [Git P0 緊急恢復工具] ---"
echo "目前的 Git 狀態:"
git status

echo ""
echo "選擇恢復模式:"
echo "1) 查看變動 (git diff)"
echo "2) 丟棄目前的修改，還原到當前 HEAD 狀態 (git reset --hard HEAD)"
echo "3) 撤銷 Reset 動作，回到 reset 之前 (git reset --hard HEAD@{1})"
echo "4) 離開"

read -p "請輸入選項 [1-4]: " choice

case $choice in
    1)
        git diff
        ;;
    2)
        echo "正在將工作區恢復到當前 HEAD..."
        git reset --hard HEAD
        echo "完成。"
        ;;
    3)
        echo "正在撤銷上一次 Reset 操作..."
        git reset --hard HEAD@{1}
        echo "完成。你已回到 reset 之前的狀態。"
        ;;
    4)
        echo "取消操作。"
        exit 0
        ;;
    *)
        echo "無效選項。"
        exit 1
        ;;
esac
