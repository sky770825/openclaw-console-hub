import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'playwright/test';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    testDir: path.join(ROOT, 'e2e'),
    timeout: 90 * 1000,
    expect: {
        timeout: 10 * 1000
    },
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [
        ['list'],
        ['html', { outputFolder: path.join(ROOT, 'playwright-report'), open: 'never' }]
    ],
    outputDir: path.join(ROOT, 'test-results'),
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    webServer: {
        command: 'python3 -m http.server 4173 --bind 127.0.0.1',
        cwd: ROOT,
        url: 'http://127.0.0.1:4173/index.html',
        reuseExistingServer: !process.env.CI,
        timeout: 30 * 1000
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' }
        }
    ]
});
