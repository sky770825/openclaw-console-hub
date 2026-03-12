# 失敗檢討
- *時間*: 2026-03-03
- *嘗試*: run_script: mkdir -p && cp
- *結果*: 🛑 不在白名單
- *教訓*: 跨目錄搬移檔案優先使用 read_file + write_file，或分開下指令，不要用 && 串接複雜 shell 指令。