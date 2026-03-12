import os
from typing import Dict, Any

class PatchGenerator:
    """
    補丁生成引擎：根據漏洞類型與上下文生成修復程式碼。
    """
    def __init__(self):
        pass

    def generate_patch(self, vuln_data: Dict[str, Any], context: str) -> str:
        """
        利用 L2 Claude Code 的能力（此處為模板化邏輯）生成補丁。
        """
        vuln_type = vuln_data.get("type")
        
        if vuln_type == "SQLInjection":
            return self._fix_sql_injection(vuln_data, context)
        elif vuln_type == "OSCommandInjection":
            return self._fix_os_injection(vuln_data, context)
        elif vuln_type == "HardcodedPassword":
            return self._fix_hardcoded_password(vuln_data, context)
        
        return "# No patch available for this vulnerability type."

    def _fix_sql_injection(self, vuln_data: Dict[str, Any], context: str) -> str:
        return "cursor.execute(\"SELECT * FROM users WHERE username = %s\", (username,))"

    def _fix_os_injection(self, vuln_data: Dict[str, Any], context: str) -> str:
        return "subprocess.run([\"ls\", \"-l\"], shell=False)"

    def _fix_hardcoded_password(self, vuln_data: Dict[str, Any], context: str) -> str:
        return "password = os.getenv('DB_PASSWORD')"

    def generate_commit_message(self, vuln_type: str, file_path: str) -> str:
        """
        整合 git-commit-gen 風格，生成規範提交訊息。
        """
        return f"fix(security): resolve {vuln_type} in {os.path.basename(file_path)}\n\nIdentified and fixed a potential {vuln_type} vulnerability to improve system security."

if __name__ == "__main__":
    pg = PatchGenerator()
    print(pg.generate_commit_message("SQLInjection", "app.py"))
