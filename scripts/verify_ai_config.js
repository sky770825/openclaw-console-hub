const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Simulated config - in reality these would come from process.env
const config = {
    proxy: process.env.HTTPS_PROXY || process.env.http_proxy || null,
    apiBase: 'https://api.openai.com/v1',
    model: 'gpt-4-turbo'
};

async function testAI() {
    console.log('--- AI Configuration Test ---');
    console.log('Proxy:', config.proxy);
    
    const axiosConfig = {
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'MISSING'}`
        }
    };

    if (config.proxy) {
        console.log('Applying HttpsProxyAgent...');
        axiosConfig.httpsAgent = new HttpsProxyAgent(config.proxy);
        // Important fix: When using agent, don't let axios use its own proxy logic
        axiosConfig.proxy = false;
    }

    try {
        console.log('Sending test request to AI...');
        // We use a simple models list check instead of a completion to save quota/time
        const response = await axios.get(`${config.apiBase}/models`, axiosConfig);
        console.log('Success! Status:', response.status);
    } catch (error) {
        console.error('Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error Message:', error.message);
        }
        
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
            console.error('\nPROBABLE CAUSE: Proxy configuration error. The proxy URL might be unreachable or incorrect.');
        }
    }
}

testAI();
