import http from 'http';

const testGraph = {
  name: 'test-studio-skill',
  nodes: [
    { name: 'On Message', type: 'trigger', params: { pattern: 'hello' } },
    { name: 'Reply Hello', type: 'action', params: { text: 'Hello from Studio!' } }
  ]
};

const postData = JSON.stringify(testGraph);

const options = {
  hostname: 'localhost',
  port: 3011,
  path: '/api/studio/compile',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending compile request via http module...');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Result:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(postData);
req.end();
