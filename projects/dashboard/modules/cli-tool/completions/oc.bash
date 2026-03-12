#!/bin/bash
# OpenClaw CLI Bash Completion

_oc_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # 主指令列表
    local commands="dashboard tasks models spawn status logs stop gateway session agents config doctor update --help --version"
    
    # 根據前一個參數提供補全
    case "$prev" in
        oc)
            COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
            return 0
            ;;
        spawn)
            # Agent 類型補全
            local agents="coder analyst research reviewer tester writer custom"
            COMPREPLY=( $(compgen -W "$agents" -- "$cur") )
            return 0
            ;;
        gateway)
            local gateway_cmds="status start stop restart logs"
            COMPREPLY=( $(compgen -W "$gateway_cmds" -- "$cur") )
            return 0
            ;;
        logs|stop)
            # 嘗試取得 agent 列表
            local agents=$(ls ~/.openclaw/tasks/*.json 2>/dev/null | xargs -I{} basename {} .json | head -10)
            agents="$agents gateway webui"
            COMPREPLY=( $(compgen -W "$agents" -- "$cur") )
            return 0
            ;;
        -m|--model)
            # 模型補全
            local models="kimi/kimi-k2.5 gpt-4o gpt-4o-mini claude-3-5-sonnet claude-3-opus grok/grok-4.1 gemini-2.0-flash ollama/llama3"
            COMPREPLY=( $(compgen -W "$models" -- "$cur") )
            return 0
            ;;
        -s|--status)
            local statuses="pending running completed failed stopped"
            COMPREPLY=( $(compgen -W "$statuses" -- "$cur") )
            return 0
            ;;
    esac
    
    # 選項補全
    case "$cur" in
        -*)
            local options="-h --help -v --version -f --force -d --detach -j --json -q --quiet -r --refresh -a --all -l --limit -n --lines -p --port -t --timeout -m --model -s --status -w --wait --watch --check --dry-run --fix --detail --available --verbose"
            COMPREPLY=( $(compgen -W "$options" -- "$cur") )
            return 0
            ;;
    esac
}

complete -F _oc_completion oc
