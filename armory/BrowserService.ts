import { chromium, Browser, Page, ScreenshotOptions } from 'playwright';

export interface ScrapeOptions {
    url: string;
    htmlSelectors?: Record<string, string>;
    textSelectors?: Record<string, string>;
    waitForSelector?: string;
    delay?: number;
    viewport?: { width: number; height: number; };
}

export interface ScrapeResult {
    fullHtml?: string;
    fullText?: string;
    selectedHtml?: Record<string, string | null>;
    selectedText?: Record<string, string | null>;
    error?: string;
}

export class BrowserService {
    private browser: Browser | null = null;

    async init() {
        if (!this.browser) {
            this.browser = await chromium.launch({ headless: true });
        }
    }

    async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
        await this.init();
        const page = await this.browser!.newPage();
        if (options.viewport) await page.setViewportSize(options.viewport);

        try {
            await page.goto(options.url, { waitUntil: 'networkidle' });
            if (options.waitForSelector) await page.waitForSelector(options.waitForSelector);
            if (options.delay) await page.waitForTimeout(options.delay);

            const result: ScrapeResult = {
                fullHtml: await page.content(),
                fullText: await page.innerText('body'),
            };

            if (options.htmlSelectors) {
                result.selectedHtml = {};
                for (const [key, selector] of Object.entries(options.htmlSelectors)) {
                    result.selectedHtml[key] = await page.$eval(selector, el => el.innerHTML).catch(() => null);
                }
            }

            return result;
        } catch (e: any) {
            return { error: e.message };
        } finally {
            await page.close();
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}