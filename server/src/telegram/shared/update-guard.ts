/**
 * Update Guard — Telegram polling 健壯性補丁
 *
 * 1. dedupe(updateId)         — 防止 Telegram 重送同一 update_id 重觸發
 * 2. withTimeout(promise, ms) — 單一 update 處理上限，避免堵住整個 polling loop
 *
 * 這兩件事是 grammY / Telegraf / python-telegram-bot 都已內建的基本盤，
 * 我們手刻 polling loop 缺少這層保護，是「Telegram 回覆不順」的主因之一。
 */

const DEDUPE_TTL_MS = 30 * 60 * 1000;
const seenUpdates = new Map<number, number>();

let lastSweep = 0;

export function isDuplicateUpdate(updateId: number): boolean {
  const now = Date.now();

  if (now - lastSweep > 60_000) {
    for (const [id, ts] of seenUpdates) {
      if (now - ts > DEDUPE_TTL_MS) seenUpdates.delete(id);
    }
    lastSweep = now;
  }

  if (seenUpdates.has(updateId)) return true;
  seenUpdates.set(updateId, now);
  return false;
}

export class UpdateTimeoutError extends Error {
  constructor(public readonly ms: number) {
    super(`update handler exceeded ${ms}ms`);
    this.name = 'UpdateTimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new UpdateTimeoutError(ms)), ms);
    promise.then(
      v => { clearTimeout(t); resolve(v); },
      e => { clearTimeout(t); reject(e); },
    );
  });
}
