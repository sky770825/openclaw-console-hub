#!/usr/bin/env python3
import os
import re
import sys

def audit_file(filepath):
    issues = []
    with open(filepath, 'r', errors='ignore') as f:
        content = f.read()
        
        # Check for hardcoded secrets
        if re.search(r'(api_key|secret|token|password)\s*=\s*[\'\"][a-zA-Z0-9]{5,}[\'\"]', content, re.I):
            issues.append("[CRITICAL] Possible hardcoded secret found.")
            
        # Check for shell execution without sanitization
        if "child_process.exec" in content or "os.system" in content:
            issues.append("[WARNING] Shell execution detected. Ensure input is sanitized using SecurityShield.")
            
        # Check for eval
        if "eval(" in content:
            issues.append("[HIGH] Use of eval() detected. Highly insecure.")
            
    return issues

def main():
    skills_dir = "/Users/caijunchang/.openclaw/workspace/skills"
    print(f"--- Starting Security Audit on {skills_dir} ---")
    total_issues = 0
    for root, dirs, files in os.walk(skills_dir):
        for file in files:
            if file.endswith(('.js', '.py', '.sh')):
                path = os.path.join(root, file)
                file_issues = audit_file(path)
                if file_issues:
                    print(f"File: {path}")
                    for issue in file_issues:
                        print(f"  - {issue}")
                        total_issues += 1
    
    print(f"--- Audit Complete. Found {total_issues} potential issues. ---")
    if total_issues > 0:
        sys.exit(0)

if __name__ == "__main__":
    main()
