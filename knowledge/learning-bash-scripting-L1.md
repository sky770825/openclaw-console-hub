# Bash 腳本學習筆記 (L1 - 健康檢查)

> 日期：2026-03-02
> 來源：/Users/sky770825/openclaw任務面版設計/scripts/health-check.sh

這是我學習 Bash 腳本的第一份實戰筆記，分析一個寫得很好的健康檢查腳本。

## 核心技巧

### 1. 函數定義與呼叫

可以把重複的邏輯包成一個函數，讓程式碼更乾淨。

``bash
# 定義函數
check_service() {
    # $1, $2 是傳進來的參數
    local service_name=$1
    local url=$2
    # ... 函數內容 ...
}

# 呼叫函數，並傳入參數
check_service "OpenClaw Server" "http://localhost:3011/api/health"
`

### 2. if 條件與指令的 Exit Code

Bash 的 if 不只可以比對變數，還可以直接判斷一個指令是否執行成功。指令成功，exit code 是 0，if 就會成立。

`bash
if curl --silent --fail "$url" > /dev/null; then
    echo "✅ 成功"
else
    echo "❌ 失敗"
fi
`

### 3. curl 的健康檢查用法

用 curl 來檢查服務狀態時，有幾個關鍵參數：

- --head: 只請求 HTTP 標頭，不下載整個網頁，速度快。
- --silent 或 -s: 安靜模式，不顯示進度條。
- --fail 或 -f: 當 HTTP 狀態碼是 4xx 或 5xx (錯誤) 時，curl 的 exit code 會是非 0，這樣 if 才能正確判斷失敗。
- --max-time 5: 設定超時時間，避免卡住。

### 4. 輸出重導向 > /dev/null

> /dev/null 的意思是把指令的標準輸出 (stdout) 丟到垃圾桶。在這個場景，我們只關心 curl 成功還是失敗 (exit code)，不關心它輸出的網頁標頭內容，所以把它丟掉。

### 5. local 變數

在函數裡面用 local 宣告的變數，作用域只在該函數內，不會影響到外面的同名變數，是個好習慣。

## 總結

這個 health-check.sh` 腳本雖然簡短，但涵蓋了函數、條件判斷、參數傳遞和實用指令，是學習 Bash 腳本一個非常好的起點。