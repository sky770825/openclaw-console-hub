import { createLogger } from '../logger.js';

const log = createLogger('browser-service');

// playwright 為選配依賴，未安裝時降級為 stub
let chromium: { launch: (opts: object) => Promise<unknown> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pw = await import('playwright' as any);
  chromium = pw.chromium;
} catch {
  log.warn('playwright 未安裝，BrowserService 降級為 stub（功能停用）');
}

export class BrowserService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private browser: any = null;

  async init() {
    if (!chromium) throw new Error('playwright 未安裝，請執行 npm install playwright');
    if (!this.browser) {
      log.info('啟動 Chromium 瀏覽器...');
      this.browser = await chromium.launch({ headless: true });
    }
  }

  async browse(url: string) {
    await this.init();
    const context = await this.browser.newContext();
    const page = await context.newPage();
    try {
      log.info({ url }, '正在訪問網頁...');
      await page.goto(url, { waitUntil: 'networkidle' });
      const content = await page.content();
      const title = await page.title();
      return { title, content };
    } finally {
      await context.close();
    }
  }
}

export const browserService = new BrowserService();
