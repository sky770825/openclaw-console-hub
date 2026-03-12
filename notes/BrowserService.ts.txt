import { chromium, Browser } from 'playwright';
import { createLogger } from '../logger.js';

const log = createLogger('browser-service');

export class BrowserService {
  private browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      log.info('啟動 Chromium 瀏覽器...');
      this.browser = await chromium.launch({ headless: true });
    }
  }

  async browse(url: string) {
    await this.init();
    const context = await this.browser!.newContext();
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