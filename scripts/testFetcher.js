const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

// Mocking the function logic for testing
async function fetchWebContent(targetUrl) {
  console.log(`[Test] Fetching: ${targetUrl}`);
  try {
    const response = await axios.get(targetUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'OpenClawTest/1.0' }
    });
    const $ = cheerio.load(response.data);
    $('script, style, nav, footer, header').remove();
    let text = $('body').text();
    return text.replace(/\s+/g, ' ').trim().substring(0, 500) + '...';
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function run() {
  const testUrl = 'https://clawhub.ai/';
  try {
    const content = await fetchWebContent(testUrl);
    console.log('--- Content Preview ---');
    console.log(content);
    console.log('--- End Preview ---');
  } catch (err) {
    console.error(err);
  }
}

run();
