/**
 * 本地 pgvector 客戶端
 * 取代 Supabase 的 openclaw_embeddings 操作，直連本地 PostgreSQL + pgvector
 */
import pg from 'pg';
import { createLogger } from './logger.js';

const log = createLogger('pgvector');

const pool = new pg.Pool({
  connectionString: process.env.LOCAL_PG_URL || 'postgresql://openclaw:openclaw_local@127.0.0.1:5433/openclaw',
  max: 10,
  idleTimeoutMillis: 30000,
});

let _connected = false;

export async function hasPgvector(): Promise<boolean> {
  if (_connected) return true;
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    _connected = true;
    log.info('[pgvector] 本地 PostgreSQL 連線成功');
    return true;
  } catch (err) {
    log.warn(`[pgvector] 本地 PostgreSQL 連線失敗: ${(err as Error).message}`);
    return false;
  }
}

export async function deleteByFilePath(filePath: string): Promise<{ error: any }> {
  try {
    await pool.query('DELETE FROM openclaw_embeddings WHERE file_path = $1', [filePath]);
    return { error: null };
  } catch (err) { return { error: err }; }
}

export async function deleteAll(): Promise<{ error: any }> {
  try {
    await pool.query('DELETE FROM openclaw_embeddings');
    return { error: null };
  } catch (err) { return { error: err }; }
}

export async function upsertEmbedding(row: Record<string, any>): Promise<{ error: any }> {
  try {
    const embedding = typeof row.embedding === 'string' ? row.embedding : JSON.stringify(row.embedding);
    const tags = row.tags && Array.isArray(row.tags) ? row.tags : null;
    await pool.query(
      `INSERT INTO openclaw_embeddings (
        id, doc_title, section_title, content, content_preview,
        file_path, file_name, category, chunk_index, chunk_total,
        size, date, embedding, status, content_type, zone, is_pinned, indexed_at, tags
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (id) DO UPDATE SET
        doc_title=EXCLUDED.doc_title, section_title=EXCLUDED.section_title,
        content=EXCLUDED.content, content_preview=EXCLUDED.content_preview,
        file_path=EXCLUDED.file_path, file_name=EXCLUDED.file_name,
        category=EXCLUDED.category, chunk_index=EXCLUDED.chunk_index,
        chunk_total=EXCLUDED.chunk_total, size=EXCLUDED.size, date=EXCLUDED.date,
        embedding=EXCLUDED.embedding, status=EXCLUDED.status,
        content_type=EXCLUDED.content_type, zone=EXCLUDED.zone,
        is_pinned=EXCLUDED.is_pinned, indexed_at=EXCLUDED.indexed_at, tags=EXCLUDED.tags`,
      [row.id, row.doc_title, row.section_title, row.content, row.content_preview,
       row.file_path, row.file_name, row.category, row.chunk_index ?? 0, row.chunk_total ?? 1,
       row.size ?? 0, row.date, embedding, row.status ?? 'active',
       row.content_type ?? 'reference', row.zone ?? 'hot', row.is_pinned ?? false,
       row.indexed_at ?? new Date().toISOString(), tags]);
    return { error: null };
  } catch (err) { return { error: err }; }
}

export async function matchEmbeddings(
  queryEmbedding: number[], matchThreshold: number = 0.45,
  matchCount: number = 10, _searchMode: string = 'task',
): Promise<{ data: any[] | null; error: any }> {
  try {
    const vecStr = `[${queryEmbedding.join(',')}]`;
    const { rows } = await pool.query(
      `SELECT id, doc_title, section_title, content, content_preview,
              file_path, file_name, category, chunk_index, chunk_total,
              zone, is_pinned, indexed_at,
              1 - (embedding <=> $1::vector) AS similarity
       FROM openclaw_embeddings WHERE status = 'active'
         AND 1 - (embedding <=> $1::vector) > $2
       ORDER BY embedding <=> $1::vector LIMIT $3`,
      [vecStr, matchThreshold, matchCount]);
    return { data: rows, error: null };
  } catch (err) { return { data: null, error: err }; }
}

export async function textSearch(
  keywords: string[], limit: number = 10,
): Promise<{ data: any[] | null; error: any }> {
  if (!keywords.length) return { data: [], error: null };
  try {
    const conditions: string[] = [];
    const params: string[] = [];
    let idx = 1;
    for (const kw of keywords) {
      conditions.push(`content ILIKE $${idx} OR doc_title ILIKE $${idx} OR section_title ILIKE $${idx}`);
      params.push(`%${kw}%`);
      idx++;
    }
    const whereClause = conditions.map(c => `(${c})`).join(' OR ');
    const { rows } = await pool.query(
      `SELECT id, doc_title, section_title, content, content_preview,
              file_path, file_name, category, chunk_index, chunk_total,
              zone, is_pinned, indexed_at
       FROM openclaw_embeddings WHERE ${whereClause} LIMIT $${idx}`,
      [...params, limit]);
    return { data: rows, error: null };
  } catch (err) { return { data: null, error: err }; }
}

export async function getDetailChunks(
  filePaths: string[], limit: number = 20,
): Promise<{ data: any[] | null; error: any }> {
  if (!filePaths.length) return { data: [], error: null };
  try {
    const placeholders = filePaths.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `SELECT id, doc_title, section_title, content, content_preview,
              file_path, file_name, category, chunk_index, chunk_total,
              zone, is_pinned, indexed_at
       FROM openclaw_embeddings
       WHERE file_path IN (${placeholders}) AND chunk_index >= 0 AND status = 'active'
       ORDER BY chunk_index ASC LIMIT $${filePaths.length + 1}`,
      [...filePaths, limit]);
    return { data: rows, error: null };
  } catch (err) { return { data: null, error: err }; }
}

export async function closePgvector(): Promise<void> {
  await pool.end();
  _connected = false;
}
