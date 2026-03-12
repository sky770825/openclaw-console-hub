import urllib.request
import urllib.error
import json
import sys
import os

def create_openclaw_task(title, description):
    # Default local OpenClaw API endpoint
    url = os.getenv("OPENCLAW_API_URL", "http://localhost:3000/api/tasks")
    
    payload = {
        "title": title,
        "description": description,
        "status": "todo",
        "priority": "high",
        "tags": ["automated-dispatch", "web-monitor"]
    }
    
    print(f"Attempting to create task: {title}")
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url, 
        data=data, 
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"Success (Status {status}): {body}")
            return True
    except urllib.error.URLError as e:
        print(f"Failed to connect to OpenClaw API: {e}")
        # In a real scenario, we might fallback to local logging
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 notify.py <title> <description>")
        sys.exit(1)
    
    title_arg = sys.argv[1]
    desc_arg = sys.argv[2]
    create_openclaw_task(title_arg, desc_arg)
