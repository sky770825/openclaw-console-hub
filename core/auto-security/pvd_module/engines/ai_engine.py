import json
import os
import requests

class AIEnhancedEngine:
    """
    利用 LLM (透過本地 Ollama 或 OpenClaw 內建能力) 來進行深層模式識別
    """
    def __init__(self, model="qwen3:8b"):
        self.model = model
        self.api_url = "http://localhost:11434/api/generate"

    def analyze_code_snippet(self, code_content, file_path):
        prompt = f"""
You are a senior security researcher. Analyze the following Python code for deep, logical, or hidden vulnerabilities (e.g., race conditions, logical flaws, subtle injection points, or bad cryptographic practices).

File: {file_path}
Code:
```python
{code_content}
```

Identify potential vulnerabilities and return the result in JSON format:
{{
  "vulnerabilities": [
    {{
      "type": "Vulnerability Type",
      "severity": "Low/Medium/High/Critical",
      "description": "Description of why this is a risk",
      "suggestion": "How to fix it"
    }}
  ]
}}
If no vulnerabilities found, return empty list. Respond ONLY with the JSON.
"""
        try:
            # 優先使用本地 Ollama (符合 AGENTS.md 優先本地原則)
            response = requests.post(self.api_url, json={
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }, timeout=30)
            
            if response.status_code == 200:
                result = response.json().get('response', '{}')
                return json.loads(result).get('vulnerabilities', [])
            else:
                return [{"error": f"Ollama API error: {response.status_code}"}]
        except Exception as e:
            return [{"error": f"AI Engine failed: {str(e)}"}]

    def scan_project_with_ai(self, directory):
        findings = []
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith('.py') and 'pvd_module' not in root: # 避免掃描自己
                    path = os.path.join(root, file)
                    with open(path, 'r') as f:
                        content = f.read()
                        # 限制內容長度以避免 Context 爆炸
                        if len(content) < 5000:
                            ai_findings = self.analyze_code_snippet(content, path)
                            for fnd in ai_findings:
                                fnd['file'] = path
                                findings.append(fnd)
        return findings

if __name__ == "__main__":
    import sys
    engine = AIEnhancedEngine()
    target = sys.argv[1] if len(sys.argv) > 1 else '.'
    # 這裡只做範例輸出
    print("AI Engine is ready. Call scan_project_with_ai(target) to start.")
