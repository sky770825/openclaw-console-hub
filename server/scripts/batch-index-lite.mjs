#!/usr/bin/env node
/**
 * 輕量 batch-index — 純 Node.js，不 import server 代碼
 * 用法: node scripts/batch-index-lite.mjs [目錄] [category]
 */
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';

const DIR = process.argv[2] || '/Users/caijunchang/openclaw任務面版設計/cookbook';
const CATEGORY = process.argv[3] || 'cookbook';
const GOOGLE_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyDGHy3xWJ91GaSwB9Si6rsUWdA58vJoX6w';
const SB_URL = 'https://vbejswywswaeyfasnwjq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZWpzd3l3c3dhZXlmYXNud2pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTg4NywiZXhwIjoyMDg2MTk1ODg3fQ.VHwlh1LZ77B_IIL9tXi3UM-yJKh7LvZMirMH6wfqh_A';

const TARGET_CHARS = 1600;
const MAX_CHARS = 2000;
const OVERLAP = 200;

async function googleEmbed(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_KEY}`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
      signal: AbortSignal.timeout(30000),
    });
    const d = await r.json();
    return d?.embedding?.values ?? null;
  } catch (e) {
    console.error(`  embed error: ${e.message}`);
    return null;
  }
}

async function sbDelete(fileName) {
  try {
    await fetch(`${SB_URL}/rest/v1/openclaw_embeddings?file_name=eq.${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch {}
}

async function sbUpsert(row) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/openclaw_embeddings`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      const t = await r.text();
      return [false, t.slice(0, 200)];
    }
    return [true, ''];
  } catch (e) {
    return [false, e.message];
  }
}

function parseTags(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return [];
  const tm = m[1].match(/tags:\s*\[([^\]]+)\]/);
  if (!tm) return [];
  return tm[1].split(',').map(t => t.trim().replace(/^['"]|['"]$/g, ''));
}

function chunkDocument(content) {
  const sections = content.split(/(?=^## )/m).filter(s => s.trim().length > 30);
  const chunks = [];
  for (const sec of sections) {
    const m = sec.match(/^## (.+)/m);
    const secTitle = m ? m[1].replace(/#/g, '').trim() : '';
    const body = sec.trim();
    if (body.length <= MAX_CHARS) {
      chunks.push({ text: body, title: secTitle });
    } else {
      let start = 0, subIdx = 0;
      while (start < body.length) {
        let end = start + TARGET_CHARS;
        if (end < body.length) {
          const boundary = body.lastIndexOf('\n\n', end);
          if (boundary > start + TARGET_CHARS * 0.5) end = boundary;
          else {
            const lb = body.lastIndexOf('\n', end);
            if (lb > start + TARGET_CHARS * 0.3) end = lb;
          }
        } else {
          end = body.length;
        }
        const txt = body.slice(start, end).trim();
        if (txt.length > 30) {
          const t = subIdx === 0 ? secTitle : `${secTitle} (${subIdx + 1})`;
          chunks.push({ text: txt, title: t });
        }
        start = Math.max(0, end - OVERLAP);
        if (start >= body.length) break;
        subIdx++;
      }
    }
  }
  return chunks;
}

// Main
const files = readdirSync(DIR).filter(f => f.endsWith('.md')).sort();
const total = files.length;
let indexed = 0, failed = 0;

console.log(`=== Batch Index: ${DIR} (${total} files, category=${CATEGORY}) ===`);

for (const file of files) {
  const filepath = join(DIR, file);
  const content = readFileSync(filepath, 'utf-8');

  const titleMatch = content.match(/^# (.+)/m);
  const docTitle = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');
  const tags = parseTags(content);
  const chunks = chunkDocument(content);

  if (!chunks.length) {
    console.log(`SKIP: ${file} (no chunks)`);
    failed++;
    continue;
  }

  // Delete old
  await sbDelete(file);

  let okCount = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const ctx = `[${docTitle}] [${CATEGORY}] [${chunk.title}]`;
    const embedText = `${ctx} ${chunk.text.slice(0, 1200)}`;

    const vector = await googleEmbed(embedText);
    if (!vector) {
      console.log(`  FAIL embed: ${file} chunk-${i}`);
      continue;
    }

    const h = createHash('md5').update(`cookbook/${file}:v2:${i}`).digest('hex');
    const pointId = parseInt(h.slice(0, 15), 16);

    const row = {
      id: pointId,
      doc_title: docTitle,
      section_title: chunk.title,
      content: chunk.text,
      content_preview: chunk.text.slice(0, 200),
      file_path: `cookbook/${file}`,
      file_name: file,
      category: CATEGORY,
      chunk_index: i,
      chunk_total: chunks.length,
      size: chunk.text.length,
      date: new Date().toISOString().slice(0, 10),
      embedding: JSON.stringify(vector),
      status: 'active',
      content_type: 'reference',
      zone: 'hot',
      is_pinned: false,
      indexed_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    };
    if (tags.length) row.tags = tags;

    const [ok, err] = await sbUpsert(row);
    if (ok) okCount++;
    else console.log(`  FAIL upsert: ${file} chunk-${i}: ${err}`);

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  if (okCount > 0) {
    indexed++;
    console.log(`OK: ${file} (${okCount}/${chunks.length} chunks)`);
  } else {
    failed++;
    console.log(`FAIL: ${file} (0 chunks indexed)`);
  }
}

console.log(`\n=== Done! total=${total} indexed=${indexed} failed=${failed} ===`);
