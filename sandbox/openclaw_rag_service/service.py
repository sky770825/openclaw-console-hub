import logging
from typing import List, Dict, Any, Generator, Optional
from .ollama_client import OllamaClient
from .retriever import VectorRetriever
from .exceptions import OpenClawRAGError

class OpenClawRAGService:
    def __init__(self, 
                 ollama_url: str = "http://localhost:11434", 
                 llm_model: str = "llama3",
                 embed_model: str = "nomic-embed-text"):
        self.ollama = OllamaClient(base_url=ollama_url, model=llm_model)
        self.embed_model = embed_model
        self.retriever = VectorRetriever()
        self.logger = logging.getLogger("RAGService")

    def _build_prompt(self, query: str, contexts: List[Dict[str, Any]]) -> str:
        context_text = "\n\n".join([f"--- Context {i+1} ---\n{c['content']}" for i, c in enumerate(contexts)])
        prompt = (
            "You are an OpenClaw Tactical Assistant. Use the following context to answer the user's question.\n"
            "If the context is insufficient, rely on your internal knowledge but mention the source limitation.\n\n"
            f"CONTEXT:\n{context_text}\n\n"
            f"USER QUESTION: {query}\n\n"
            "ANSWER:"
        )
        return prompt

    def query(self, user_input: str, stream: bool = True) -> Any:
        try:
            # 1. Embed Query
            self.logger.info(f"Generating embedding for: {user_input[:50]}...")
            embedding = self.ollama.get_embedding(user_input, model=self.embed_model)

            # 2. Retrieve Context
            self.logger.info("Retrieving relevant documents...")
            contexts = self.retriever.search(embedding)

            # 3. Construct Prompt
            prompt = self._build_prompt(user_input, contexts)

            # 4. Generate Response
            messages = [{"role": "user", "content": prompt}]
            self.logger.info("Calling Ollama LLM...")
            return self.ollama.chat(messages, stream=stream)

        except OpenClawRAGError as e:
            self.logger.error(f"RAG workflow error: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            raise OpenClawRAGError(f"Critical service failure: {e}")
