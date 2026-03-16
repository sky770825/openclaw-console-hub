import fs from 'fs';
import path from 'path';

export type FeatureKey =
  | 'page.cursor'
  | 'page.projects'
  | 'page.review'
  | 'page.alerts'
  | 'page.logs'
  | 'page.runs'
  | 'page.settings'
  | 'task.bulkOps'
  | 'ops.emergencyStop'
  | 'ops.incidentCreate';

export type FeatureFlags = Record<FeatureKey, boolean>;

export const DEFAULT_FEATURES: FeatureFlags = {
  'page.cursor': true,
  'page.projects': true,
  'page.review': true,
  'page.alerts': true,
  'page.logs': true,
  'page.runs': true,
  'page.settings': true,
  'task.bulkOps': true,
  'ops.emergencyStop': true,
  // Not implemented end-to-end yet (was "模擬"). Keep off by default.
  'ops.incidentCreate': false,
};

function featuresFilePath(): string {
  // Keep it inside repo to be portable and easy to back up.
  return path.resolve(process.cwd(), 'server', '.features.json');
}

export function loadFeatures(): FeatureFlags {
  const p = featuresFilePath();
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const merged: FeatureFlags = { ...DEFAULT_FEATURES };
    for (const k of Object.keys(DEFAULT_FEATURES) as FeatureKey[]) {
      const v = j?.[k];
      if (typeof v === 'boolean') merged[k] = v;
    }
    return merged;
  } catch {
    return { ...DEFAULT_FEATURES };
  }
}

export function saveFeatures(next: FeatureFlags): void {
  const p = featuresFilePath();
  const dir = path.dirname(p);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, p);
}

export function patchFeatures(current: FeatureFlags, patch: Partial<FeatureFlags>): FeatureFlags {
  const out: FeatureFlags = { ...current };
  for (const k of Object.keys(DEFAULT_FEATURES) as FeatureKey[]) {
    const v = patch[k];
    if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

