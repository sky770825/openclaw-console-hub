# AI Agent Memory Architecture Design

## 1. Layered Mechanism
- **Hot Memory**: In-process Python list/dict. Lowest latency, volatile. Used for current conversation context.
- **Working Memory**: SQLite 3 database. Structured indexing for tags and importance scores. Used for cross-session retrieval.
- **Cold Memory**: Gzipped JSONL files. Persistent archival for long-term audit trails.

## 2. Structured Indexing
- SQLite allows for complex queries: `SELECT * FROM working_memory WHERE tags LIKE '%urgent%' ORDER BY importance DESC`.
- Hybrid approach: Use SQLite's FTS5 (Full Text Search) for text and standard B-trees for metadata.

## 3. Evaluation Result Summary
The benchmark shows that SQLite provides significant advantages in query flexibility and structured retrieval over flat JSON files as memory scales beyond 1000 entries.
