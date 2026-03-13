import json
import sys
import os
from datetime import datetime

DB_FILE = "/Users/sky770825/.openclaw/workspace/reports/task_data.json"

def init_db():
    if not os.path.exists(DB_FILE):
        initial_tasks = [
            {"id": 1, "task": "Landing Page Structure", "status": "Completed", "owner": "阿秘", "progress": 100},
            {"id": 2, "task": "Feature Page: Progress Tracking Layout", "status": "In Progress", "owner": "阿秘", "progress": 60},
            {"id": 3, "task": "Task Management Component", "status": "Pending", "owner": "阿秘", "progress": 0},
            {"id": 4, "task": "Data Visualization (Charts)", "status": "Pending", "owner": "阿秘", "progress": 0},
            {"id": 5, "task": "Backend API Integration", "status": "Restricted", "owner": "主人", "progress": 10}
        ]
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(initial_tasks, f, indent=4, ensure_ascii=False)

def list_tasks():
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        tasks = json.load(f)
    print(f"{'ID':<4} | {'Task':<40} | {'Status':<15} | {'Progress':<10}")
    print("-" * 75)
    for t in tasks:
        print(f"{t['id']:<4} | {t['task']:<40} | {t['status']:<15} | {t['progress']}%")

def generate_report():
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        tasks = json.load(f)
    
    report_path = "/Users/sky770825/.openclaw/workspace/reports/progress_report.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# OpenClaw 專案進度追蹤報告\n\n")
        f.write(f"更新時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("| 任務名稱 | 負責人 | 狀態 | 進度 |\n")
        f.write("| :--- | :--- | :--- | :--- |\n")
        total_p = 0
        for t in tasks:
            f.write(f"| {t['task']} | {t['owner']} | {t['status']} | {t['progress']}% |\n")
            total_p += t['progress']
        
        avg_p = total_p / len(tasks)
        f.write(f"\n\n**總體完成度: {avg_p:.2f}%**\n")
    return report_path

if __name__ == "__main__":
    init_db()
    if len(sys.argv) > 1 and sys.argv[1] == "report":
        path = generate_report()
        print(f"Report generated at: {path}")
    else:
        list_tasks()
