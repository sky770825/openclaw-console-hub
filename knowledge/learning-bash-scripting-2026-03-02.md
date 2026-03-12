# [Bash 腳本基礎]
> 學習日期：2026-03-02
> 讀的檔案：/Users/caijunchang/openclaw任務面版設計/scripts/health-check.sh

## 我學到什麼
1. Shebang: #!/bin/bash 是腳本的第一行，用來告訴系統要用哪個 shell 來執行這個腳本。
2. 函式 (Function): 可以用 function_name() { ... } 的方式定義可重複使用的程式碼區塊。
3. 變數與參數: 在函式內部可以用 local 宣告區域變數。$1, $2 則是用來接收傳入函式的參數。
4. 條件判斷: if [ condition ]; then ... else ... fi 結構用來做邏輯判斷。這個腳本裡用 if curl ... 的方式，是直接判斷 curl 指令的結束代碼 (exit code) 是否為 0 (成功)。
5. 指令輸出重導向: > /dev/null 可以把指令的標準輸出丟棄，避免在螢幕上印出不需要的資訊。

## 程式碼範例（從原始碼抄關鍵段落）
``bash
# 定義一個檢查服務的函式
check_service() {
    local service_name=$1
    local url=$2
    
    # 用 curl 檢查 URL，-s (silent) -f (fail on error) --max-time (timeout)
    # > /dev/null 把成功的輸出丟掉，只關心 exit code
    if curl --head --silent --fail --max-time 5 "$url" > /dev/null; then
        echo "✅ $service_name: 線上 (URL: $url)"
    else
        echo "❌ $service_name: 離線或錯誤 (URL: $url)"
    fi
}

# 呼叫函式
check_service "OpenClaw Server" "http://localhost:3011/api/health"
`

## 還不懂的
- curl 指令更進階的用法，例如怎麼處理需要帶認證 (token) 的請求。
- Bash 腳本的錯誤處理機制，除了 if` 之外還有沒有更穩健的作法。