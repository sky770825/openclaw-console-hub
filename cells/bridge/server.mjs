import http from 'http';
import { handleCompile } from './router.mjs';

const PORT = process.env.STUDIO_BRIDGE_PORT || 3011;

const server = http.createServer((req, res) => {
  if (req.url === '/api/studio/compile') {
    handleCompile(req, res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`OpenClaw Studio Bridge Cell running on http://localhost:${PORT}`);
});
