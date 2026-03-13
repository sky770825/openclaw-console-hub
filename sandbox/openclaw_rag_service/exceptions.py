class OpenClawRAGError(Exception):
    """Base exception for OpenClaw RAG Service."""
    pass

class OllamaConnectionError(OpenClawRAGError):
    """Raised when Ollama API is unreachable."""
    pass

class RetrievalError(OpenClawRAGError):
    """Raised when vector retrieval fails."""
    pass

class ConfigurationError(OpenClawRAGError):
    """Raised when configuration is missing or invalid."""
    pass
