# OpenClaw Chrome Extension (Browser Relay)

Purpose: attach OpenClaw to an existing Chrome tab so the Gateway can automate it (via the local CDP relay server).

## Dev / load unpacked

1. Build/run OpenClaw Gateway with browser control enabled.
2. Ensure the relay server is reachable at `http://127.0.0.1:18792/` (default).
3. Install the extension to a stable path:

   ```bash
   openclaw browser extension install
   openclaw browser extension path
   ```

4. Chrome → `chrome://extensions` → enable “Developer mode”.
5. “Load unpacked” → select the path printed above.
6. Pin the extension. Click the icon on a tab to attach/detach.

## Options

- `Relay port`: defaults to `18792`.

## Auto-reconnect and re-attach

When the relay connection drops (e.g. Gateway restart), the extension will:

1. Save the list of currently attached tab IDs.
2. Retry connecting to the relay (3s, 5s, 10s, then every 10s, up to 30 retries).
3. When connected again, automatically re-attach those tabs so they return to **ON** without you clicking again.

Re-install the extension to get this behaviour: `openclaw browser extension install`, then in Chrome reload the extension.
