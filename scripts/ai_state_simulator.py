import json
import time
import random
import os

STATUS_FILE = os.path.join(os.environ.get('OUTPUT_DIR', '.'), 'status.json')

AGENTS = [
    {"id": "xiaocai", "name": "小蔡 (Xiao Cai)", "role": "Lead Orchestrator", "color": "#a855f7"},
    {"id": "executor", "name": "auto-executor", "role": "Task Runner", "color": "#22c55e"},
    {"id": "delegates", "name": "delegate_agents", "role": "Swarm Workers", "color": "#eab308"}
]

STATUS_TYPES = ["thinking", "executing", "idle"]
TASKS = [
    "Analyzing workspace logs", "Optimizing UI components", "Generating bash scripts",
    "Monitoring system resources", "Refactoring dashboard logic", "Verifying security constraints",
    "Processing natural language", "Synthesizing data flows", "Idle - Standby"
]

def generate_state():
    agents_data = []
    links = []
    
    for agent in AGENTS:
        status = random.choice(STATUS_TYPES)
        task = random.choice(TASKS) if status != "idle" else "Waiting for instructions"
        agents_data.append({
            **agent,
            "status": status,
            "current_task": task,
            "load": random.randint(10, 95) if status != "idle" else 5
        })
    
    # Simulate data flow links
    if agents_data[0]["status"] != "idle":
        links.append({"from": "xiaocai", "to": "executor", "active": True})
    if agents_data[1]["status"] == "executing":
        links.append({"from": "executor", "to": "delegates", "active": True})

    return {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "agents": agents_data,
        "links": links
    }

if __name__ == "__main__":
    print(f"Starting state simulation. Writing to {STATUS_FILE}")
    # Run a few cycles to initialize
    for _ in range(5):
        state = generate_state()
        with open(STATUS_FILE, 'w') as f:
            json.dump(state, f, indent=2)
        time.sleep(0.5)
    print("Initial state generated.")
