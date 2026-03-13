import requests
import json
import logging
from typing import List, Dict, Any, Generator
from .exceptions import OllamaConnectionError

class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3"):
        self.base_url = base_url
        self.model = model
        self.logger = logging.getLogger("OllamaClient")

    def get_embedding(self, text: str, model: str = "nomic-embed-text") -> List[float]:
        try:
            response = requests.post(
                f"{self.base_url}/api/embeddings",
                json={"model": model, "prompt": text},
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("embedding", [])
        except Exception as e:
            self.logger.error(f"Embedding error: {e}")
            raise OllamaConnectionError(f"Failed to get embedding from Ollama: {e}")

    def chat(self, messages: List[Dict[str, str]], stream: bool = True) -> Any:
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": stream
            }
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                stream=stream,
                timeout=60
            )
            response.raise_for_status()

            if stream:
                return self._handle_stream(response)
            else:
                return response.json()
        except Exception as e:
            self.logger.error(f"Chat error: {e}")
            raise OllamaConnectionError(f"Failed to connect to Ollama Chat: {e}")

    def _handle_stream(self, response: requests.Response) -> Generator[str, None, None]:
        for line in response.iter_lines():
            if line:
                chunk = json.loads(line)
                if "message" in chunk and "content" in chunk["message"]:
                    yield chunk["message"]["content"]
                if chunk.get("done"):
                    break
