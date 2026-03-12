import ast
import os
import json

class StaticAnalyzer:
    def __init__(self):
        self.vulnerabilities = []
        # 定義常見的危險模式
        self.rules = [
            {'id': 'SA001', 'name': 'Potential SQL Injection', 'type': 'pattern', 'pattern': '.execute('},
            {'id': 'SA002', 'name': 'Hardcoded Secret', 'type': 'keyword', 'keywords': ['api_key', 'password', 'secret', 'token']},
            {'id': 'SA003', 'name': 'Insecure Randomness', 'type': 'keyword', 'keywords': ['random.random', 'random.randint']},
            {'id': 'SA004', 'name': 'Command Injection', 'type': 'pattern', 'pattern': 'os.system('},
        ]

    def analyze_file(self, file_path):
        if not file_path.endswith('.py'):
            return []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                
            file_vulnerabilities = []
            
            # 簡單的 AST 遍歷與關鍵字檢查
            for line_no, line in enumerate(content.splitlines(), 1):
                for rule in self.rules:
                    if rule['type'] == 'keyword':
                        for kw in rule['keywords']:
                            if kw in line.lower() and '=' in line:
                                file_vulnerabilities.append({
                                    'id': rule['id'],
                                    'file': file_path,
                                    'line': line_no,
                                    'message': f"Potential {rule['name']} detected: '{kw}'",
                                    'severity': 'High' if rule['id'] == 'SA002' else 'Medium'
                                })
                    elif rule['type'] == 'pattern':
                        if rule['pattern'] in line:
                             file_vulnerabilities.append({
                                    'id': rule['id'],
                                    'file': file_path,
                                    'line': line_no,
                                    'message': f"Potential {rule['name']} detected: usage of {rule['pattern']}",
                                    'severity': 'Critical'
                                })
            
            return file_vulnerabilities
        except Exception as e:
            return [{'file': file_path, 'error': str(e)}]

    def scan_directory(self, directory):
        all_findings = []
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith('.py'):
                    path = os.path.join(root, file)
                    all_findings.extend(self.analyze_file(path))
        return all_findings

if __name__ == "__main__":
    import sys
    analyzer = StaticAnalyzer()
    target = sys.argv[1] if len(sys.argv) > 1 else '.'
    results = analyzer.scan_directory(target)
    print(json.dumps(results, indent=2))
