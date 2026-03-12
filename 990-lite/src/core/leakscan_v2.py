import os
import re
import json

# --- LeakScan v2.0 Configuration ---
CHECKS = [
    {
        'name': 'Critical RCE Function Usage',
        'pattern': re.compile(r'\b(eval|system|exec|shell_exec|passthru|popen|proc_open|pcntl_exec)\s*\('),
        'type': 'Critical'
    },
    {
        'name': 'Sensitive Information Leak',
        'pattern': re.compile(r'(API_KEY|AI_KEY|SECRET|PASSWORD|TOKEN|CREDENTIALS|id_rsa|access_key)', re.IGNORECASE),
        'type': 'High'
    },
    {
        'name': 'Dangerous Input Usage',
        'pattern': re.compile(r'(\$_POST|\$_GET|\$_REQUEST|process\.env)\[.*?\]'),
        'type': 'High'
    }
]

def scan_file(file_path, findings):
    if not file_path.endswith(('.py', '.ts', '.js', '.php', '.env')):
        return
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            for check in CHECKS:
                matches = check['pattern'].findall(content)
                if matches:
                    findings.append({
                        "type": check['type'],
                        "rule": check['name'],
                        "file": file_path,
                        "matches": list(set(matches))[:5]
                    })
    except: pass

def scan_path(target_path):
    findings = []
    if os.path.isfile(target_path):
        scan_file(target_path, findings)
    elif os.path.isdir(target_path):
        for root, _, files in os.walk(target_path):
            for file in files:
                scan_file(os.path.join(root, file), findings)
    return findings