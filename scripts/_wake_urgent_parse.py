# -*- coding: utf-8 -*-
import json, sys

try:
    tasks = json.load(sys.stdin)
    if not isinstance(tasks, list):
        tasks = tasks.get('tasks', [])
    running = [t for t in tasks if t.get('status') == 'running']
    if running:
        print("- 🔄 有 {} 個任務正在執行中，需要確認進度：".format(len(running)))
        for t in running[:3]:
            print("  - {} (id: {})".format(t.get('name', '?')[:50], t.get('id', '')))
    review = [t for t in tasks if t.get('status') == 'review']
    if review:
        print("- 👀 有 {} 個任務等待審核".format(len(review)))
except Exception:
    pass
