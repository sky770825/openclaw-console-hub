import os
import json

class LeakScanReport:
    def __init__(self, status, target, findings, recommendation):
        self.status = status
        self.target = target
        self.findings = findings
        self.recommendation = recommendation

    def to_json(self):
        return json.dumps({
            "status": self.status,
            "target": self.target,
            "findings": self.findings,
            "recommendation": self.recommendation
        }, indent=2)

def scan_path(target_path):
    findings = []
    for root, _, files in os.walk(target_path):
        for file in files:
            full_path = os.path.join(root, file)
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if "rm -rf /" in content:
                        findings.append({"type": "Critical", "detail": f"rm -rf found in {full_path}"})
                    if "curl" in content and "http" in content:
                        findings.append({"type": "Warning", "detail": f"Outbound request potential in {full_path}"})
            except:
                continue
    return findings