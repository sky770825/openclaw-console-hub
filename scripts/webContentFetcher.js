const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * Safely fetches and extracts the main text content from a given URL.
 * @param {string} targetUrl - The URL to fetch.
 * @returns {Promise<string>} - The extracted plain text content.
 */
async function fetchWebContent(targetUrl) {
    try {
        // 1. URL Validation and Security Check
        const parsedUrl = new URL(targetUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new Error('Invalid protocol. Only HTTP and HTTPS are supported.');
        }

        // 2. Fetch Content with timeout and headers to prevent some anti-bot measures
        const response = await axios.get(targetUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'OpenClaw-Fetcher/1.0 (Mozilla/5.0; compatible; OpenClawBot/1.0; +https://clawhub.ai)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            maxRedirects: 5
        });

        if (typeof response.data !== 'string') {
            throw new Error('Response content is not a string (HTML).');
        }

        // 3. Intelligent Extraction using Cheerio
        const $ = cheerio.load(response.data);

        // Remove non-essential elements
        $('script, style, nav, footer, header, noscript, iframe, svg, link, meta, .ads, #ads, .menu, .sidebar').remove();

        // Strategy: Look for common article containers first
        let mainContent = '';
        const selectors = [
            'article', 
            'main', 
            '[role="main"]', 
            '.post-content', 
            '.article-content', 
            '.entry-content',
            '#content',
            '.content'
        ];

        for (const selector of selectors) {
            const element = $(selector);
            if (element.length > 0) {
                // Take the one with the most text if multiple found
                let bestMatch = element.first();
                if (element.length > 1) {
                    element.each((i, el) => {
                        if ($(el).text().length > bestMatch.text().length) {
                            bestMatch = $(el);
                        }
                    });
                }
                mainContent = bestMatch.text();
                break;
            }
        }

        // Fallback to body if no specific container found
        if (!mainContent || mainContent.trim().length < 100) {
            mainContent = $('body').text();
        }

        // 4. Post-processing: Clean up whitespace and newlines
        const cleanedText = mainContent
            .replace(/\n\s*\n/g, '\n') // Remove excessive empty lines
            .replace(/[ \t]+/g, ' ')    // Collapse multiple spaces
            .trim();

        return cleanedText;

    } catch (error) {
        if (error.response) {
            throw new Error(`Failed to fetch URL: ${error.response.status} ${error.response.statusText}`);
        } else if (error.request) {
            throw new Error('Network error: No response received from target host.');
        } else {
            throw new Error(`Fetcher Error: ${error.message}`);
        }
    }
}

// Support for CLI testing
if (require.main === module) {
    const url = process.argv[2];
    if (!url) {
        console.error('Usage: node webContentFetcher.js <URL>');
        process.exit(1);
    }

    fetchWebContent(url)
        .then(content => {
            console.log(content);
        })
        .catch(err => {
            console.error(err.message);
            process.exit(1);
        });
}

module.exports = { fetchWebContent };
