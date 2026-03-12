import json
import os
import datetime

BUS_PATH = "/Users/caijunchang/.openclaw/workspace/sandbox/neuxa_comm_bus.jsonl"
REPORT_DIR = "/Users/caijunchang/.openclaw/workspace/reports"

def process_messages():
    if not os.path.exists(BUS_PATH):
        print("Comm bus is empty.")
        return

    dispatch_log = []
    with open(BUS_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    print(f"--- NEUXA 星群指揮處: 正在解析 {len(lines)} 條訊息 ---")
    
    for line in lines:
        try:
            msg = json.loads(line.strip())
            cat = msg.get("category")
            sender = msg.get("sender")
            content = msg.get("content")
            prio = msg.get("priority")

            action = "LOG_ONLY"
            if cat == "BLOCKER" or prio in ["HIGH", "CRITICAL"]:
                action = f"IMMEDIATE_INTERVENTION: Dispatching support to {sender}"
            elif cat == "COLLAB_REQ":
                action = f"COORDINATION: Connecting {sender} with relevant sub-agents"
            elif cat == "PROGRESS":
                action = "UPDATE_DASHBOARD"

            dispatch_log.append({
                "msg_id": msg["msg_id"],
                "decision": action,
                "target": sender
            })
            print(f"[{cat}] From {sender}: {content} -> Decision: {action}")
        except Exception as e:
            print(f"Error parsing line: {e}")

    # Generate formal report
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = os.path.join(REPORT_DIR, f"commander_dispatch_{timestamp}.json")
    with open(report_path, "w", encoding="utf-8") as rf:
        json.dump(dispatch_log, rf, indent=2, ensure_ascii=False)
    
    print(f"\n[!] 調度報告已生成: {report_path}")

if __name__ == "__main__":
    process_messages()
