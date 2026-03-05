#!/bin/bash
# batch-index: 每個文件用獨立 node 進程，避免記憶體累積
# 用法: bash scripts/batch-index-oneshot.sh [目錄] [category]
set -euo pipefail

DIR="${1:-/Users/caijunchang/openclaw任務面版設計/cookbook}"
CATEGORY="${2:-cookbook}"
TOTAL=0
INDEXED=0
FAILED=0

echo "=== Batch Index (oneshot mode): $DIR (category=$CATEGORY) ==="

for mdfile in "$DIR"/*.md; do
  [ -f "$mdfile" ] || continue
  FILENAME=$(basename "$mdfile")
  TOTAL=$((TOTAL + 1))

  echo -n "[$TOTAL] $FILENAME ... "

  # 每個文件用獨立 node 進程
  RESULT=$(node --max-old-space-size=512 -e "
    const fs = require('fs');
    const crypto = require('crypto');

    const GOOGLE_KEY = process.env.GOOGLE_API_KEY || '';
    const SB_URL = 'https://vbejswywswaeyfasnwjq.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZWpzd3l3c3dhZXlmYXNud2pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTg4NywiZXhwIjoyMDg2MTk1ODg3fQ.VHwlh1LZ77B_IIL9tXi3UM-yJKh7LvZMirMH6wfqh_A';

    async function embed(text) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key='+GOOGLE_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
        signal: AbortSignal.timeout(30000),
      });
      const d = await r.json();
      return d?.embedding?.values ?? null;
    }

    async function upsert(row) {
      const r = await fetch(SB_URL+'/rest/v1/openclaw_embeddings', {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: 'Bearer '+SB_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(row),
        signal: AbortSignal.timeout(15000),
      });
      return r.ok;
    }

    async function main() {
      const file = '${FILENAME}';
      const cat = '${CATEGORY}';
      const content = fs.readFileSync('${mdfile}', 'utf-8');
      const titleMatch = content.match(/^# (.+)/m);
      const docTitle = titleMatch ? titleMatch[1].trim() : file.replace('.md','');

      // Parse tags
      const fm = content.match(/^---\\n([\\s\\S]*?)\\n---/);
      let tags = [];
      if (fm) { const tm = fm[1].match(/tags:\\s*\\[([^\\]]+)\\]/); if (tm) tags = tm[1].split(',').map(t => t.trim().replace(/^['\"]|['\"]$/g,'')); }

      // Chunk
      const sections = content.split(/(?=^## )/m).filter(s => s.trim().length > 30);
      const chunks = [];
      for (const sec of sections) {
        const m = sec.match(/^## (.+)/m);
        const secTitle = m ? m[1].replace(/#/g,'').trim() : '';
        const body = sec.trim();
        if (body.length <= 2000) {
          chunks.push({ text: body, title: secTitle });
        } else {
          let start = 0, subIdx = 0;
          while (start < body.length) {
            let end = start + 1600;
            if (end < body.length) {
              const b = body.lastIndexOf('\\n\\n', end);
              if (b > start + 800) end = b;
              else { const lb = body.lastIndexOf('\\n', end); if (lb > start + 500) end = lb; }
            } else end = body.length;
            const txt = body.slice(start, end).trim();
            if (txt.length > 30) {
              chunks.push({ text: txt, title: subIdx === 0 ? secTitle : secTitle+' ('+(subIdx+1)+')' });
            }
            start = Math.max(0, end - 200);
            if (start >= body.length) break;
            subIdx++;
          }
        }
      }

      if (!chunks.length) { console.log('SKIP(no chunks)'); process.exit(0); }

      // Delete old
      await fetch(SB_URL+'/rest/v1/openclaw_embeddings?file_name=eq.'+encodeURIComponent(file), {
        method: 'DELETE', headers: { apikey: SB_KEY, Authorization: 'Bearer '+SB_KEY },
        signal: AbortSignal.timeout(10000),
      }).catch(()=>{});

      let ok = 0;
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const ctx = '['+docTitle+'] ['+cat+'] ['+c.title+']';
        const vec = await embed(ctx+' '+c.text.slice(0,1200));
        if (!vec) { continue; }
        const h = crypto.createHash('md5').update('cookbook/'+file+':v2:'+i).digest('hex');
        const row = {
          id: parseInt(h.slice(0,15),16),
          doc_title: docTitle, section_title: c.title,
          content: c.text, content_preview: c.text.slice(0,200),
          file_path: 'cookbook/'+file, file_name: file,
          category: cat, chunk_index: i, chunk_total: chunks.length,
          size: c.text.length, date: new Date().toISOString().slice(0,10),
          embedding: JSON.stringify(vec),
          status: 'active', content_type: 'reference', zone: 'hot',
          is_pinned: false, indexed_at: new Date().toISOString().replace(/\\.\\d+Z$/,'Z'),
        };
        if (tags.length) row.tags = tags;
        if (await upsert(row)) ok++;
        await new Promise(r => setTimeout(r, 100));
      }
      console.log('OK:'+ok+'/'+chunks.length);
    }
    main().catch(e => { console.log('ERROR:'+e.message); process.exit(1); });
  " 2>&1)

  echo "$RESULT"

  if echo "$RESULT" | grep -q "^OK:"; then
    INDEXED=$((INDEXED + 1))
  else
    FAILED=$((FAILED + 1))
  fi

  sleep 0.2
done

echo ""
echo "=== Done! total=$TOTAL indexed=$INDEXED failed=$FAILED ==="
