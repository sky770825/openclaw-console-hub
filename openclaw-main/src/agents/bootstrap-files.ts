import type { OpenClawConfig } from "../config/config.js";
import type { EmbeddedContextFile } from "./pi-embedded-helpers.js";
import { applyBootstrapHookOverrides } from "./bootstrap-hooks.js";
import { buildBootstrapContextFiles, resolveBootstrapMaxChars } from "./pi-embedded-helpers.js";
import {
  DEFAULT_IDENTITY_FILENAME,
  DEFAULT_USER_FILENAME,
  filterBootstrapFilesForSession,
  loadWorkspaceBootstrapFiles,
  type WorkspaceBootstrapFile,
} from "./workspace.js";

const LIGHT_BOOTSTRAP_FILENAMES = new Set([
  DEFAULT_IDENTITY_FILENAME,
  DEFAULT_USER_FILENAME,
]);
const LIGHT_USER_MAX_CHARS = 200;

export function makeBootstrapWarn(params: {
  sessionLabel: string;
  warn?: (message: string) => void;
}): ((message: string) => void) | undefined {
  if (!params.warn) {
    return undefined;
  }
  return (message: string) => params.warn?.(`${message} (sessionKey=${params.sessionLabel})`);
}

export async function resolveBootstrapFilesForRun(params: {
  workspaceDir: string;
  config?: OpenClawConfig;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
}): Promise<WorkspaceBootstrapFile[]> {
  const sessionKey = params.sessionKey ?? params.sessionId;
  const bootstrapFiles = filterBootstrapFilesForSession(
    await loadWorkspaceBootstrapFiles(params.workspaceDir),
    sessionKey,
  );
  return applyBootstrapHookOverrides({
    files: bootstrapFiles,
    workspaceDir: params.workspaceDir,
    config: params.config,
    sessionKey: params.sessionKey,
    sessionId: params.sessionId,
    agentId: params.agentId,
  });
}

export type BootstrapMode = "full" | "light";

function applyLightBootstrap(
  files: WorkspaceBootstrapFile[],
): WorkspaceBootstrapFile[] {
  const filtered = files.filter((f) => LIGHT_BOOTSTRAP_FILENAMES.has(f.name));
  return filtered.map((f) => {
    if (f.name !== DEFAULT_USER_FILENAME || f.missing || !f.content) {
      return f;
    }
    const firstLines = f.content.trim().split(/\n/).slice(0, 2).join("\n");
    const truncated =
      firstLines.length > LIGHT_USER_MAX_CHARS
        ? firstLines.slice(0, LIGHT_USER_MAX_CHARS) + "..."
        : firstLines;
    return { ...f, content: truncated };
  });
}

export async function resolveBootstrapContextForRun(params: {
  workspaceDir: string;
  config?: OpenClawConfig;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
  warn?: (message: string) => void;
  /** When "light", only IDENTITY + minimal USER (for casual chat); saves token. */
  bootstrapMode?: BootstrapMode;
}): Promise<{
  bootstrapFiles: WorkspaceBootstrapFile[];
  contextFiles: EmbeddedContextFile[];
}> {
  let bootstrapFiles = await resolveBootstrapFilesForRun(params);
  if (params.bootstrapMode === "light") {
    bootstrapFiles = applyLightBootstrap(bootstrapFiles);
  }
  let contextFiles = buildBootstrapContextFiles(bootstrapFiles, {
    maxChars: resolveBootstrapMaxChars(params.config),
    warn: params.warn,
  });
  if (params.bootstrapMode === "light") {
    contextFiles = [
      ...contextFiles,
      {
        path: "(light-mode)",
        content:
          "一般聊天模式：簡短回覆即可，不查記憶、不呼叫工具。若使用者接下來提出具體問題或說記下來，下一輪會使用完整模式。",
      },
    ];
  }
  return { bootstrapFiles, contextFiles };
}
