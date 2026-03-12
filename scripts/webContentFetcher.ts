import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

/**
 * Interface for the fetch result
 */
export interface FetchResult {
  success: boolean;
  url: string;
  title?: string;
  content?: string;
  error?: string;
  statusCode?: number;
}

/**
 * WebContentFetcher - A utility to safely fetch and extract main text content from a URL.
 */
export class WebContentFetcher {
  private static readonly TIMEOUT = 10000; // 10 seconds
  private static readonly MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB limit for safety
  private static readonly USER_AGENT = 'OpenClawContentBot/1.0 (+https://github.com/openclaw)';

  /**
   * Main function to fetch content
   * @param targetUrl The URL to fetch content from
   */
  public static async fetchWebContent(targetUrl: string): Promise<FetchResult> {
    try {
      // 1. Security check: Validate URL and protocol
      const validatedUrl = this.validateUrl(targetUrl);
      
      // 2. Perform HTTP request
      const response = await axios.get(validatedUrl, {
        timeout: this.TIMEOUT,
        maxContentLength: this.MAX_CONTENT_LENGTH,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const html = response.data;
      if (typeof html !== 'string') {
        throw new Error('Received non-string content from target URL');
      }

      // 3. Extract and Clean Content
      const result = this.extractMainContent(html);

      return {
        success: true,
        url: validatedUrl,
        title: result.title,
        content: result.text,
        statusCode: response.status
      };

    } catch (error: any) {
      return {
        success: false,
        url: targetUrl,
        error: error.message || 'Unknown error occurred during fetching',
        statusCode: error.response?.status
      };
    }
  }

  /**
   * Validates the URL and ensures it uses safe protocols
   */
  private static validateUrl(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only HTTP and HTTPS protocols are allowed.');
      }
      return parsed.toString();
    } catch (e: any) {
      throw new Error(`Invalid URL: ${e.message}`);
    }
  }

  /**
   * Intelligently extracts the main text from HTML using Cheerio
   */
  private static extractMainContent(html: string): { title: string; text: string } {
    const $ = cheerio.load(html);

    // Get Title
    const title = $('title').text().trim() || $('h1').first().text().trim();

    // Remove noise: scripts, styles, nav, footers, ads
    $('script, style, noscript, iframe, nav, footer, header, aside, .ads, #ads, .footer, .header, .nav, .sidebar, .menu').remove();

    // Focus on potential main content areas
    let contentSelector = 'article, main, .content, .post, .article, body';
    let mainContent = '';

    // Extract text from the body (after noise removal)
    // We iterate through block elements to preserve some structure in plain text
    const textBlocks: string[] = [];
    
    // Try to find the most specific content container first
    const containers = $('article, main, [role="main"]');
    const target = containers.length > 0 ? containers : $('body');

    target.find('h1, h2, h3, h4, h5, h6, p, li, blockquote').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 0) {
        textBlocks.push(text);
      }
    });

    // Fallback if no specific tags found
    if (textBlocks.length === 0) {
      mainContent = target.text().replace(/\s+/g, ' ').trim();
    } else {
      mainContent = textBlocks.join('\n\n');
    }

    return {
      title,
      text: mainContent
    };
  }
}
