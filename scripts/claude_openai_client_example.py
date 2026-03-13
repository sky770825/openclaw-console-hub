"""
使用 OpenAI 相容介面呼叫 Anthropic Claude API 的範例。
會自動從 ~/.openclaw/.env 載入 ANTHROPIC_API_KEY（需 pip install python-dotenv），或使用既有環境變數。
"""
import os
from pathlib import Path

# 優先從 ~/.openclaw/.env 載入（若已安裝 python-dotenv）
_env_path = Path.home() / ".openclaw" / ".env"
if _env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_path)
    except ImportError:
        pass

from openai import OpenAI

# 從環境變數讀取 key（可能已被上面的 .env 載入）
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("請設定環境變數 ANTHROPIC_API_KEY")

client = OpenAI(
    api_key=api_key,
    base_url="https://api.anthropic.com/v1",  # 不要多餘的尾端斜線
)

response = client.chat.completions.create(
    model="claude-opus-4-6",  # 或 claude-sonnet-4-5-20250929 等
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Who are you?"},
    ],
)

print(response.choices[0].message.content)
