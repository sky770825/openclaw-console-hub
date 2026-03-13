#!/usr/bin/env bash
set -e
# 小蔡中控台 — 輕量 HTTP Server + Task Board API
# 用法: ./dashboard-server.sh [start|stop|status]
# 預設 port: 3011

PORT="${DASHBOARD_PORT:-3011}"
DATA_DIR="$HOME/.openclaw/automation"
PID_FILE="$DATA_DIR/.dashboard.pid"
LOG_FILE="$DATA_DIR/logs/dashboard.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$DATA_DIR/logs"

# 匯出 cron jobs 為 JSON（供儀表板讀取）
export_crons() {
  if command -v node &>/dev/null; then
    node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DATA = '$DATA_DIR';
const PORT = $PORT;
const SCRIPT_DIR = '$SCRIPT_DIR';

const MIME = { '.html':'text/html', '.json':'application/json', '.js':'text/javascript', '.css':'text/css' };

// 執行 shell 命令並返回 Promise
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url;
  
  // Health check
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }
  
  // API Routes
  if (url === '/api/tasks') {
    try {
      const output = await execPromise(\`\${SCRIPT_DIR}/task-board-api.sh list-tasks\`);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(output);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  
  // GET /api/tasks/:id
  const taskMatch = url.match(/^\/api\/tasks\/(\d+)$/);
  if (taskMatch) {
    try {
      const output = await execPromise(\`\${SCRIPT_DIR}/task-board-api.sh get-task \${taskMatch[1]}\`);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(output || JSON.stringify({ error: 'Task not found' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  
  // POST /api/tasks/:id/run
  const runMatch = url.match(/^\/api\/tasks\/(\d+)\/run$/);
  if (runMatch && req.method === 'POST') {
    try {
      const output = await execPromise(\`\${SCRIPT_DIR}/task-board-api.sh run-task \${runMatch[1]}\`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(output);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  
  // GET /api/runs
  if (url === '/api/runs' || url.startsWith('/api/runs?')) {
    try {
      const output = await execPromise(\`\${SCRIPT_DIR}/task-board-api.sh list-runs\`);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(output);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  
  // GET /api/runs/:id
  const runGetMatch = url.match(/^\/api\/runs\/(\d+)$/);
  if (runGetMatch) {
    try {
      const output = await execPromise(\`\${SCRIPT_DIR}/task-board-api.sh get-run \${runGetMatch[1]}\`);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(output || JSON.stringify({ error: 'Run not found' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Static files
  let filePath;
  if (url === '/' || url === '/index.html') {
    filePath = path.join(DATA, 'dashboard.html');
  } else if (url === '/recovery') {
    filePath = path.join(DATA, 'dashboard-recovery.html');
  } else if (url.startsWith('/data/')) {
    filePath = path.join(DATA, url.replace('/data/', ''));
  } else {
    res.writeHead(404); 
    res.end('Not found'); 
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('🐣 Dashboard + API running at http://localhost:' + PORT);
});
" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
  else
    echo "需要 Node.js" && exit 1
  fi
}

case "${1:-start}" in
  start)
    # 先停舊的
    if [ -f "$PID_FILE" ]; then
      old_pid=$(cat "$PID_FILE")
      kill "$old_pid" 2>/dev/null
      rm -f "$PID_FILE"
    fi
    export_crons
    echo "🐣 Dashboard 已啟動 → http://localhost:$PORT"
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo "Dashboard 已停止"
    else
      echo "Dashboard 未運行"
    fi
    ;;
  restart)
    $0 stop
    sleep 1
    $0 start
    ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "✅ Dashboard 運行中 (PID: $(cat "$PID_FILE")) → http://localhost:$PORT"
    else
      echo "❌ Dashboard 未運行"
      rm -f "$PID_FILE" 2>/dev/null
    fi
    ;;
  *)
    echo "用法: $0 [start|stop|restart|status]"
    ;;
esac