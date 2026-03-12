import { BrowserService } from '../sandbox/module-space-browser/src/BrowserService';
import * as path from 'path';

async function main() {
  const browserService = new BrowserService();
  const testUrl = 'https://example.com';
  const screenshotPath = path.join(__dirname, '../reports/example_screenshot.png');

  console.log('Starting BrowserService validation...');
  
  try {
    console.log(`Fetching HTML from ${testUrl}...`);
    const html = await browserService.getHtmlContent(testUrl);
    console.log(`HTML length: ${html.length} bytes`);

    console.log(`Taking screenshot and saving to ${screenshotPath}...`);
    await browserService.takeScreenshot(testUrl, screenshotPath);
    
    console.log('Validation successful.');
  } catch (error) {
    console.error('Validation failed:', error);
  } finally {
    await browserService.close();
  }
}

main();
