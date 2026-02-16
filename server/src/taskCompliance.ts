import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Task } from './types.js';

export type TaskGate = 'ready' | 'run';

function repoRoot(): string {
  // src path: <repo>/server/src/taskCompliance.ts
  // dist path: <repo>/server/dist/taskCompliance.js
  // => dist 需往上兩層；src 也往上兩層可達 repo root
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..');
}

export function projectsRoot(): string {
  // Batch A: projects/ 落在 repo 內（user 選擇 option 2）
  return path.resolve(repoRoot(), 'projects');
}

export function ensureProjectsRoot(): void {
  const root = projectsRoot();
  fs.mkdirSync(root, { recursive: true });
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

export function validateTaskForGate(task: Task, gate: TaskGate): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = [];

  // 精簡必填：只檢查 name、agent.type、runCommands（status 由 schema 保證）
  if (!isNonEmptyString(task.name)) missing.push('name');
  if (!task.agent?.type) missing.push('agent.type');
  if (!isNonEmptyArray(task.runCommands)) missing.push('runCommands');

  if (gate === 'run') {
    if (!isNonEmptyString(task.runPath)) missing.push('runPath');
    if (!isNonEmptyString(task.idempotencyKey)) missing.push('idempotencyKey');
  }

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

export function normalizeProjectPath(raw: string): string {
  // 允許傳入相對路徑 projects/... 或絕對路徑；統一回傳 repo 相對的 projects/...（用於 task meta / UI 顯示）
  const trimmed = raw.trim().replace(/\\/g, '/');
  const idx = trimmed.indexOf('projects/');
  if (idx >= 0) return trimmed.slice(idx).replace(/\/+$/, '/') ;
  return trimmed.replace(/\/+$/, '/') ;
}

export function parseProjectAndModule(projectPath: string): { project: string; module: string } | null {
  const p = normalizeProjectPath(projectPath);
  // projects/<project>/modules/<module>/
  const parts = p.split('/').filter(Boolean);
  const projIdx = parts.indexOf('projects');
  const modIdx = parts.indexOf('modules');
  if (projIdx < 0 || modIdx < 0) return null;
  const project = parts[projIdx + 1];
  const module = parts[modIdx + 1];
  if (!project || !module) return null;
  return { project, module };
}

export function buildRunPath(projectPath: string, date: string, runId: string): string {
  const parsed = parseProjectAndModule(projectPath);
  if (!parsed) {
    // fallback：放到 projects/_unknown/...
    return `projects/_unknown/runs/${date}/${runId}/`;
  }
  return `projects/${parsed.project}/runs/${date}/${runId}/`;
}

export function ensureProjectSkeleton(task: Task): { ok: true; created: string[] } | { ok: false; message: string } {
  if (!task.projectPath) return { ok: false, message: 'missing projectPath' };
  const parsed = parseProjectAndModule(task.projectPath);
  if (!parsed) return { ok: false, message: `invalid projectPath: ${task.projectPath}` };
  ensureProjectsRoot();
  const root = projectsRoot();

  const created: string[] = [];
  const projectDir = path.join(root, parsed.project);
  const moduleDir = path.join(root, parsed.project, 'modules', parsed.module);
  const docsDir = path.join(projectDir, 'docs');
  const updatesDir = path.join(docsDir, 'updates');

  for (const dir of [projectDir, moduleDir, docsDir, updatesDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      created.push(path.relative(repoRoot(), dir));
    }
  }

  const readme = path.join(projectDir, 'README.md');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      `# ${parsed.project}\n\n- modules: ${parsed.module}\n- createdAt: ${new Date().toISOString()}\n`,
      'utf8'
    );
    created.push(path.relative(repoRoot(), readme));
  }

  const statusMd = path.join(docsDir, 'STATUS.md');
  if (!fs.existsSync(statusMd)) {
    fs.writeFileSync(
      statusMd,
      `# STATUS\n\n- updatedAt: ${new Date().toISOString()}\n- note: managed by OpenClaw taskboard\n`,
      'utf8'
    );
    created.push(path.relative(repoRoot(), statusMd));
  }

  const runbook = path.join(docsDir, 'runbook.md');
  if (!fs.existsSync(runbook)) {
    fs.writeFileSync(
      runbook,
      `# Runbook\n\n## Start\n\n## Verify\n\n## Rollback\n`,
      'utf8'
    );
    created.push(path.relative(repoRoot(), runbook));
  }

  const envExample = path.join(projectDir, '.env.example');
  if (!fs.existsSync(envExample)) {
    fs.writeFileSync(envExample, `# Example env (no secrets)\n`, 'utf8');
    created.push(path.relative(repoRoot(), envExample));
  }

  return { ok: true, created };
}

export function ensureRunWorkspace(runPath: string): { ok: true; created: string[] } | { ok: false; message: string } {
  const created: string[] = [];
  ensureProjectsRoot();
  const root = projectsRoot();
  
  const rel = normalizeProjectPath(runPath);
  const abs = path.join(repoRoot(), rel);
  const artifacts = path.join(abs, 'ARTIFACTS');
  const result = path.join(abs, 'RESULT.md');

  for (const dir of [abs, artifacts]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      created.push(path.relative(repoRoot(), dir));
    }
  }
  if (!fs.existsSync(result)) {
    fs.writeFileSync(
      result,
      `# RESULT\n\n## commands\n\n## acceptance\n\n## rollback\n\n## summary\n`,
      'utf8'
    );
    created.push(path.relative(repoRoot(), result));
  }

  return { ok: true, created };
}
