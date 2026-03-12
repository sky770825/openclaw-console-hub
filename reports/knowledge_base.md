# Supabase Vector Guide

Supabase provides a powerful vector store using the pgvector extension. 
This allows for efficient similarity searches within your PostgreSQL database.

## Installation
To enable the extension, run the SQL command: `create extension vector;`.

## Dimension Sizes
OpenAI text-embedding-3-small uses 1536 dimensions. 
Ensure your database column matches the dimension of your model.

## Search Function
The match_documents function uses cosine distance (<=>) for high-performance ranking.
