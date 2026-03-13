import sys
import os
import logging

# Add the workspace directory to path so we can import the module
sys.path.append("/Users/sky770825/.openclaw/workspace/sandbox")

from openclaw_rag_service import OpenClawRAGService, OpenClawRAGError

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def main():
    service = OpenClawRAGService(
        ollama_url="http://localhost:11434",
        llm_model="llama3",
        embed_model="nomic-embed-text"
    )

    query_text = "What is OpenClaw?"
    print(f"\n[QUERY]: {query_text}")
    print("[RESPONSE]: ", end="", flush=True)

    try:
        # We use stream=True by default
        # Note: This demo assumes Ollama is running. If not, it will catch the exception.
        response_gen = service.query(query_text, stream=True)
        
        for chunk in response_gen:
            print(chunk, end="", flush=True)
        print("\n")

    except Exception as e:
        print(f"\n[ERROR]: Could not complete RAG query. Ensure Ollama is running.")
        print(f"Details: {e}")

if __name__ == "__main__":
    main()
