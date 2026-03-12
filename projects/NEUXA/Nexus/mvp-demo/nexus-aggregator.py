import os
import json
from datetime import datetime

def scan_business_intel():
    report = {
        "project": "NEUXA Nexus MVP",
        "timestamp": datetime.now().isoformat(),
        "discovered_intel": [],
        "summary": ""
    }
    
    # 指定掃描 workspace 下的關鍵目錄
    target_dirs = ["projects", "knowledge", "memory", "sop-知識庫"]
    
    for d in target_dirs:
        if not os.path.exists(d):
            continue
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith(".md") or file.endswith(".json"):
                    path = os.path.join(root, file)
                    try:
                        size = os.path.getsize(path)
                        report["discovered_intel"].append({
                            "name": file,
                            "path": path,
                            "size": size,
                            "type": "MCP_RESOURCE_FILE"
                        })
                    except:
                        continue
    
    report["summary"] = f"NEUXA Nexus 成功識別 {len(report['discovered_intel'])} 個商業情報節點。"
    return report

if __name__ == "__main__":
    intel = scan_business_intel()
    with open("projects/NEUXA/Nexus/mvp-demo/MVP-REPORT.json", "w") as f:
        json.dump(intel, f, indent=2, ensure_ascii=False)
    print("NEUXA Nexus MVP: 深度掃描完成。")
