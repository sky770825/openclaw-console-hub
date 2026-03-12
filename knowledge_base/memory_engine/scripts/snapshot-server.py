#!/usr/bin/env python3
import json, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

SNAPSHOT_DIR = Path("~/.openclaw/workspace/knowledge_base/memory_engine/snapshots").expanduser()
COMPACT_FILE = Path("~/.openclaw/workspace/knowledge_base/memory_engine/COMPACT_MEMORY.md").expanduser()

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/snapshot/latest":
            latest = SNAPSHOT_DIR / "latest.json"
            if not latest.exists():
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            with open(latest) as f:
                self.wfile.write(f.read().encode())
        elif self.path == "/api/memory/compact":
            if not COMPACT_FILE.exists():
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/markdown")
            self.end_headers()
            with open(COMPACT_FILE, 'rb') as f:
                self.wfile.write(f.read())
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status":"ok"}).encode())
        else:
            self.send_error(404)

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    print(f"Starting NEUXA Snapshot Server on port {port}")
    HTTPServer(("", port), Handler).serve_forever()
