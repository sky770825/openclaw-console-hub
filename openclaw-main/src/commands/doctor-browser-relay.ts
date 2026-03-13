import type { OpenClawConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import { resolveBrowserConfig } from "../browser/config.js";
import { resolveProfile } from "../browser/config.js";
import { note } from "../terminal/note.js";
import { formatCliCommand } from "../cli/command-format.js";

const RELAY_CHECK_TIMEOUT_MS = 3000;

/**
 * Check whether the browser extension relay is reachable (e.g. http://127.0.0.1:18792/json/version).
 * Run as part of `openclaw doctor` so OpenClaw can self-diagnose "cannot use browser" issues.
 */
export async function noteBrowserRelayHealth(params: {
  runtime: RuntimeEnv;
  cfg: OpenClawConfig;
}): Promise<void> {
  const { cfg } = params;
  if (cfg.gateway?.mode === "remote") {
    return;
  }
  let resolved;
  try {
    resolved = resolveBrowserConfig(cfg.browser, cfg);
  } catch {
    return;
  }
  if (!resolved.enabled) {
    return;
  }
  const extensionProfiles: { name: string; cdpUrl: string }[] = [];
  for (const name of Object.keys(resolved.profiles)) {
    const p = resolveProfile(resolved, name);
    if (!p || p.driver !== "extension") {
      continue;
    }
    const base = p.cdpUrl.replace(/\/$/, "");
    extensionProfiles.push({ name, cdpUrl: base });
  }
  if (extensionProfiles.length === 0) {
    return;
  }
  let anyReachable = false;
  const unreachable: string[] = [];
  const reachableProfiles: { name: string; cdpUrl: string }[] = [];
  for (const { name, cdpUrl } of extensionProfiles) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), RELAY_CHECK_TIMEOUT_MS);
      const res = await fetch(`${cdpUrl}/json/version`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        anyReachable = true;
        reachableProfiles.push({ name, cdpUrl });
      } else {
        unreachable.push(`${name} (${cdpUrl})`);
      }
    } catch {
      try {
        const url = new URL(cdpUrl);
        const port = url.port || (url.protocol === "https:" ? "443" : "80");
        unreachable.push(
          `${name} (${cdpUrl}); Relay WebSocket: ws://${url.hostname}:${port}/extension`,
        );
      } catch {
        unreachable.push(`${name} (${cdpUrl})`);
      }
    }
  }
  if (reachableProfiles.length > 0) {
    const first = reachableProfiles[0];
    note(
      `Browser relay (extension) reachable at ${first.cdpUrl}. To verify attached tabs: ${formatCliCommand(`openclaw browser --browser-profile ${first.name} tabs`)}`,
      "Browser",
    );
  }
  if (unreachable.length > 0) {
    note(
      [
        "Browser relay (extension) not reachable for:",
        ...unreachable.map((u) => `  - ${u}`),
        "Ensure Gateway is running and browser.enabled is true.",
        "If using Chrome extension: install it, set Relay Service URL to the ws://.../extension URL above, and attach a tab (click extension icon on the tab).",
      ].join("\n"),
      "Browser",
    );
  }
}
