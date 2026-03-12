import json
import uuid
import datetime
import os
import sys

def emit_msg(sender, category, content, priority="NORMAL", metadata=None):
    bus_path = "/Users/caijunchang/.openclaw/workspace/sandbox/neuxa_comm_bus.jsonl"
    msg = {
        "msg_id": str(uuid.uuid4()),
        "sender": sender,
        "category": category,
        "priority": priority,
        "content": content,
        "metadata": metadata or {},
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }
    with open(bus_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(msg, ensure_ascii=False) + "\n")
    print(f"[*] {sender} emitted {category}: {content[:30]}...")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        # Example usage for manual testing
        emit_msg("Surveyor-01", "PROGRESS", "初步掃描完成", "LOW")
    else:
        emit_msg(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "NORMAL")
