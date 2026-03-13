#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/bin:/bin:$PATH"
cd ~/openclaw任務面版設計/orchestrator
python3 openclaw_orchestrator.py "$@"
