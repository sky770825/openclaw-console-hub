# 系統健康巡檢與日誌診斷報告 (2026-03-01)

## 1. Server API Health Check
**Target:** http://localhost:3011/api/health
```text
* Host localhost:3011 was resolved.
* IPv6: ::1
* IPv4: 127.0.0.1
*   Trying [::1]:3011...
* connect to ::1 port 3011 from ::1 port 54848 failed: Connection refused
*   Trying 127.0.0.1:3011...
* Connected to localhost (127.0.0.1) port 3011
> GET /api/health HTTP/1.1
> Host: localhost:3011
> User-Agent: curl/8.7.1
> Accept: */*
> 
* Request completely sent off
< HTTP/1.1 200 OK
< Vary: Origin
< Access-Control-Allow-Credentials: true
< Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
< Cross-Origin-Opener-Policy: same-origin
< Cross-Origin-Resource-Policy: same-origin
< Origin-Agent-Cluster: ?1
< Referrer-Policy: no-referrer
< Strict-Transport-Security: max-age=31536000; includeSubDomains
< X-Content-Type-Options: nosniff
< X-DNS-Prefetch-Control: off
< X-Download-Options: noopen
< X-Frame-Options: SAMEORIGIN
< X-Permitted-Cross-Domain-Policies: none
< X-XSS-Protection: 0
< X-RateLimit-Limit: 1000
< X-RateLimit-Remaining: 989
< Date: Sun, 01 Mar 2026 08:43:29 GMT
< X-RateLimit-Reset: 1772355451
< Content-Type: application/json; charset=utf-8
< Content-Length: 547
< ETag: W/"223-aETI8D9SmGkTcBF0wigtYtKCI6E"
< Connection: keep-alive
< Keep-Alive: timeout=5
< 
{ [547 bytes data]
* Connection #0 to host localhost left intact
{"ok":true,"service":"openclaw-server","version":"2.4.0","uptime":963,"timestamp":"2026-03-01T08:43:29.343Z","services":{"supabase":{"configured":true,"ping":"ok"},"telegram":{"configured":true},"n8n":{"configured":true},"websocket":{"totalConnections":0,"totalSubscriptions":0}},"memory":{"rss":83,"heapUsed":28,"heapTotal":30,"unit":"MB"},"autoExecutor":{"isRunning":true,"dispatchMode":true,"pollIntervalMs":15000,"maxTasksPerMinute":1,"lastPollAt":"2026-03-01T08:43:26.397Z","lastExecutedAt":"2026-03-01T08:35:44.298Z","totalExecutedToday":1}}
```
Result Summary: < HTTP/1.1 200 OK
## 2. Taskboard Log Analysis (Last 50 lines)
```log
[08:42:39] [32mINFO[39m: [36m[NEUXA-Action] type=run_script path=[39m
    [35mmodule[39m: "telegram"
[08:42:39] [32mINFO[39m: [36m[Heartbeat] step=0 run_script → ok=false[39m
    [35mmodule[39m: "telegram"
[08:42:39] [32mINFO[39m: [36m[XiaocaiAI] model=gemini-3-pro-preview provider=google[39m
    [35mmodule[39m: "telegram"
[08:42:41] [32mINFO[39m: [36m[AutoDispatch] 🟣 任務「部署 Git 安全守門員 (Pre-Commit Hook)」已在待審佇列，跳過繼續找下一個[39m
    [35mmodule[39m: "auto-executor"
[08:42:41] [32mINFO[39m: [36m[AutoDispatch] 所有任務都在待審佇列，等待老蔡審核[39m
    [35mmodule[39m: "auto-executor"
[08:42:56] [32mINFO[39m: [36m[AutoDispatch] 🟣 任務「部署 Git 安全守門員 (Pre-Commit Hook)」已在待審佇列，跳過繼續找下一個[39m
    [35mmodule[39m: "auto-executor"
[08:42:56] [32mINFO[39m: [36m[AutoDispatch] 所有任務都在待審佇列，等待老蔡審核[39m
    [35mmodule[39m: "auto-executor"
[08:43:02] [32mINFO[39m: [36m[XiaocaiAI] model=gemini-3-pro-preview finishReason=STOP replyLen=713[39m
    [35mmodule[39m: "telegram"
[08:43:02] [32mINFO[39m: [36m[NEUXA-Action] type=create_task path=[39m
    [35mmodule[39m: "telegram"
[08:43:02] [32mINFO[39m: [36m[Heartbeat] step=1 create_task → ok=true[39m
    [35mmodule[39m: "telegram"
[08:43:02] [32mINFO[39m: [36m[NEUXA-Action] type=query_supabase path=[39m
    [35mmodule[39m: "telegram"
[08:43:03] [32mINFO[39m: [36m[NEUXA-Action] query_supabase openclaw_tasks → 0 rows[39m
    [35mmodule[39m: "telegram"
[08:43:03] [32mINFO[39m: [36m[Heartbeat] step=1 query_supabase → ok=true[39m
    [35mmodule[39m: "telegram"
[08:43:03] [32mINFO[39m: [36m[XiaocaiAI] model=gemini-3-pro-preview provider=google[39m
    [35mmodule[39m: "telegram"
[08:43:11] [32mINFO[39m: [36m[AutoExecutor] 執行任務: 系統健康巡檢與日誌診斷 (t1772354582473)[39m
    [35mmodule[39m: "auto-executor"
[08:43:11] [32mINFO[39m: [36m[AutoDispatch] 🟢 安全任務「系統健康巡檢與日誌診斷」，自動批准[39m
    [35mmodule[39m: "auto-executor"
[08:43:12] [32mINFO[39m: [36m[ScriptGen] 任務「系統健康巡檢與日誌診斷」執行權限: workspace[39m
    [35mmodule[39m: "executor-agents"
[08:43:26] [32mINFO[39m: [36m[AutoExecutor] 上一個任務仍在執行，跳過本次 poll[39m
    [35mmodule[39m: "auto-executor"
[08:43:28] [32mINFO[39m: [36m[XiaocaiAI] model=gemini-3-pro-preview finishReason=STOP replyLen=346[39m
    [35mmodule[39m: "telegram"
[08:43:28] [32mINFO[39m: [36m[NEUXA-Action] type=query_supabase path=[39m
    [35mmodule[39m: "telegram"
[08:43:28] [32mINFO[39m: [36m[GenerateAndExecute] Attempt 0: script generated (3823 chars)[39m
    [35mmodule[39m: "executor-agents"
[08:43:29] [32mINFO[39m: [36m[NEUXA-Action] query_supabase openclaw_tasks → 5 rows[39m
    [35mmodule[39m: "telegram"
[08:43:29] [32mINFO[39m: [36m[Heartbeat] step=2 query_supabase → ok=true[39m
    [35mmodule[39m: "telegram"
[08:43:29] [32mINFO[39m: [36m[NEUXA-Action] type=read_file path=/Users/caijunchang/.openclaw/workspace/MEMORY.md[39m
    [35mmodule[39m: "telegram"
[08:43:29] [32mINFO[39m: [36m[Heartbeat] step=2 read_file → ok=true[39m
    [35mmodule[39m: "telegram"
```
### Error & Exception Detection
No critical errors found in the last 50 log entries.
## 3. Gemini API 400 (Bad Request) Diagnosis
### Log Evidence
```log
[00:29:43] [33mWARN[39m: [36m[XiaocaiAI] Gemini HTTP 400[39m
[00:29:46] [33mWARN[39m: [36m[XiaocaiAI] Gemini HTTP 400[39m
```
### Source Code Inspection (Gemini Integration)
Possible Gemini integration points found in source:
```text
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:895:   * AI 內容審查：用 Gemini 2.0 Flash 判斷產出是否回答了任務要求
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:896:   * 回傳 1-10 分。Gemini 掛了或超時回傳 7（不擋流程）。
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:974:        // 從回覆中提取數字（Gemini 有時會多輸出幾個字）
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1002:  // ─── 真實執行引擎（取代舊的純文字 callGeminiApi）───
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1005:   * Step 1: 呼叫 Gemini 生成可執行 bash 腳本（不是計畫文字）
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1007:  private static async callGeminiForScript(
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1153:    if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`);
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1284:        lastScript = await this.callGeminiForScript(
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1451:   * 構建 Cursor 執行命令（現已改用 Gemini API）
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1454:    // 標記：實際執行由 executeCursor 直接呼叫 callGeminiApi，此處僅保留介面相容
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1460:   * 構建 CoDEX 執行命令（現已改用 Gemini API）
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak:895:   * AI 內容審查：用 Gemini 2.0 Flash 判斷產出是否回答了任務要求
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak:896:   * 回傳 1-10 分。Gemini 掛了或超時回傳 7（不擋流程）。
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak:974:        // 從回覆中提取數字（Gemini 有時會多輸出幾個字）
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak:1002:  // ─── 真實執行引擎（取代舊的純文字 callGeminiApi）───
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak:1005:   * Step 1: 呼叫 Gemini 生成可執行 bash 腳本（不是計畫文字）
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak:1007:  private static async callGeminiForScript(
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak:1153:    if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`);
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak:1284:        lastScript = await this.callGeminiForScript(
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak:1451:   * 構建 Cursor 執行命令（現已改用 Gemini API）
```
### Analysis Conclusion
Based on the 400 Bad Request status:
1. **Invalid Parameters**: The request payload sent to Gemini API might contain invalid parameters (e.g., unsupported 'topK', 'topP', or 'max_tokens' values).
2. **Model Name**: The model identifier used in the API call might be deprecated or misspelled.
3. **Empty Prompt**: The prompt or content field might be empty at the time of the request.
4. **Safety Filter**: If the prompt triggers safety filters in a specific way that returns 400 (though usually 429 or 200 with finishReason).

**Recommended Action:**
- Verify the JSON structure in the code identified above.
- Ensure environment variables for Gemini model names are correct.
- Check if the payload size exceeds the limit.
