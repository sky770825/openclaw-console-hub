# 端口衝突修復驗證報告
執行時間: Mon Mar  2 12:14:53 CST 2026

## 偵測到的專案端口配置
根據源碼掃描，專案可能使用的端口如下：
- 12022
- 12032
- 17220
- 17293
- 17295
- 17315
- 18789
- 18790
- 18791
- 18792
- 18793
- 19001
- 2026
- 20260
- 3000
- 3011
- 3100
- 3456
- 42873
- 5432
- 5678
- 5680
- 5900
- 6080
- 8080
- 8765
- 8788
- 9222

## 當前環境端口佔用狀態
```text
[可用] 端口 12022 目前空閒
[可用] 端口 12032 目前空閒
[可用] 端口 17220 目前空閒
[可用] 端口 17293 目前空閒
[可用] 端口 17295 目前空閒
[可用] 端口 17315 目前空閒
[占用] 端口 18789 被進程 openclaw-gateway (PID: 1010) 占用
[可用] 端口 18790 目前空閒
[占用] 端口 18791 被進程 openclaw-gateway (PID: 1010) 占用
[占用] 端口 18792 被進程 openclaw-gateway (PID: 1010) 占用
[可用] 端口 18793 目前空閒
[可用] 端口 19001 目前空閒
[可用] 端口 2026 目前空閒
[可用] 端口 20260 目前空閒
[占用] 端口 3000 被進程  (PID: 43515
57369) 占用
[占用] 端口 3011 被進程  (PID: 43515
56466) 占用
[可用] 端口 3100 目前空閒
[可用] 端口 3456 目前空閒
[可用] 端口 42873 目前空閒
[可用] 端口 5432 目前空閒
[可用] 端口 5678 目前空閒
[可用] 端口 5680 目前空閒
[可用] 端口 5900 目前空閒
[可用] 端口 6080 目前空閒
[可用] 端口 8080 目前空閒
[可用] 端口 8765 目前空閒
[可用] 端口 8788 目前空閒
[可用] 端口 9222 目前空閒
```

