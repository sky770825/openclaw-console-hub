import ast
import os
from typing import List, Dict, Any

class CodeAnalyzer:
    """
    程式碼分析器：解析 AST 並識別潛在的安全漏洞模式。
    """
    def __init__(self):
        # 定義常見的漏洞模式 (簡化版)
        self.vuln_patterns = {
            "SQLInjection": self._check_sql_injection,
            "OSCommandInjection": self._check_os_injection,
            "HardcodedPassword": self._check_hardcoded_password,
        }

    def analyze_file(self, file_path: str) -> List[Dict[str, Any]]:
        if not os.path.exists(file_path):
            return []
        
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()
            
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return [{"type": "SyntaxError", "message": "無法解析 AST"}]

        findings = []
        for node in ast.walk(tree):
            for vuln_type, check_func in self.vuln_patterns.items():
                result = check_func(node)
                if result:
                    result["file"] = file_path
                    findings.append(result)
        
        return findings

    def _check_sql_injection(self, node: ast.AST) -> Dict[str, Any]:
        # 檢查是否在 execute() 中直接使用了格式化字串
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute) and node.func.attr == 'execute':
                for arg in node.args:
                    if isinstance(arg, ast.JoinedStr): # f-string
                        return {
                            "type": "SQLInjection",
                            "line": node.lineno,
                            "severity": "High",
                            "description": "Detected potential SQL injection via f-string in execute()."
                        }
                    # 新增檢查：普通字串但包含變數（這在 AST 中通常是 BinOp 或 Name，此處簡化）
                    if isinstance(arg, ast.Name):
                        return {
                            "type": "SQLInjection",
                            "line": node.lineno,
                            "severity": "High",
                            "description": "Detected potential SQL injection via variable in execute()."
                        }
        return None

    def _check_os_injection(self, node: ast.AST) -> Dict[str, Any]:
        # 檢查 os.system() 或 subprocess.run(shell=True)
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute) and node.func.attr == 'system' and getattr(node.func.value, 'id', '') == 'os':
                return {
                    "type": "OSCommandInjection",
                    "line": node.lineno,
                    "severity": "High",
                    "description": "Detected potential OS command injection via os.system()."
                }
        return None

    def _check_hardcoded_password(self, node: ast.AST) -> Dict[str, Any]:
        # 檢查變數名稱包含 password 且賦值為字串常值
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and "password" in target.id.lower():
                    if isinstance(node.value, (ast.Constant, ast.Str)):
                        return {
                            "type": "HardcodedPassword",
                            "line": node.lineno,
                            "severity": "Medium",
                            "description": "Detected potential hardcoded password."
                        }
        return None

    def recall_history(self, vuln_type: str) -> str:
        """
        模擬「智能召回」功能，根據漏洞類型回傳歷史修復建議。
        實際實作可介接向量資料庫。
        """
        history = {
            "SQLInjection": "使用參數化查詢 (Parameterized Queries) 取代字串格式化。",
            "OSCommandInjection": "使用 subprocess.run() 並將 shell 設為 False，傳遞參數列表。",
            "HardcodedPassword": "將敏感資訊移至環境變數或秘密管理系統 (Secret Manager)。"
        }
        return history.get(vuln_type, "查無相關修復案例。")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        analyzer = CodeAnalyzer()
        results = analyzer.analyze_file(sys.argv[1])
        print(results)
