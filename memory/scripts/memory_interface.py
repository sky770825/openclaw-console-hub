import sys
from memory_store import MemoryStore

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 memory_interface.py [add|search] [args]")
        sys.exit(1)

    command = sys.argv[1]
    memory_store = MemoryStore()

    if command == "add":
        if len(sys.argv) < 3:
            print("Usage: python3 memory_interface.py add \"your memory text\"")
            sys.exit(1)
        text = sys.argv[2]
        # Optional: parse metadata if provided as a third argument (e.g., JSON string)
        metadata = None
        if len(sys.argv) > 3:
            import json
            try:
                metadata = json.loads(sys.argv[3])
            except json.JSONDecodeError:
                print("Warning: Invalid metadata JSON. Adding memory without custom metadata.")
        memory_store.add_memory(text, metadata=metadata)
        print("Memory added successfully.")

    elif command == "search":
        if len(sys.argv) < 3:
            print("Usage: python3 memory_interface.py search \"your query\" [top_k]")
            sys.exit(1)
        query = sys.argv[2]
        top_k = 5
        if len(sys.argv) > 3:
            try:
                top_k = int(sys.argv[3])
            except ValueError:
                print("Warning: Invalid top_k value. Using default top_k=5.")
        results = memory_store.search(query, top_k=top_k)
        print("--- Search Results ---")
        if results:
            for res in results:
                print(f"Text: {res['text']} (Distance: {res['distance']:.2f})")
        else:
            print("No relevant memories found.")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
