import http.client
import json

def check_ollama():
    try:
        conn = http.client.HTTPConnection("localhost", 11434, timeout=2)
        conn.request("GET", "/api/tags")
        response = conn.getresponse()
        if response.status == 200:
            models = json.loads(response.read())
            print(f"✅ 本地 Ollama 服務已啟動。")
            if 'models' in models:
                print(f"目前可用模型: {[m['name'] for m in models['models']]}")
        else:
            print("⚠️ Ollama 服務回應異常。")
    except Exception:
        print("❌ 本地尚未偵測到 Ollama 服務 (localhost:11434)。這正是安裝本地模型的好機會！")

if __name__ == "__main__":
    check_ollama()
