/**
 * Classifies whether the user message is "casual chat" (greeting/small talk)
 * so the gateway can use a light bootstrap instead of full context.
 *
 * When casual: no MEMORY, TOOLS, HEARTBEAT, full AGENTS — save token.
 * When not: full bootstrap; can memory_search, write MEMORY, use tools.
 */

const DEFAULT_CASUAL_MAX_LENGTH = 80;

/** Patterns that suggest casual greeting/small talk (one of these may match). */
const CASUAL_PATTERNS = [
  /^(你好|嗨|哈囉|嘿|在嗎|在嘛)\s*[!！。.]?$/i,
  /^(早安|早啊|午安|晚安)\s*[!！。.]?$/i,
  /^(hi|hello|hey|yo)\s*[!.]?$/i,
  /^(嗯|好喔|好呀|好|ok|okay)\s*[!！。.]?$/i,
  /^(再見|bye|掰)\s*[!！。.]?$/i,
  /^(謝啦|謝謝|thanks|thx)\s*[!！。.]?$/i,
  /^[\s\p{P}\p{S}]*$/u, // only punctuation/whitespace/emoji
];

/** Patterns that force "full" mode (task / memory / topic). */
const TASK_OR_MEMORY_PATTERNS = [
  /記下來|幫我記|寫進\s*MEMORY|記住|這個要記|記一下/i,
  /幫我|請你|執行|查一下|看一下|檢查|設定|幫我寫|幫我找|幫我查/i,
  /上週|上次|之前|討論|那個點子|記得嗎/i,
];

export type CasualChatClassifierOptions = {
  /** Max trimmed length to consider as casual (default 80). */
  maxLength?: number;
  /** Disable task/memory pattern check. */
  skipTaskCheck?: boolean;
};

/** Strip common metadata lines; return body and optionally the last "user" line (often the actual message). */
function extractBodyForClassification(text: string): { body: string; lastLine: string } {
  const lines = (text ?? "").split(/\n/).map((l) => l.trim()).filter(Boolean);
  const bodyLines = lines.filter((line) => {
    if (/^\[message_id:\s*.+\]$/i.test(line)) return false;
    if (/^\[.+\]$/.test(line) && line.length < 80) return false;
    return true;
  });
  const body = bodyLines.join(" ").trim() || (text ?? "").trim();
  const lastLine = bodyLines.length > 0 ? bodyLines[bodyLines.length - 1]! : body;
  return { body, lastLine };
}

/** Casual patterns that can appear at end of line (e.g. "• 你好" or "xxx 你好"). */
const CASUAL_END_PATTERNS = [
  /\s*(你好|嗨|哈囉|嘿|在嗎)\s*[!！。.]?$/i,
  /\s*(早安|早啊|午安|晚安)\s*[!！。.]?$/i,
  /\s*(hi|hello|hey|yo)\s*[!.]?$/i,
  /\s*(嗯|好喔|好呀|好|ok|okay)\s*[!！。.]?$/i,
];

/**
 * Returns true if the message looks like casual chat (greeting/small talk)
 * and does not contain task/memory triggers. Use this to choose light bootstrap.
 * Handles prompts that include metadata lines (e.g. [message_id: ...]) by checking the body only.
 */
export function isCasualChat(
  text: string | undefined,
  options?: CasualChatClassifierOptions,
): boolean {
  const raw = (text ?? "").trim();
  const { body, lastLine } = extractBodyForClassification(raw);
  const trimmed = body || raw;
  if (!trimmed) {
    return true; // empty → treat as casual, minimal reply
  }

  const maxLength = options?.maxLength ?? DEFAULT_CASUAL_MAX_LENGTH;
  if (trimmed.length > maxLength) {
    return false; // long message → assume topic/task
  }

  if (!options?.skipTaskCheck) {
    for (const re of TASK_OR_MEMORY_PATTERNS) {
      if (re.test(trimmed) || re.test(lastLine)) {
        return false; // task/memory trigger → full context
      }
    }
  }

  for (const re of CASUAL_PATTERNS) {
    if (re.test(trimmed) || re.test(lastLine)) {
      return true; // matches casual pattern
    }
  }
  for (const re of CASUAL_END_PATTERNS) {
    if (re.test(trimmed) || re.test(lastLine)) {
      return true; // e.g. "• 你好" or last line is "你好"
    }
  }

  // Not matched → use full context to be safe
  return false;
}
