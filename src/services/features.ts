import { apiClient } from './apiClient';

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

const FEATURE_KEYS: FeatureKey[] = [
  'page.cursor',
  'page.projects',
  'page.review',
  'page.alerts',
  'page.logs',
  'page.runs',
  'page.settings',
  'task.bulkOps',
  'ops.emergencyStop',
  'ops.incidentCreate',
];

function normalizeFeatures(raw: unknown): FeatureFlags | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out = {} as FeatureFlags;
  for (const k of FEATURE_KEYS) out[k] = r[k] === true;
  return out;
}

export async function getFeatures(): Promise<{ ok: boolean; features: FeatureFlags } | null> {
  try {
    const resp = await apiClient.getFeatures();
    const features = normalizeFeatures(resp?.features);
    if (!resp?.ok || !features) return null;
    return { ok: true, features };
  } catch {
    return null;
  }
}

export async function patchFeatures(patch: Partial<FeatureFlags>): Promise<{ ok: boolean; features: FeatureFlags } | null> {
  try {
    const payload: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (typeof v === 'boolean') payload[k] = v;
    }
    const resp = await apiClient.patchFeatures(payload);
    const features = normalizeFeatures(resp?.features);
    if (!resp?.ok || !features) return null;
    return { ok: true, features };
  } catch {
    return null;
  }
}
