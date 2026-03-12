import urllib.request
import hashlib
import time
import os
import subprocess
import json

# Configuration
CONFIG = {
    "targets": [
        {"url": "https://www.google.com", "name": "Google Connectivity Check"},
        {"url": "https://github.com/status", "name": "GitHub Status Monitor"}
    ],
    "check_interval": 300, # 5 minutes
    "storage_dir": "/tmp/web_monitor_hashes"
}

if not os.path.exists(CONFIG["storage_dir"]):
    os.makedirs(CONFIG["storage_dir"])

def get_content_hash(url):
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            content = response.read()
            return hashlib.md5(content).hexdigest()
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def trigger_dispatch(name, url):
    title = f"Command: Respond to Change in {name}"
    description = f"Automated Alert: Significant change detected at {url}. Review requirements and update local assets."
    
    script_path = os.path.join(os.path.dirname(__file__), "notify.py")
    subprocess.run(["python3", script_path, title, description])

def run_monitor_cycle():
    print(f"[{time.ctime()}] Starting monitoring cycle...")
    for target in CONFIG["targets"]:
        url = target["url"]
        name = target["name"]
        safe_name = hashlib.md5(url.encode()).hexdigest()
        hash_file = os.path.join(CONFIG["storage_dir"], f"{safe_name}.hash")
        
        current_hash = get_content_hash(url)
        if not current_hash:
            continue
            
        if os.path.exists(hash_file):
            with open(hash_file, 'r') as f:
                old_hash = f.read().strip()
            
            if current_hash != old_hash:
                print(f"Change detected for {name}!")
                trigger_dispatch(name, url)
            else:
                print(f"No change for {name}.")
        else:
            print(f"Initial hash stored for {name}.")
            
        with open(hash_file, 'w') as f:
            f.write(current_hash)

if __name__ == "__main__":
    # Run once for the demonstration
    run_monitor_cycle()
