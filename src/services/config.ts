/**
 * 資料層設定
 * - 有 VITE_API_BASE_URL 時用該網址
 * - 否則用當前 origin（開發時 Vite proxy 會將 /api 轉發至後端 localhost:3011）
 * - 若指向同 origin 會改用當前 origin，以配合 proxy
 */
const envBaseUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL;
let base = typeof envBaseUrl === 'string' && envBaseUrl.trim() ? envBaseUrl.trim().replace(/\/$/, '') : '';

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

if (base && typeof window !== 'undefined' && window.location?.origin) {
  try {
    const url = new URL(base);
    const cur = new URL(window.location.origin);
    const sameOrigin = url.origin === cur.origin;
    // Treat loopback aliases as "same" to avoid CSP blocking (localhost vs 127.0.0.1).
    const sameLoopback =
      url.protocol === cur.protocol &&
      url.port === cur.port &&
      isLoopbackHost(url.hostname) &&
      isLoopbackHost(cur.hostname);
    if (sameOrigin || sameLoopback) base = window.location.origin; // 同源/同 loopback 一律改用當前 origin
  } catch {
    base = '';
  }
}
// 無設定時用當前 origin（同源），避免 CSP 因 localhost/127.0.0.1 不一致而擋連線。
if (!base && typeof window !== 'undefined' && window.location?.origin) {
  base = window.location.origin;
}
export const dataConfig = {
  /** API 根網址，有值時使用真實後端，否則用 localStorage mock */
  apiBaseUrl: base,
  /** 模擬網路延遲（毫秒），0 = 無延遲 */
  mockDelayMs: 0,
};

const delay = (ms: number) =>
  ms <= 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));

/** 可選延遲，用於開發時模擬慢速網路 */
export const optionalDelay = () => delay(dataConfig.mockDelayMs);
