/**
 * UTF-16 safe text truncation utilities for Telegram.
 *
 * Telegram's sendMessage enforces a 4096 **UTF-16 code unit** limit
 * (not character count, not byte count). JavaScript strings are already
 * stored as UTF-16, so `str.length` returns the UTF-16 code unit count.
 *
 * Naive `.substring()` / `.slice()` can:
 *   1. Slice in the middle of a surrogate pair (emoji / 𝄞 / non-BMP CJK),
 *      producing an invalid lone surrogate that Telegram API rejects or
 *      that renders as replacement character (U+FFFD).
 *   2. Miscount length when developers assume "characters" == code units.
 *
 * These helpers guarantee:
 *   - Never split a surrogate pair.
 *   - Final string (including suffix) fits within `maxUnits` UTF-16 units.
 *
 * Reference: Hermes Agent `base.py` — `utf16_len()` + `_prefix_within_utf16_limit()`.
 */

/**
 * Returns the UTF-16 code unit length of a string.
 *
 * This is exactly what JavaScript's native `str.length` returns, but wrapping
 * it makes call sites explicit about intent (vs. "character count"). Prefer
 * this over `.length` when dealing with Telegram / IRC / other UTF-16-bounded
 * protocols so readers know the constraint is UTF-16 units, not Unicode
 * scalar values or grapheme clusters.
 *
 * @example
 *   utf16Len("hello")       // 5
 *   utf16Len("你好")        // 2   (BMP CJK = 1 unit each)
 *   utf16Len("😀")          // 2   (emoji = surrogate pair)
 *   utf16Len("a😀b")        // 4
 */
export function utf16Len(s: string): number {
  return s.length;
}

/**
 * Returns true if `code` is the high half of a UTF-16 surrogate pair
 * (U+D800..U+DBFF). A high surrogate must be followed by a low surrogate
 * (U+DC00..U+DFFF); splitting between them yields an invalid string.
 */
function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

/**
 * Safely truncates `s` to fit within `maxUnits` UTF-16 code units, optionally
 * appending `suffix` (e.g. "…" or "\n[truncated]"). Uses binary search to
 * find the largest prefix length `i` such that
 *   utf16Len(s.slice(0, i)) + utf16Len(suffix) <= maxUnits
 * and adjusts `i` down by 1 if it would land inside a surrogate pair.
 *
 * If the input already fits, `s` is returned unchanged (suffix NOT appended).
 * If `maxUnits` is smaller than the suffix itself, returns empty string.
 *
 * @param s         Source string.
 * @param maxUnits  Maximum allowed UTF-16 code units for the final output.
 * @param suffix    Optional suffix appended when truncation happens. Default ''.
 *
 * @example
 *   truncateUtf16("hello world", 5)                 // "hello"
 *   truncateUtf16("hello world", 8, "…")            // "hello w…"
 *   truncateUtf16("abc😀def", 5)                    // "abc" (not "abc\uD83D")
 *   truncateUtf16("short", 100)                     // "short" (unchanged)
 */
export function truncateUtf16(s: string, maxUnits: number, suffix: string = ''): string {
  const total = utf16Len(s);
  if (maxUnits >= total) return s;

  const suffixLen = utf16Len(suffix);
  if (maxUnits <= 0) return '';
  if (suffixLen >= maxUnits) {
    // Suffix alone won't fit — degrade gracefully.
    return suffix.length > 0 ? '' : '';
  }

  const budget = maxUnits - suffixLen;

  // Binary search for largest i in [0, total] where s.slice(0, i).length <= budget.
  // Since utf16Len(s.slice(0, i)) === i for JS strings, this is trivially i = budget.
  // We keep the explicit binary search form to mirror Hermes `_prefix_within_utf16_limit`
  // and to make the invariant obvious + robust if the length definition ever changes.
  let lo = 0;
  let hi = total;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (utf16Len(s.slice(0, mid)) <= budget) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  let i = lo;

  // Avoid splitting a surrogate pair: if the last retained unit is a high
  // surrogate, drop it (its low-surrogate partner was cut off).
  if (i > 0 && isHighSurrogate(s.charCodeAt(i - 1))) {
    i -= 1;
  }

  return s.slice(0, i) + suffix;
}

/**
 * Splits a long string into an ordered list of chunks, each within `maxUnits`
 * UTF-16 code units, without breaking surrogate pairs. Intended for sending
 * one logical message as multiple Telegram messages.
 *
 * Note: does NOT attempt to split on line/sentence/word boundaries — callers
 * that want "pretty" splits should pre-process. This helper's contract is
 * purely: every chunk is a valid UTF-16 string and concatenating all chunks
 * reproduces the input exactly.
 *
 * @param s         Source string.
 * @param maxUnits  Max UTF-16 code units per chunk. Must be >= 2 so a single
 *                  surrogate pair can always fit; values < 2 are clamped to 2.
 *
 * @example
 *   splitUtf16("abcdef", 2)       // ["ab", "cd", "ef"]
 *   splitUtf16("a😀b", 2)         // ["a", "😀", "b"]  (pair stays whole)
 *   splitUtf16("", 100)           // []
 */
export function splitUtf16(s: string, maxUnits: number): string[] {
  if (s.length === 0) return [];
  const limit = Math.max(2, Math.floor(maxUnits));
  const chunks: string[] = [];
  const total = utf16Len(s);
  let pos = 0;

  while (pos < total) {
    let end = Math.min(pos + limit, total);
    // If we'd split inside a surrogate pair, step back one unit so the
    // high surrogate moves to the next chunk (where its low surrogate is).
    if (end < total && isHighSurrogate(s.charCodeAt(end - 1))) {
      end -= 1;
    }
    // Guard: if end didn't advance (e.g. limit==1 edge case), force progress
    // by taking the full pair. `limit` is clamped to >=2 above so this
    // should not trigger, but keep defensive.
    if (end <= pos) {
      end = Math.min(pos + 2, total);
    }
    chunks.push(s.slice(pos, end));
    pos = end;
  }

  return chunks;
}
