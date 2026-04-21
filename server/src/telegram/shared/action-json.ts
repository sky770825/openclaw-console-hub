/**
 * Action JSON 解析與清理 — xiaocai + crew 共用
 * 原本 bot-polling.ts / crew-think.ts 各有一份，已統一
 */

/** 從 AI 回覆中抽出所有合法的 {"action":...} JSON 字串 */
export function extractActionJsons(text: string): string[] | null {
  const results: string[] = [];
  let searchFrom = 0;
  const stripped = text
    .replace(/`{1,3}json\s*\n?/g, '')
    .replace(/\n?\s*`{1,3}(?=\s*$|\s*\n)/gm, '');
  while (true) {
    const match = stripped.slice(searchFrom).match(/\{[\s\n]*"action"/);
    if (!match || match.index === undefined) break;
    const idx = searchFrom + match.index;
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    for (let i = idx; i < stripped.length; i++) {
      const ch = stripped[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"' && !escape) { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end > idx) {
      const candidate = stripped.slice(idx, end + 1);
      try {
        JSON.parse(candidate);
        results.push(candidate);
      } catch { /* skip */ }
      searchFrom = end + 1;
    } else {
      searchFrom = idx + 1;
    }
  }
  return results.length > 0 ? results : null;
}

/** 發送到 Telegram 前清除殘留 JSON action blocks / code fence / MiniMax tool_call */
export function stripActionJson(text: string): string {
  if (!text) return text;
  const found = extractActionJsons(text);
  if (found) {
    for (const j of found) text = text.replace(j, '');
  }
  text = text.replace(/`{1,3}json[\s\S]*?`{1,3}/g, '');
  text = text.replace(/`{1,3}\s*\{[\s\S]*?\}\s*`{1,3}/g, '');
  text = text.replace(/```\w*\n?[\s\S]*?```/g, '');
  text = text.replace(/```\w*\n[\s\S]*$/g, '');
  text = text.replace(/\{[\s\n]*"action"\s*:\s*"[^"]*"[\s\S]*?"content"\s*:\s*"[\s\S]*?"\s*\}/g, '');
  text = text.replace(/\{\s*"action"\s*:[\s\S]*?\n\s*\}/g, '');
  text = text.replace(/\{"action"[^}]*\}/g, '');
  text = text.replace(/^\s*\{[\s\S]*?"action"[\s\S]*?\}\s*$/gm, '');
  text = text.replace(/`{1,3}\s*`{1,3}/g, '');
  text = text.replace(/^\s*`{1,3}(?:json)?\s*$/gm, '');
  text = text.replace(/\[\[\[["']action["'][\s\S]*?\]\]\]/g, '');
  text = text.replace(/<minimax:tool_call>[\s\S]*?<\/minimax:tool_call>/g, '');
  text = text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '');
  text = text.replace(/<invoke[\s\S]*?<\/invoke>/g, '');
  text = text.replace(/^(curl|bash|npm|node|git|python|pip|docker|kubectl|wget|ssh|scp)\s+.+$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
