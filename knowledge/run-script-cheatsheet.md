# run_script 白名單速查表
> 來源：server/src/telegram/action-handlers.ts 第 787-826 行
> 更新：2026-03-02

## 規則

run_script 有兩道關卡：
1. **黑名單先檢查** — 匹配到就直接擋，無論白名單怎樣
2. **白名單再檢查** — 沒在白名單裡的指令全部擋

## 可以跑的（白名單）

### 系統診斷
```
curl -s http://localhost:3011/api/health
curl -s http://localhost:3011/api/openclaw/tasks?limit=5
curl -s https://xxx.supabase.co/rest/v1/...
lsof -i :3011
ps aux
ps ef
uptime
date
which node
```

### 日誌
```
cat /tmp/openclaw-server.log
tail -n 50 /tmp/openclaw-server.log
tail -n 100 /Users/sky770825/.openclaw/automation/logs/taskboard.log
head -n 20 /some/file
```

### 搜尋
```
grep -ri "keyword" /path/to/search
grep -rn "function" /Users/sky770825/openclaw任務面版設計/server/src/
find /Users/sky770825/.openclaw/workspace -name "*.md"
```

### 統計
```
wc -l /path/to/file
wc -c /path/to/file
du -sh /path/to/dir
df -h
```

### Python 單行
```
python3 -c "import json; print(json.dumps({'key': 'value'}))"
python3 -c "print(2+2)"
```

### 腳本（特定腳本才行）
```
bash /path/to/health-check.sh
bash /path/to/agent-status.sh
bash /path/to/security-check.sh
python3 /path/to/health-check.py
python3 /path/to/hybrid-search.py "查詢詞"
python3 /path/to/smart-recall.py "查詢"
bash /path/to/vector-index-manager.sh stats
```

## 絕對不能跑的（黑名單）

即使白名單匹配也會被擋：
```
rm -rf                    # 刪除
chmod 777                 # 改權限
npm install / uninstall   # 套件管理
pip install               # Python 套件
git push / reset / clean  # Git 危險操作
kill -9 / pkill / killall # 殺進程
launchctl stop/start      # 系統服務
curl -X POST/PUT/DELETE   # HTTP 寫入操作
eval() / $() / ``         # 指令注入
```

## 常見錯誤和正確寫法

| 錯誤（會被擋） | 正確 |
|----------------|------|
| `nohup node dist/index.js &` | 用 create_task 派工 |
| `curl -X POST http://...` | 用 create_task 或 proxy_fetch |
| `python3 analyze.py` | `python3 -c "..."` 或寫到白名單腳本 |
| `npm install express` | 用 create_task 派工 |
| `cat file.ts \| grep xxx` | `grep -ri "xxx" file.ts`（pipe 有時會被 $() 規則擋） |

## 關鍵提醒

1. **curl 只能 GET** — 白名單只允許 `curl -s http://localhost:3011/api/...`，帶 -X POST 會被黑名單擋
2. **python3 要用 -c** — `python3 -c "code"` 可以，`python3 script.py` 只有特定腳本可以
3. **grep 要帶 flag** — `grep -ri` 或 `grep -rn`，不能只寫 `grep "keyword"`（正則匹配要求 `-[rilnc]+`）
4. **路徑要完整** — `tail -n 50 /full/path/to/file`，不要用相對路徑
