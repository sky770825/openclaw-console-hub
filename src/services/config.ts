/**
 * 資料層設定
 * - 有 VITE_API_BASE_URL 時用該網址
 * - 否則用當前 origin（開發時 Vite proxy 會將 /api 轉發至後端 localhost:3001）
 * - 若指向同 origin 會改用當前 origin，以配合 proxy
 */
const envBaseUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL;
let base = typeof envBaseUrl === 'string' && envBaseUrl.trim() ? envBaseUrl.trim().replace(/\/$/, '') : '';
if (base && typeof window !== 'undefined' && window.location?.origin) {
  try {
    const url = new URL(base);
    if (url.origin === window.location.origin) base = ''; // 同 origin 用相對路徑，配合 proxy
  } catch {
    base = '';
  }
}
// 無設定時用當前 origin，讓 /api 經 proxy 轉發至後端
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
