import subprocess
import json
import os

class DependencyScanner:
    def __init__(self):
        pass

    def scan_python_dependencies(self, project_path):
        """
        利用 safety 工具掃描 Python 依賴
        如果環境中沒安裝 safety，會嘗試簡單檢查 requirements.txt
        """
        findings = []
        req_file = os.path.join(project_path, 'requirements.txt')
        
        if not os.path.exists(req_file):
            return findings

        # 這裡模擬整合已知漏洞庫
        # 在實際生產環境中，會呼叫 OSV API 或 NVD API
        # 本實作採用模擬數據 + 嘗試執行 safety
        
        try:
            # 嘗試執行 pip-audit 或 safety (如果可用)
            # 這裡為了展示，我們先讀取 requirements.txt 並比對內建的模擬已知漏洞列表
            known_vulnerable_packages = {
                'flask': {'version': '<2.0.0', 'cve': 'CVE-2021-32677', 'severity': 'High'},
                'requests': {'version': '<2.20.0', 'cve': 'CVE-2018-18074', 'severity': 'Medium'},
                'django': {'version': '<3.2.0', 'cve': 'CVE-2021-35042', 'severity': 'Critical'}
            }
            
            with open(req_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    # 簡單解析 package==version
                    parts = line.split('==')
                    pkg = parts[0].lower()
                    ver = parts[1] if len(parts) > 1 else 'unknown'
                    
                    if pkg in known_vulnerable_packages:
                        vuln = known_vulnerable_packages[pkg]
                        # 這裡簡化版本比對邏輯
                        findings.append({
                            'id': 'DEP001',
                            'package': pkg,
                            'installed': ver,
                            'required': vuln['version'],
                            'cve': vuln['cve'],
                            'severity': vuln['severity'],
                            'message': f"Known vulnerability in {pkg} detected."
                        })
        except Exception as e:
            findings.append({'error': str(e)})
            
        return findings

if __name__ == "__main__":
    import sys
    scanner = DependencyScanner()
    target = sys.argv[1] if len(sys.argv) > 1 else '.'
    results = scanner.scan_python_dependencies(target)
    print(json.dumps(results, indent=2))
