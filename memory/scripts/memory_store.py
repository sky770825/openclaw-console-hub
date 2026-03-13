from sentence_transformers import SentenceTransformer
import chromadb
import os

class MemoryStore:
    def __init__(self, model_name="paraphrase-multilingual-MiniLM-L12-v2", db_path="./memory/chroma_db"):
        self.model = SentenceTransformer(model_name)
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = self.client.get_or_create_collection(name="openclaw_memories")
        print(f"MemoryStore initialized with model: {model_name} and DB at {db_path}")

    def add_memory(self, text: str, metadata: dict = None):
        # Generate embedding for the text
        embedding = self.model.encode(text).tolist()
        
        # Add to ChromaDB
        # ChromaDB requires an ID for each document. We can use a hash of the text or a UUID.
        # For simplicity, let's use a basic hash for now.
        import hashlib
        doc_id = hashlib.sha256(text.encode()).hexdigest()
        
        # Fix: Ensure metadata is a non-empty dict if provided, otherwise use a default
        if metadata is None:
            metadata = {"source": "openclaw_memory"}
        elif not metadata: # If an empty dict was explicitly passed
            metadata = {"source": "openclaw_memory"}

        self.collection.add(
            documents=[text],
            embeddings=[embedding],
            metadatas=[metadata], # Pass the (now guaranteed non-empty) metadata
            ids=[doc_id]
        )
        print(f"Added memory: '{text[:50]}...'")

    def search(self, query: str, top_k: int = 5) -> list:
        # Generate embedding for the query
        query_embedding = self.model.encode(query).tolist()
        
        # Query ChromaDB
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=['documents', 'distances']
        )
        
        # Format results
        formatted_results = []
        if results and results['documents']:
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    "text": results['documents'][0][i],
                    "distance": results['distances'][0][i]
                })
        print(f"Searched for '{query}', found {len(formatted_results)} results.")
        return formatted_results

# Optional: example usage
if __name__ == "__main__":
    memory_store = MemoryStore()

    # Add some memories
    memory_store.add_memory("主人喜歡喝珍珠奶茶。")
    memory_store.add_memory("OpenClaw 可以透過技能擴展功能。")
    memory_store.add_memory("今天天氣很好，適合出去走走。")
    memory_store.add_memory("達爾是一個AI戰友。")

    # Search for related memories
    print("\n--- Search Results ---")
    results = memory_store.search("主人最愛喝什麼？")
    for res in results:
        print(f"Text: {res['text']} (Distance: {res['distance']:.2f})")

    print("\n--- Another Search ---")
    results = memory_store.search("AI助理可以做什麼？")
    for res in results:
        print(f"Text: {res['text']} (Distance: {res['distance']:.2f})")
