# 20 — NEUXA 自救 SOP - V2.0 (多路徑規劃版)

> 出錯了不要慌，不要等主人。先自己修，修不了再報告。
> 核心原則：當第一條路徑失敗，立即思考並提出至少兩種替代方案。

---

## 五類常見錯誤 + 對症下藥

### 錯誤 1：write_file 寫了錯的內容
``
症狀：寫進去的檔案內容有問題（打字錯、格式壞、邏輯錯）
`
自救步驟：
1. read_file 看目前內容
2. 判斷問題在哪
3. 重新 write_file 覆蓋正確內容
4. read_file 再確認一次

不能自救的情況：覆蓋了主人的重要檔案 → 通知主人用 git 回滾

---

### 錯誤 2：路徑搞錯，action 失敗 或 無法獲取關鍵資訊
`
症狀：read_file / write_file 回傳「檔案不存在」或「無法連線到資料庫/服務」等，導致任務卡住。
`
自救步驟 (多路徑規劃)：
1.  診斷當前失敗原因：確認錯誤訊息，判斷是路徑問題、權限問題、還是連線問題。
2.  替代方案 A (路徑問題)：
       看 cookbook/14（路徑決策樹），確認目標檔案或目錄的正確位置。
       用 run_script ls -la <你以為的路徑> 確認實際情況。
       用 run_script find /Users/sky770825/.openclaw/workspace -name "檔案名" 2>/dev/null 找到正確路徑。
       用正確路徑重試。
3.  替代方案 B (權限/連線/資訊缺失問題)：
       檢查記憶：該資訊是否已在我的 context window 或知識庫 (semantic_search) 中？
       主動諮詢主人：直接向主人提問，例如「主人，由於我不能直接讀取 .env 檔案，您是否能直接提供 SUPABASE_URL 和 SUPABASE_ANON_KEY？」
       搜尋其他配置檔：嘗試搜尋 config.js、supabase.js、或環境變數模板 .env.example。
       深入分析相關檔案：例如在 script.js 或 admin 目錄中搜尋硬編碼的連線字串，或分析 index.html 是否引用了帶有連線資訊的 JS 檔案。
       呼叫代理：如果需要更強的搜尋或分析能力，考慮 ask_ai model=claude 或 model=opus。
4.  選擇最佳方案並執行：根據診斷和替代方案，選擇最有可能成功的路徑並執行。

重要：當一個方案失敗，必須主動提出至少兩種替代方案給主人，而不是重複報告失敗。

---

### 錯誤 3：run_script 改了系統狀態
`
症狀：跑了一個指令，改了不該改的東西
`
自救步驟：
1. 分析指令做了什麼
2. 如果可逆（mkdir → rmdir、cp → rm）→ 跑相反操作
3. 如果不可逆（rm 了東西）→ 通知主人
4. 記錄在筆記裡，下次不要再犯

---

### 錯誤 4：create_task 描述寫錯了
`
症狀：建了任務但描述不對，auto-executor 會做錯
`
自救步驟：

{"action":"run_script","command":"curl -X PATCH 'http://localhost:3011
