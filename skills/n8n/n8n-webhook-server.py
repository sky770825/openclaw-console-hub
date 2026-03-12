#!/usr/bin/env python3
"""
n8n Webhook Receiver for OpenClaw
Receives webhook calls from n8n and forwards to OpenClaw
"""

import http.server
import socketserver
import json
import os
import sys
import socket
from datetime import datetime
from pathlib import Path

PORT = int(os.environ.get('N8N_WEBHOOK_PORT', '5679'))
LOG_DIR = Path.home() / '.openclaw' / 'logs' / 'n8n-webhooks'
SIGNAL_FILE = Path.home() / '.openclaw' / 'run' / 'n8n-signal'
PID_FILE = Path.home() / '.openclaw' / 'run' / 'n8n-webhook-receiver.pid'

# Ensure directories exist
LOG_DIR.mkdir(parents=True, exist_ok=True)
SIGNAL_FILE.parent.mkdir(parents=True, exist_ok=True)

class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_line = f"[{timestamp}] {self.address_string()} - {format % args}"
        print(log_line, flush=True)
        # Also write to file
        with open(LOG_DIR / 'receiver.log', 'a') as f:
            f.write(log_line + '\n')
    
    def do_GET(self):
        if self.path == '/health':
            self._send_json(200, {"status": "ok", "service": "n8n-webhook-receiver"})
        else:
            self._send_json(404, {"error": "Not Found"})
    
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {"raw_body": body}
        
        if self.path.startswith('/webhook/n8n'):
            # Save webhook data
            webhook_id = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            webhook_file = LOG_DIR / f'webhook_{webhook_id}.json'
            
            webhook_data = {
                "id": webhook_id,
                "timestamp": datetime.now().isoformat(),
                "path": self.path,
                "data": data
            }
            
            with open(webhook_file, 'w') as f:
                json.dump(webhook_data, f, indent=2)
            
            # Write signal for OpenClaw to pick up
            with open(SIGNAL_FILE, 'w') as f:
                f.write(f"webhook:{webhook_file}:{json.dumps(data)}\n")
            
            self.log_message(f"Webhook received: {webhook_id}")
            
            webhook_name = self.path.split('/')[-1] if self.path != '/webhook/n8n' else 'default'
            self._send_json(200, {
                "received": True,
                "id": webhook_id,
                "webhook": webhook_name
            })
        else:
            self._send_json(404, {"error": "Not Found"})
    
    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def find_free_port(start_port=5679):
    """Find a free port starting from start_port"""
    for port in range(start_port, start_port + 100):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    return start_port

def start_server():
    global PORT
    
    # Try to use specified port, or find free one
    try:
        test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        test_socket.bind(('127.0.0.1', PORT))
        test_socket.close()
    except OSError:
        old_port = PORT
        PORT = find_free_port(PORT + 1)
        print(f"⚠️  Port {old_port} in use, using port {PORT} instead")
    
    with ReusableTCPServer(("127.0.0.1", PORT), WebhookHandler) as httpd:
        print(f"🚀 n8n Webhook Receiver started on port {PORT}")
        print(f"   Health: http://127.0.0.1:{PORT}/health")
        print(f"   Webhook: http://127.0.0.1:{PORT}/webhook/n8n")
        print(f"   Logs: {LOG_DIR}")
        
        # Save PID and port
        with open(PID_FILE, 'w') as f:
            f.write(f"{os.getpid()}\n{PORT}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Shutting down...")
        finally:
            if PID_FILE.exists():
                PID_FILE.unlink()

def stop_server():
    if PID_FILE.exists():
        with open(PID_FILE) as f:
            lines = f.read().strip().split('\n')
            pid = int(lines[0])
        try:
            os.kill(pid, 15)  # SIGTERM
            print(f"✅ Server stopped (PID: {pid})")
            PID_FILE.unlink()
        except ProcessLookupError:
            print("❌ Process not found")
            PID_FILE.unlink()
    else:
        print("⏹️  Server not running")

def check_status():
    if PID_FILE.exists():
        with open(PID_FILE) as f:
            lines = f.read().strip().split('\n')
            pid = int(lines[0])
            port = int(lines[1]) if len(lines) > 1 else PORT
        try:
            os.kill(pid, 0)  # Check if process exists
            print(f"✅ Webhook receiver running (PID: {pid}, Port: {port})")
            
            # Try health check
            import urllib.request
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=2) as resp:
                    print(f"   Health: {resp.read().decode()}")
            except Exception as e:
                print(f"   ⚠️  Health check failed: {e}")
        except OSError:
            print("❌ PID file exists but process not running")
            PID_FILE.unlink()
    else:
        print("⏹️  Webhook receiver not running")

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'start'
    
    if cmd == 'start':
        start_server()
    elif cmd == 'stop':
        stop_server()
    elif cmd == 'status':
        check_status()
    else:
        print("Usage: n8n-webhook-server.py [start|stop|status]")
        print(f"Default port: {PORT}")
        print(f"Override with: export N8N_WEBHOOK_PORT=5680")
