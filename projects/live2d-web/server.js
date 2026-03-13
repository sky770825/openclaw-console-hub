/**
 * Live2D WebSocket Server
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 8080;
const clients = new Set();

// HTTP 靜態檔案伺服器
const httpServer = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

// WebSocket 伺服器
const wss = new WebSocketServer({ server: httpServer, path: '/live2d-ws' });

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('[Live2D] 新連線，目前 ' + clients.size + ' 個客戶端');

  ws.send(JSON.stringify({
    type: 'message',
    text: '你好！我是達爾，有什麼需要幫忙的嗎？✨',
    emotion: 'happy'
  }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'chat') {
        console.log('[Live2D] 收到訊息: ' + msg.text);
        ws.send(JSON.stringify({
          type: 'message',
          text: '收到：' + msg.text,
          emotion: 'default'
        }));
      }
    } catch (e) {
      console.error('[Live2D] 訊息解析失敗:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[Live2D] 連線關閉，剩 ' + clients.size + ' 個客戶端');
  });
});

function broadcast(text, emotion) {
  emotion = emotion || 'default';
  const payload = JSON.stringify({ type: 'message', text: text, emotion: emotion });
  clients.forEach(function(ws) {
    if (ws.readyState === 1) ws.send(payload);
  });
}

httpServer.listen(PORT, () => {
  console.log('[Live2D] 伺服器啟動 http://localhost:' + PORT);
});

module.exports = { broadcast };
