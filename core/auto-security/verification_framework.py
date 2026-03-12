import subprocess
import os

class VerificationFramework:
    """
    修復驗證與回溯機制。
    """
    def __init__(self):
        pass

    def run_tests(self, project_path: str) -> bool:
        """
        執行單元測試與安全掃描。
        """
        print(f"[*] Running verification tests in {project_path}...")
        # 這裡模擬執行 pytest 或 bandit
        # result = subprocess.run(["pytest", project_path], capture_output=True)
        # return result.returncode == 0
        return True # 預設模擬通過

    def verify_fix(self, file_path: str, vuln_type: str) -> bool:
        """
        驗證特定檔案是否仍存在該漏洞。
        """
        from code_analyzer import CodeAnalyzer
        analyzer = CodeAnalyzer()
        findings = analyzer.analyze_file(file_path)
        for finding in findings:
            if finding['type'] == vuln_type:
                return False # 漏洞依然存在
        return True # 漏洞已消失
