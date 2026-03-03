import { createLogger } from '../logger.js';

const log = createLogger('browser-service');

// playwright 為選配依賴，未安裝時降級為 stub
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chromium: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pw = await import('playwright' as any);
  chromium = pw.chromium;
  log.info('playwright 已載入，BrowserService 啟用');
} catch {
  log.warn('playwright 未安裝，BrowserService 降級為 stub（功能停用）');
}

export interface BrowseResult {
  title: string;
  text: string;       // 純文字（去掉 HTML 標籤）
  url: string;        // 最終 URL（跟蹤重導向後）
  truncated: boolean; // 超過 8000 字時截斷
}

export class BrowserService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private browser: any = null;

  isAvailable(): boolean {
    return chromium !== null;
  }

  async init() {
    if (!chromium) throw new Error('playwright 未安裝，請執行 cd server && npm install playwright && npx playwright install chromium');
    if (!this.browser) {
      log.info('啟動 Chromium 瀏覽器...');
      this.browser = await chromium.launch({ headless: true });
    }
  }

  async browse(url: string, maxChars = 8000): Promise<BrowseResult> {
    await this.init();
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    try {
      log.info({ url }, '正在訪問網頁...');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const title = await page.title();
      const finalUrl = page.url();

      // 萃取純文字：移除 script/style，保留正文
      const text: string = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script, style, noscript, nav, footer, header');
        scripts.forEach(el => el.remove());
        return (document.body?.innerText || document.body?.textContent || '')
          .replace(/\s{3,}/g, '\n\n')
          .trim();
      });

      const truncated = text.length > maxChars;
      return {
        title,
        text: truncated ? text.slice(0, maxChars) + '\n\n[... 內容過長，已截斷]' : text,
        url: finalUrl,
        truncated,
      };
    } finally {
      await context.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const browserService = new BrowserService();
