import { WebContentFetcher } from './webContentFetcher';

async function runTest() {
    const testUrl = process.argv[2] || 'https://clawhub.ai/';
    console.log(`--- Testing WebContentFetcher with: ${testUrl} ---`);

    try {
        const text = await WebContentFetcher.fetchContent(testUrl);
        console.log('--- Extracted Text (First 500 chars) ---');
        console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        console.log('\n--- Total Length:', text.length, 'characters ---');
        
        // Save output for verification
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join('/Users/caijunchang/.openclaw/workspace/sandbox/output', 'test_result.txt');
        fs.writeFileSync(outputPath, text);
        console.log(`\nFull result saved to: ${outputPath}`);

    } catch (error: any) {
        console.error('Test Failed:', error.message);
        process.exit(1);
    }
}

runTest();
