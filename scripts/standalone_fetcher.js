const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Standalone version of fetchWebContent using only built-in Node.js modules.
 */
async function standaloneFetch(targetUrl) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenClawDemo/1.0)',
      }
    };

    const req = client.get(targetUrl, options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Status Code: ${res.statusCode}`));
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Simple Regex-based extraction (fallback for cheerio)
        // 1. Remove scripts and styles
        let clean = data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
        
        // 2. Extract Title
        const titleMatch = clean.match(/<title>([^<]*)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : 'Unknown Title';

        // 3. Remove all other tags
        clean = clean.replace(/<[^>]+>/g, ' ');
        
        // 4. Clean whitespace
        const text = clean.replace(/\s+/g, ' ').trim();

        resolve({
          url: targetUrl,
          title: title,
          content: text.substring(0, 1000) + (text.length > 1000 ? "..." : ""),
          fullLength: text.length
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

// Execution
const target = process.argv[2] || 'https://clawhub.ai/';
console.log(`Fetching: ${target}`);

standaloneFetch(target)
  .then(result => {
    console.log('--- FETCH SUCCESS ---');
    console.log(`Title: ${result.title}`);
    console.log(`Length: ${result.fullLength} characters`);
    console.log(`Content Preview: ${result.content}`);
    process.exit(0);
  })
  .catch(err => {
    console.error(`--- FETCH FAILED ---`);
    console.error(err.message);
    process.exit(1);
  });
