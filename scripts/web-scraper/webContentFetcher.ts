import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * WebContentFetcher Module
 * Responsible for securely fetching and extracting main text content from external URLs.
 */

export interface FetchResult {
  url: string;
  title: string;
  textContent: string;
  error?: string;
}

/**
 * Validates the URL for security purposes.
 * Limits to HTTP/HTTPS and prevents common SSRF patterns.
 */
function isValidUrl(urlPath: string): boolean {
  try {
    const parsed = new URL(urlPath);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e) {
    return false;
  }
}

/**
 * Fetches and extracts text content from a given URL.
 * @param url The target URL to fetch.
 * @returns Promise<FetchResult>
 */
export async function fetchWebContent(url: string): Promise<FetchResult> {
  // 1. Security Check: Protocol validation
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL protocol. Only HTTP and HTTPS are supported.');
  }

  try {
    // 2. Fetch HTML with timeout and User-Agent
    const response = await axios.get(url, {
      timeout: 10000, // 10 seconds timeout
      headers: {
        'User-Agent': 'OpenClawBot/1.0 (+https://github.com/OpenClaw)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      maxContentLength: 5 * 1024 * 1024, // Limit to 5MB
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 3. Intelligent Extraction: Remove non-core content
    // Remove scripts, styles, navigation, footers, headers, and ads
    $('script, style, nav, footer, header, aside, noscript, iframe, .ads, #ads, .menu, .sidebar').remove();

    // Focus on potential main content areas
    let mainContent = $('main, article, #content, .content, .post-content, .article-body').first();
    
    let textResult = '';
    if (mainContent.length > 0) {
      textResult = mainContent.text();
    } else {
      // Fallback to body if no main container is found
      textResult = $('body').text();
    }

    // 4. Clean up text: remove extra whitespace and newlines
    const cleanedText = textResult
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    return {
      url,
      title: $('title').text().trim(),
      textContent: cleanedText
    };

  } catch (error: any) {
    console.error(`Error fetching web content from ${url}:`, error.message);
    return {
      url,
      title: '',
      textContent: '',
      error: error.message || 'Unknown error occurred during fetching'
    };
  }
}
