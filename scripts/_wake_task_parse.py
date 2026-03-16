# -*- coding: utf-8 -*-
import json, sys

try:
    tasks = json.load(sys.stdin)
    if not isinstance(tasks, list):
        tasks = tasks.get('tasks', [])
    by_status = {}
    for t in tasks:
        s = t.get('status', 'unknown')
        by_status[s] = by_status.get(s, 0) + 1
    total = len(tasks)
    lines = ["總計 {} 個任務｜".format(total) + "  ".join("{}:{}".format(k, v) for k, v in sorted(by_status.items()))]
    active = [t for t in tasks if t.get('status') in ('ready', 'running', 'review')]
    active.sort(key=lambda x: x.get('updatedAt', ''), reverse=True)
    if active:
        lines.append("\n### 最近待處理任務（前5）")
        for t in active[:5]:
            priority = t.get('priority', '-')
            lines.append("- [{}] P{} {}".format(t.get('status'), priority, t.get('name', '?')[:60]))
    print('\n'.join(lines))
except Exception as e:
    print("(解析失敗: {})".format(e))
