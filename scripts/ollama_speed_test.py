#!/usr/bin/env python3
"""
Ollama 速度實測腳本
測量：TTFT（首字元時間）、總生成時間、context 大小、模型載入狀態
"""
import json
import sys
import time
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT))
import ollama_client

ollama_client.load_env(PROJECT / "ollama_bot2.env")
model = ollama_client.OLLAMA_MODEL

# 模擬 bot 的 system prompt 大小
def _load_sim():
    kb = (PROJECT / "knowledge" / "knowledge_base.md")
    ka = (PROJECT / "knowledge" / "knowledge_auto.md")
    p1 = kb.read_text(encoding="utf-8") if kb.exists() else ""
    p2 = ka.read_text(encoding="utf-8") if ka.exists() else ""
    mem = "(尚無長期記憶)"
    system = f"""請預設使用繁體中文回覆。

以下是你的知識庫：
{p1}
---
{p2}

以下是你的長期記憶：
{mem}
"""
    return system

system_content = _load_sim()
user_msg = "你好，請用一句話介紹你自己。"
messages = [
    {"role": "system", "content": system_content},
    {"role": "user", "content": user_msg},
]

# Token 粗估：中文約 1.5 char/token
def est_tokens(s: str) -> int:
    return len(s) // 2

print("=== Ollama 速度實測 ===")
print(f"模型: {model}")
print(f"System prompt 長度: {len(system_content)} 字元 (~{est_tokens(system_content)} tokens)")
print()

# 1. 檢查 Ollama 與模型
print("1. 檢查 Ollama...")
t0 = time.perf_counter()
ok, names = ollama_client.list_models()
dt = (time.perf_counter() - t0) * 1000
print(f"   /api/tags 耗時: {dt:.0f} ms")
print(f"   已載入模型: {names}")
print()

# 2. Stream 測 TTFT + 總時間
print("2. 串流生成...")
num_predict, num_ctx, temp = ollama_client._speed_options(model)
ttft = None
chunks = []
t_start = time.perf_counter()
for ok, chunk in ollama_client.ask_ollama_messages_stream(
    messages, model, num_ctx=num_ctx or 4096, num_predict=num_predict, temperature=temp
):
    if not ok:
        print(f"   錯誤: {chunk}")
        sys.exit(1)
    if chunk:
        if ttft is None:
            ttft = (time.perf_counter() - t_start) * 1000
        chunks.append(chunk)
t_end = time.perf_counter()
total_ms = (t_end - t_start) * 1000
reply = "".join(chunks)
print(f"   TTFT (首字元時間): {ttft:.0f} ms")
print(f"   總生成時間: {total_ms:.0f} ms ({total_ms/1000:.1f} s)")
print(f"   回覆長度: {len(reply)} 字元 (~{est_tokens(reply)} tokens)")
print(f"   速度: ~{est_tokens(reply)/(total_ms/1000):.0f} tokens/s")
print()

# 3. 非串流對比（可選）
print("3. 非串流生成（對比）...")
t0 = time.perf_counter()
ok, reply2 = ollama_client.ask_ollama_messages(
    messages, model, num_ctx=num_ctx or 4096, num_predict=num_predict, temperature=temp
)
dt = (time.perf_counter() - t0) * 1000
print(f"   總耗時: {dt:.0f} ms")
print()

print("=== 建議 ===")
if ttft and ttft > 3000:
    print(f"- TTFT {ttft/1000:.1f}s 較高，可能是模型未常駐，可設 OLLAMA_KEEP_ALIVE=24h")
if est_tokens(system_content) > 4000:
    print(f"- System context 約 {est_tokens(system_content)} tokens 偏大，可精簡 knowledge_auto.md")
if total_ms > 15000:
    print(f"- 總生成較慢，可試 qwen3:8b-q4_0 量化版或 qwen2.5:7b 較小模型")
