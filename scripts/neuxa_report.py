import json
import datetime
import sys
import os

def send_report(bus_path, agent_id, msg_type, priority, task_id, message, **kwargs):
    report = {
        "agent_id": agent_id,
        "timestamp": datetime.datetime.now().isoformat(),
        "type": msg_type,
        "priority": priority,
        "payload": {
            "task_id": task_id,
            "message": message,
            **kwargs
        }
    }
    with open(bus_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(report, ensure_ascii=False) + "\n")
    print(f"Report sent from {agent_id}: {msg_type} - {message}")

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python3 neuxa_report.py <bus_path> <agent_id> <type> <priority> <task_id> <message> [extra_key=extra_val...]")
        sys.exit(1)
    
    bus = sys.argv[1]
    aid = sys.argv[2]
    mtype = sys.argv[3]
    prio = sys.argv[4]
    tid = sys.argv[5]
    msg = sys.argv[6]
    
    extras = {}
    for arg in sys.argv[7:]:
        if "=" in arg:
            k, v = arg.split("=", 1)
            extras[k] = v
            
    send_report(bus, aid, mtype, prio, tid, msg, **extras)
