#!/usr/bin/env python3
"""
Ollama 本機連線共用模組
可被多個 bot（Telegram、Discord 等）共用，呼叫同一台本機 Ollama。
"""

import os
from pathlib import Path
from typing import Tuple, Optional

import requests

# 預設設定（可被 load_env 覆寫）
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")


def load_env(env_path: Optional[Path] = None) -> None:
    """從 .env 檔讀取 OLLAMA_URL、OLLAMA_MODEL（不覆寫已有環境變數）。"""
    global OLLAMA_URL, OLLAMA_MODEL
    if env_path is None:
        env_path = Path(__file__).parent / "ollama_monitor_bot.env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").strip().splitlines():
        if "=" not in line or line.strip().startswith("#"):
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip("'\"")
        if k == "OLLAMA_URL" and v:
            OLLAMA_URL = v
        elif k == "OLLAMA_MODEL" and v:
            OLLAMA_MODEL = v


def list_models() -> Tuple[bool, list[str]]:
    """取得本機 Ollama 已載入的模型名稱列表，回傳 (成功與否, 名稱列表)。"""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code == 200:
            data = r.json()
            models = data.get("models", [])
            names = [m.get("name", "?") for m in models if m.get("name")]
            return True, names if names else []
        return False, []
    except Exception:
        return False, []


def check_ollama_status() -> Tuple[bool, str]:
    """檢查 Ollama 服務是否運行，回傳 (成功與否, 訊息)。"""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code == 200:
            data = r.json()
            models = data.get("models", [])
            names = [m.get("name", "?") for m in models]
            return True, f"✅ 本機 Ollama 運行中\n已載入模型: {', '.join(names) if names else '(無)'}"
        return False, f"❌ Ollama 回應異常: HTTP {r.status_code}"
    except requests.exceptions.ConnectionError:
        return False, "❌ 無法連線到本機 Ollama，請確認服務是否啟動 (ollama serve)"
    except requests.exceptions.Timeout:
        return False, "❌ 連線逾時"
    except Exception as e:
        return False, f"❌ 錯誤: {str(e)}"


def ask_ollama(prompt: str, model: Optional[str] = None) -> Tuple[bool, str]:
    """將訊息送往本機 Ollama，回傳 (成功與否, 回覆)。"""
    return ask_ollama_messages([{"role": "user", "content": prompt}], model)


def ask_ollama_messages_stream(
    messages: list[dict],
    model: Optional[str] = None,
    num_ctx: Optional[int] = 4096,
    num_predict: Optional[int] = None,
    temperature: Optional[float] = None,
):
    """串流呼叫 Ollama，yield (成功與否, chunk)。chunk 為空字串表示結束。呼叫端需累積 chunks。"""
    import json
    model = model or OLLAMA_MODEL
    payload = {"model": model, "messages": messages, "stream": True}
    options = {}
    if num_ctx is not None:
        options["num_ctx"] = num_ctx
    if num_predict is not None:
        options["num_predict"] = num_predict
    if temperature is not None:
        options["temperature"] = temperature
    if options:
        payload["options"] = options
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json=payload,
            stream=True,
            timeout=180,
        )
        if r.status_code != 200:
            yield False, f"Ollama 回應異常: HTTP {r.status_code}"
            return
        for line in r.iter_lines(decode_unicode=True):
            if not line:
                continue
            try:
                data = json.loads(line)
                content = data.get("message", {}).get("content", "")
                if content:
                    yield True, content
            except Exception:
                pass
        yield True, ""  # 結束標記
    except Exception as e:
        yield False, str(e)


def ask_ollama_messages(
    messages: list[dict],
    model: Optional[str] = None,
    num_ctx: Optional[int] = 4096,
    num_predict: Optional[int] = None,
    temperature: Optional[float] = None,
) -> Tuple[bool, str]:
    """將訊息列表送往本機 Ollama，回傳 (成功與否, 回覆)。
    num_ctx 小一點可加速；num_predict 可限制生成長度；temperature 低一點略為加速採樣。"""
    model = model or OLLAMA_MODEL
    payload = {"model": model, "messages": messages, "stream": False}
    options = {}
    if num_ctx is not None:
        options["num_ctx"] = num_ctx
    if num_predict is not None:
        options["num_predict"] = num_predict
    if temperature is not None:
        options["temperature"] = temperature
    if options:
        payload["options"] = options
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json=payload,
            timeout=180,
        )
        if r.status_code == 200:
            data = r.json()
            msg = data.get("message", {})
            content = msg.get("content", "").strip()
            return True, content if content else "(模型無回覆)"
        return False, f"Ollama 回應異常: HTTP {r.status_code}"
    except requests.exceptions.ConnectionError:
        return False, "無法連線到本機 Ollama，請確認 ollama serve 已啟動"
    except requests.exceptions.Timeout:
        return False, "Ollama 回應逾時，請稍後再試"
    except Exception as e:
        return False, f"錯誤: {str(e)}"


# 速度優化預設
def _speed_options(model: str) -> tuple[Optional[int], Optional[int], Optional[float]]:
    """依模型回傳 (num_predict, num_ctx, temperature)。num_ctx 小可加速。"""
    m = (model or "").lower()
    if "r1" in m or "deepseek-r1" in m:
        return 2048, 4096, 0.7
    if "qwen3" in m or "qwen2.5" in m or "qwen2" in m:
        return 2048, 2048, None  # num_ctx=2048 加速
    return None, None, None
