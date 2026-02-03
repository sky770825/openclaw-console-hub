/**
 * 資料層設定
 * - 之後接真實 API 時可在此切換或設定 baseURL
 */
export const dataConfig = {
  /** 模擬網路延遲（毫秒），0 = 無延遲，避免介面卡頓 */
  mockDelayMs: 0,
};

const delay = (ms: number) =>
  ms <= 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));

/** 可選延遲，用於開發時模擬慢速網路 */
export const optionalDelay = () => delay(dataConfig.mockDelayMs);
