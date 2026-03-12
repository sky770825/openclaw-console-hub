#!/usr/bin/env zsh
# OpenClaw CLI Zsh Completion

_oc_completion() {
    local curcontext="$curcontext" state line
    typeset -A opt_args
    
    _arguments -C \
        '(-h --help)'{-h,--help}'[顯示說明]' \
        '(-v --version)'{-v,--version}'[顯示版本]' \
        '1: :->command' \
        '*:: :->args'
    
    case "$state" in
        command)
            local commands=(
                'dashboard:啟動 Web UI'
                'tasks:查看任務板摘要'
                'models:顯示模型狀態'
                'spawn:啟動 Agent'
                'status:系統總覽'
                'logs:查看日誌'
                'stop:停止 Agent'
                'gateway:Gateway 控制'
                'session:當前會話狀態'
                'agents:列出所有 Agents'
                'config:編輯設定檔'
                'doctor:系統診斷'
                'update:更新 CLI'
            )
            _describe -t commands 'oc command' commands
            ;;
        args)
            case "$line[1]" in
                spawn)
                    _arguments \
                        '(-m --model)'{-m,--model}'[指定模型]:model:(kimi/kimi-k2.5 gpt-4o gpt-4o-mini claude-3-5-sonnet claude-3-opus grok/grok-4.1 gemini-2.0-flash ollama/llama3)' \
                        '(-t --timeout)'{-t,--timeout}'[設定超時秒數]:seconds:' \
                        '(-p --priority)'{-p,--priority}'[設定優先級]:priority:(high normal low)' \
                        '(-d --detach)'{-d,--detach}'[背景執行]' \
                        '(-w --wait)'{-w,--wait}'[等待完成]' \
                        '--dry-run[模擬執行]' \
                        '1: :->agent_type' \
                        '2: :->task_desc'
                    
                    case "$state" in
                        agent_type)
                            local agents=(coder analyst research reviewer tester writer custom)
                            _describe -t agents 'agent type' agents
                            ;;
                    esac
                    ;;
                tasks)
                    _arguments \
                        '(-l --limit)'{-l,--limit}'[顯示數量限制]:number:' \
                        '(-s --status)'{-s,--status}'[按狀態過濾]:status:(pending running completed failed)' \
                        '(-a --all)'{-a,--all}'[顯示所有任務]' \
                        '--watch[持續監控]'
                    ;;
                models)
                    _arguments \
                        '(-r --refresh)'{-r,--refresh}'[重新整理快取]' \
                        '(-d --detail)'{-d,--detail}'[顯示詳細資訊]' \
                        '(-a --available)'{-a,--available}'[只顯示可用模型]'
                    ;;
                dashboard)
                    _arguments \
                        '(-p --port)'{-p,--port}'[指定端口]:port:' \
                        '(-h --host)'{-h,--host}'[指定主機]:host:' \
                        '--no-open[不自動開啟瀏覽器]' \
                        '(-d --detach)'{-d,--detach}'[背景執行]'
                    ;;
                gateway)
                    _arguments \
                        '1: :->gateway_cmd' \
                        '(-f --follow)'{-f,--follow}'[持續追蹤日誌]'
                    
                    case "$state" in
                        gateway_cmd)
                            local cmds=(status start stop restart logs)
                            _describe -t cmds 'gateway command' cmds
                            ;;
                    esac
                    ;;
                status)
                    _arguments \
                        '(-j --json)'{-j,--json}'[以 JSON 格式輸出]' \
                        '(-q --quiet)'{-q,--quiet}'[簡潔輸出]'
                    ;;
                logs|stop)
                    _arguments \
                        '(-f --follow)'{-f,--follow}'[持續追蹤]' \
                        '(-n --lines)'{-n,--lines}'[顯示行數]:number:' \
                        '1: :->target'
                    
                    case "$state" in
                        target)
                            # 動態取得 agent 列表
                            local agents=(${(f)"$(ls ~/.openclaw/tasks/*.json 2>/dev/null | xargs -I{} basename {} .json | head -10)"})
                            agents+=(gateway webui)
                            _describe -t agents 'target' agents
                            ;;
                    esac
                    ;;
                doctor)
                    _arguments \
                        '(-f --fix)'{-f,--fix}'[嘗試自動修復問題]' \
                        '(-v --verbose)'{-v,--verbose}'[詳細輸出]'
                    ;;
            esac
            ;;
    esac
}

compdef _oc_completion oc
