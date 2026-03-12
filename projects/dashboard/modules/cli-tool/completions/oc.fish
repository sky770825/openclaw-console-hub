# OpenClaw CLI Fish Completion

# 主指令補全
complete -c oc -f

# 選項
complete -c oc -s h -l help -d "顯示說明"
complete -c oc -s v -l version -d "顯示版本"

# 子指令
complete -c oc -n "__fish_use_subcommand" -a dashboard -d "啟動 Web UI"
complete -c oc -n "__fish_use_subcommand" -a tasks -d "查看任務板摘要"
complete -c oc -n "__fish_use_subcommand" -a models -d "顯示模型狀態"
complete -c oc -n "__fish_use_subcommand" -a spawn -d "啟動 Agent"
complete -c oc -n "__fish_use_subcommand" -a status -d "系統總覽"
complete -c oc -n "__fish_use_subcommand" -a logs -d "查看日誌"
complete -c oc -n "__fish_use_subcommand" -a stop -d "停止 Agent"
complete -c oc -n "__fish_use_subcommand" -a gateway -d "Gateway 控制"
complete -c oc -n "__fish_use_subcommand" -a session -d "當前會話狀態"
complete -c oc -n "__fish_use_subcommand" -a agents -d "列出所有 Agents"
complete -c oc -n "__fish_use_subcommand" -a config -d "編輯設定檔"
complete -c oc -n "__fish_use_subcommand" -a doctor -d "系統診斷"
complete -c oc -n "__fish_use_subcommand" -a update -d "更新 CLI"

# dashboard 選項
complete -c oc -n "__fish_seen_subcommand_from dashboard" -s p -l port -d "指定端口"
complete -c oc -n "__fish_seen_subcommand_from dashboard" -s h -l host -d "指定主機"
complete -c oc -n "__fish_seen_subcommand_from dashboard" -l no-open -d "不自動開啟瀏覽器"
complete -c oc -n "__fish_seen_subcommand_from dashboard" -s d -l detach -d "背景執行"

# spawn 選項和參數
complete -c oc -n "__fish_seen_subcommand_from spawn" -a "coder analyst research reviewer tester writer custom"
complete -c oc -n "__fish_seen_subcommand_from spawn" -s m -l model -d "指定模型" -a "kimi/kimi-k2.5 gpt-4o gpt-4o-mini claude-3-5-sonnet claude-3-opus grok/grok-4.1 gemini-2.0-flash ollama/llama3"
complete -c oc -n "__fish_seen_subcommand_from spawn" -s t -l timeout -d "設定超時秒數"
complete -c oc -n "__fish_seen_subcommand_from spawn" -s p -l priority -d "設定優先級" -a "high normal low"
complete -c oc -n "__fish_seen_subcommand_from spawn" -s d -l detach -d "背景執行"
complete -c oc -n "__fish_seen_subcommand_from spawn" -s w -l wait -d "等待完成"
complete -c oc -n "__fish_seen_subcommand_from spawn" -l dry-run -d "模擬執行"

# tasks 選項
complete -c oc -n "__fish_seen_subcommand_from tasks" -s l -l limit -d "顯示數量限制"
complete -c oc -n "__fish_seen_subcommand_from tasks" -s s -l status -d "按狀態過濾" -a "pending running completed failed"
complete -c oc -n "__fish_seen_subcommand_from tasks" -s a -l all -d "顯示所有任務"
complete -c oc -n "__fish_seen_subcommand_from tasks" -l watch -d "持續監控"

# models 選項
complete -c oc -n "__fish_seen_subcommand_from models" -s r -l refresh -d "重新整理快取"
complete -c oc -n "__fish_seen_subcommand_from models" -s d -l detail -d "顯示詳細資訊"
complete -c oc -n "__fish_seen_subcommand_from models" -s a -l available -d "只顯示可用模型"

# gateway 子指令
complete -c oc -n "__fish_seen_subcommand_from gateway" -a "status start stop restart logs"
complete -c oc -n "__fish_seen_subcommand_from gateway" -s f -l follow -d "持續追蹤日誌"

# status 選項
complete -c oc -n "__fish_seen_subcommand_from status" -s j -l json -d "以 JSON 格式輸出"
complete -c oc -n "__fish_seen_subcommand_from status" -s q -l quiet -d "簡潔輸出"

# logs 選項
complete -c oc -n "__fish_seen_subcommand_from logs" -s f -l follow -d "持續追蹤"
complete -c oc -n "__fish_seen_subcommand_from logs" -s n -l lines -d "顯示行數"

# doctor 選項
complete -c oc -n "__fish_seen_subcommand_from doctor" -s f -l fix -d "嘗試自動修復問題"
complete -c oc -n "__fish_seen_subcommand_from doctor" -s v -l verbose -d "詳細輸出"
