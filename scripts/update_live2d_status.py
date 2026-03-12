#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime

DB_PATH = "/Users/caijunchang/.openclaw/workspace/knowledge/live2d_starship_project.json"

def update_status(stage_name, completion_pct, overall_status=None):
    if not os.path.exists(DB_PATH):
        print("Database not found.")
        return

    with open(DB_PATH, 'r') as f:
        data = json.load(f)

    for stage in data['stages']:
        if stage['stage'] == stage_name:
            stage['completion'] = int(completion_pct)
            if int(completion_pct) >= 100:
                stage['status'] = "Completed"
            elif int(completion_pct) > 0:
                stage['status'] = "In Progress"
    
    if overall_status:
        data['status'] = overall_status
    
    data['last_updated'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(DB_PATH, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Updated {stage_name} to {completion_pct}%")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: ./update_live2d_status.py <stage_name> <completion_pct>")
    else:
        update_status(sys.argv[1], sys.argv[2])
