import json
import datetime
from engines.static_engine import StaticAnalyzer
from engines.dependency_engine import DependencyScanner
from engines.ai_engine import AIEnhancedEngine

class PVDModule:
    def __init__(self):
        self.static_engine = StaticAnalyzer()
        self.dep_engine = DependencyScanner()
        self.ai_engine = AIEnhancedEngine()

    def run_full_scan(self, target_dir):
        print(f"[*] Starting Proactive Vulnerability Discovery on: {target_dir}")
        
        # 1. Static Analysis
        print("[+] Running Static Analysis Engine...")
        static_results = self.static_engine.scan_directory(target_dir)
        
        # 2. Dependency Scan
        print("[+] Running Dependency Scan...")
        dep_results = self.dep_engine.scan_python_dependencies(target_dir)
        
        # 3. AI Pattern Recognition
        print("[+] Running AI-Enhanced Pattern Recognition...")
        ai_results = self.ai_engine.scan_project_with_ai(target_dir)
        
        report = {
            "timestamp": datetime.datetime.now().isoformat(),
            "target": target_dir,
            "summary": {
                "static_vulnerabilities": len(static_results),
                "dependency_issues": len(dep_results),
                "ai_identified_risks": len(ai_results)
            },
            "details": {
                "static": static_results,
                "dependency": dep_results,
                "ai": ai_results
            }
        }
        
        self.generate_report_file(report)
        return report

    def generate_report_file(self, report_data):
        filename = f"vulnerability_report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(filename, 'w') as f:
            f.write(f"# Proactive Vulnerability Discovery (PVD) Report\n\n")
            f.write(f"- **Scan Date:** {report_data['timestamp']}\n")
            f.write(f"- **Target Directory:** {report_data['target']}\n\n")
            
            f.write(f"## Summary\n")
            f.write(f"- Static Analysis Findings: {report_data['summary']['static_vulnerabilities']}\n")
            f.write(f"- Known Dependency Vulnerabilities: {report_data['summary']['dependency_issues']}\n")
            f.write(f"- AI Identified Risks: {report_data['summary']['ai_identified_risks']}\n\n")
            
            f.write("## Detailed Findings\n\n")
            
            f.write("### 1. Static Analysis\n")
            for item in report_data['details']['static']:
                f.write(f"- **[{item.get('severity', 'N/A')}]** {item.get('file')}:{item.get('line')} - {item.get('message')}\n")
            
            f.write("\n### 2. Dependency Scan\n")
            for item in report_data['details']['dependency']:
                f.write(f"- **[{item.get('severity', 'N/A')}]** Package: {item.get('package')} ({item.get('installed')}) - {item.get('cve')}: {item.get('message')}\n")

            f.write("\n### 3. AI Enhanced Analysis\n")
            for item in report_data['details']['ai']:
                f.write(f"- **[{item.get('severity', 'N/A')}]** {item.get('file')} - {item.get('type')}: {item.get('description')}\n")
                f.write(f"  - *Suggestion:* {item.get('suggestion')}\n")

        print(f"[!] Report generated: {filename}")

if __name__ == "__main__":
    import sys
    pvd = PVDModule()
    target = sys.argv[1] if len(sys.argv) > 1 else '.'
    pvd.run_full_scan(target)
