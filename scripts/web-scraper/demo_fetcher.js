const https = require('https');
const http = require('http');

/**
 * A simplified version of the fetcher using native Node.js modules
 * to demonstrate the logic in the sandbox.
 */
async function simpleFetch(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, {
      headers: { 'User-Agent': 'OpenClaw-Demo' },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Simple regex-based tag removal for demonstration
        const titleMatch = data.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : 'No Title';
        
        // Remove script and style tags
        let text = data.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
        // Remove all other HTML tags
        text = text.replace(/<[^>]+>/g, ' ');
        // Clean whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        resolve({
          url,
          title,
          contentPreview: text.substring(0, 500) + '...'
        });
      });
    });
    
    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

const target = process.argv[2] || 'https://example.com';
console.log(`Fetching: ${target}`);

simpleFetch(target)
  .then(res => {
    console.log('--- FETCH SUCCESS ---');
    console.log('Title:', res.title);
    console.log('Preview:', res.contentPreview);
    process.exit(0);
  })
  .catch(err => {
    console.error('--- FETCH FAILED ---');
    console.error(err.message);
    process.exit(1);
  });
