# 練習 F-2：強化 run_script 安全審計 (最終章)

### 1. 診斷
已透過 read_file 獲取 security.ts。目前的 FORBIDDEN_COMMANDS 包含 rm -rf, sudo, git push 及各類 Key。但 isScriptSafe 的實作細節（特別是針對指令串接符的過濾）是加固重點。

### 2. 分析
若 isScriptSafe 只檢查 startsWith 白名單，則惡意指令可透過 curl ... ; rm -rf / 繞過。我將分析代碼中是否包含對 ;, |, &, > 等符號的嚴格檢查。

### 3. 加固建議
應在 FORBIDDEN_COMMANDS 或正則檢查中加入對 Shell 注入常用符號的封鎖。