## 修復邏輯驗證分析
### 程式碼層級檢索 (是否有錯誤捕獲機制):
```text
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/chrome-BNSd7Bie.js:		if (isErrno$1(err) && err.code === "EADDRINUSE") return "busy";
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/chrome-BNSd7Bie.js:		if (isErrno(err) && err.code === "EADDRINUSE") throw new PortInUseError(port, await describePortOwner(port));
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/chrome-BNSd7Bie.js:	if (err instanceof PortInUseError || isErrno(err) && err.code === "EADDRINUSE") {
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/gateway-cli-CCRjIRWt.js:		if (isErrno(err) && err.code === "EADDRINUSE") localPort = await pickEphemeralPort();
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/gateway-cli-CCRjIRWt.js:const ADDRESS_IN_USE_RE = /address already in use|EADDRINUSE/i;
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/gateway-cli-CCRjIRWt.js:		if (err.code === "EADDRINUSE") throw new GatewayLockError(`another gateway instance is already listening on ws://${bindHost}:${port}`, err);
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/chrome-B3IuUad-.js:		if (isErrno$1(err) && err.code === "EADDRINUSE") return "busy";
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/chrome-B3IuUad-.js:		if (isErrno(err) && err.code === "EADDRINUSE") throw new PortInUseError(port, await describePortOwner(port));
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/index.js:	newYear: "New Year's Day: New year, new config—same old EADDRINUSE, but this time we resolve it like grown-ups.",
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/gateway-cli-Bh3UamKy.js:		if (isErrno(err) && err.code === "EADDRINUSE") localPort = await pickEphemeralPort();
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/gateway-cli-Bh3UamKy.js:const ADDRESS_IN_USE_RE = /address already in use|EADDRINUSE/i;
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/gateway-cli-Bh3UamKy.js:		if (err.code === "EADDRINUSE") throw new GatewayLockError(`another gateway instance is already listening on ws://${bindHost}:${port}`, err);
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/errors-CZ9opC6L.js:		if (isErrno$1(err) && err.code === "EADDRINUSE") return "busy";
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/errors-CZ9opC6L.js:		if (isErrno(err) && err.code === "EADDRINUSE") throw new PortInUseError(port, await describePortOwner(port));
/Users/sky770825/openclaw任務面版設計/openclaw-main/dist/config-guard-D2tKd3wv.js:	newYear: "New Year's Day: New year, new config—same old EADDRINUSE, but this time we resolve it like grown-ups.",
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN/help/faq.md:OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制运行时锁（默认 `ws://127.0.0.1:18789`）。如果绑定因 `EADDRINUSE` 失败，它会抛出 `GatewayLockError` 表示另一个实例已在监听。
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN/gateway/gateway-lock.md:- 如果绑定因 `EADDRINUSE` 失败，启动会抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/help/faq.md:OpenClaw enforces a runtime lock by binding the WebSocket listener immediately on startup (default `ws://127.0.0.1:18789`). If the bind fails with `EADDRINUSE`, it throws `GatewayLockError` indicating another instance is already listening.
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/gateway/gateway-lock.md:- If the bind fails with `EADDRINUSE`, startup throws `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/google-gemini-cli-auth/oauth.ts:      (err.message.includes("EADDRINUSE") ||
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/test-utils/ports.ts: * can collide on derived ports and get flaky EADDRINUSE.
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/infra/ssh-tunnel.ts:    if (isErrno(err) && err.code === "EADDRINUSE") {
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/infra/ports.test.ts:  it("handlePortError exits nicely on EADDRINUSE", async () => {
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/infra/ports.test.ts:    await handlePortError({ code: "EADDRINUSE" }, 1234, "context", runtime).catch(() => {});
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/infra/ports.ts:  // Detect EADDRINUSE early with a friendly message.
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/infra/ports.ts:    if (isErrno(err) && err.code === "EADDRINUSE") {
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/infra/ports.ts:  // Uniform messaging for EADDRINUSE with optional owner details.
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/infra/ports.ts:  if (err instanceof PortInUseError || (isErrno(err) && err.code === "EADDRINUSE")) {
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/infra/ports-inspect.ts:    if (isErrno(err) && err.code === "EADDRINUSE") {
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/cli/tagline.ts:    "New Year's Day: New year, new config—same old EADDRINUSE, but this time we resolve it like grown-ups.",
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/hooks/gmail-watcher.test.ts:    expect(isAddressInUseError("EADDRINUSE: address already in use")).toBe(true);
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/hooks/gmail-watcher.ts:const ADDRESS_IN_USE_RE = /address already in use|EADDRINUSE/i;
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/gateway/server/http-listen.ts:    if (code === "EADDRINUSE") {
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/gateway/test-helpers.server.ts:      if (code !== "EADDRINUSE") {
/Users/sky770825/openclaw任務面版設計/logs/server.log:Error: listen EADDRINUSE: address already in use 127.0.0.1:3011
/Users/sky770825/openclaw任務面版設計/logs/server.log:  code: 'EADDRINUSE',
/Users/sky770825/openclaw任務面版設計/scripts/archived/openclaw-rescue.sh:    tail -n 260 "$LOG" | rg -n "(401|Unauthorized|rate_limit|cooldown|locked|timeout|EADDRINUSE|channel exited|error)" | tail -n 160 || true
/Users/sky770825/openclaw任務面版設計/server.log:Error: listen EADDRINUSE: address already in use 127.0.0.1:3011
/Users/sky770825/openclaw任務面版設計/server.log:  code: 'EADDRINUSE',
/Users/sky770825/openclaw任務面版設計/server.log:Error: listen EADDRINUSE: address already in use 127.0.0.1:3011
/Users/sky770825/openclaw任務面版設計/server.log:  code: 'EADDRINUSE',
/Users/sky770825/openclaw任務面版設計/server.log:Error: listen EADDRINUSE: address already in use 127.0.0.1:3011
/Users/sky770825/openclaw任務面版設計/server.log:  code: 'EADDRINUSE',
```

## 結論與建議
1. 驗證工具已部署至: `/Users/sky770825/.openclaw/workspace/scripts/port_manager.sh`
2. 若遇到開發啟動失敗，請執行 `bash /Users/sky770825/.openclaw/workspace/scripts/port_manager.sh kill <PORT>` 釋放資源。
3. 建議在 `server/src/index.ts` (或對應入口) 加入動態端口尋找邏輯以徹底修復衝突。
