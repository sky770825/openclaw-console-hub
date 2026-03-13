#!/bin/bash
set -e

# Define paths
WORKSPACE_DIR="/Users/sky770825/.openclaw/workspace/sandbox"
SERVER_DIR="$WORKSPACE_DIR/server"
SRC_DIR="$SERVER_DIR/src"
SERVICES_DIR="$SRC_DIR/services"
OUTPUT_DIR="/Users/sky770825/.openclaw/workspace/sandbox/output"
SCRIPT_PATH="/Users/sky770825/.openclaw/workspace/scripts/setup_browser_service.sh"

# Ensure directories exist
mkdir -p "$SERVICES_DIR"
mkdir -p "$OUTPUT_DIR"

echo "Initializing environment in $SERVER_DIR..."
cd "$SERVER_DIR"

# Create package.json if not exists, ensuring it's an ES module environment
if [ ! -f "package.json" ]; then
    echo '{"type": "module", "dependencies": {}}' > package.json
fi

echo "Installing playwright..."
npm install playwright --save

echo "Installing Playwright Chromium..."
npx playwright install chromium

echo "Implementing BrowserService.ts..."
cat << 'EOF' > "$SERVICES_DIR/BrowserService.ts"
import { chromium, Browser, Page, BrowserContext } from 'playwright';

/**
 * BrowserService handles web automation tasks using Playwright.
 */
export class BrowserService {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  /**
   * Captures a screenshot of the specified URL.
   */
  async takeScreenshot(url: string, outputPath: string): Promise<void> {
    const browser = await this.getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.screenshot({ path: outputPath, fullPage: true });
      console.log(`Screenshot saved to ${outputPath}`);
    } catch (error) {
      console.error(`Failed to take screenshot of ${url}:`, error);
      throw error;
    } finally {
      await context.close();
    }
  }

  /**
   * Fetches the HTML content and metadata of a page.
   */
  async getPageData(url: string): Promise<{ title: string; content: string }> {
    const browser = await this.getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const title = await page.title();
      const content = await page.content();
      return { title, content };
    } catch (error) {
      console.error(`Failed to fetch page data for ${url}:`, error);
      throw error;
    } finally {
      await context.close();
    }
  }

  /**
   * Closes the browser instance.
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const browserService = new BrowserService();
EOF

echo "Verifying environment with a test script..."
# Using .js with ES import as package.json has "type": "module"
cat << 'EOF' > verify_playwright.js
import { chromium } from 'playwright';

(async () => {
  console.log('Starting verification...');
  try {
    const browser = await chromium.launch({ headless: true });
    const version = browser.version();
    console.log(`Successfully launched Chromium (version: ${version})`);
    
    const page = await browser.newPage();
    await page.goto('about:blank');
    console.log('Successfully navigated to about:blank');
    
    await browser.close();
    console.log('Verification successful!');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
})();
EOF

node verify_playwright.js

# Copy this script to the requested scripts directory for persistence
cp $0 "$SCRIPT_PATH" 2>/dev/null || true

echo "TASK_COMPLETE: BrowserService implemented and Playwright environment verified in $SERVER_DIR"
echo "BrowserService location: $SERVICES_DIR/BrowserService.ts"
echo "Playwright version: $(npx playwright --version)"
echo "Verification script passed successfully."
echo "Created persistent script at $SCRIPT_PATH"

exit 0