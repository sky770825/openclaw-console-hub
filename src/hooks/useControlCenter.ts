import { useState, useEffect, useCallback, useRef } from 'react';

interface HealthStatus {
  ok: boolean;
  supabase: 'ok' | 'fail' | 'not_configured';
  telegram: boolean;
  memory: { rss: number; heapUsed: number; unit: string };
  uptime: number;
}

interface DeputyStatus {
  enabled: boolean;
  maxTasksPerRun: number;
  allowedTags: string[];
}

interface DispatchStatus {
  isRunning: boolean;
  dispatchMode: boolean;
  pollIntervalMs: number;
  lastPollAt: string | null;
  totalExecutedToday: number;
}

interface ActivityLog {
  lines: string[];
  total: number;
}

interface ControlCenterState {
  health: HealthStatus | null;
  deputy: DeputyStatus | null;
  dispatch: DispatchStatus | null;
  activityLog: ActivityLog | null;
  loading: boolean;
  error: string | null;
}

const API = '/api';

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useControlCenter(pollInterval = 15000) {
  const [state, setState] = useState<ControlCenterState>({
    health: null,
    deputy: null,
    dispatch: null,
    activityLog: null,
    loading: true,
    error: null,
  });
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const refresh = useCallback(async () => {
    const [healthRes, deputyRes, dispatchRes, logRes] = await Promise.allSettled([
      fetchJSON<{ ok: boolean; services: { supabase: { ping: string }; telegram: { configured: boolean } }; memory: { rss: number; heapUsed: number; unit: string }; uptime: number }>(`${API}/health`),
      fetchJSON<{ enabled: boolean; maxTasksPerRun: number; allowedTags: string[] }>(`${API}/openclaw/deputy/status`),
      fetchJSON<{ isRunning: boolean; dispatchMode: boolean; pollIntervalMs: number; lastPollAt: string; totalExecutedToday: number }>(`${API}/openclaw/dispatch/status`),
      fetchJSON<ActivityLog>(`${API}/openclaw/activity-log?lines=20`),
    ]);

    setState({
      health: healthRes.status === 'fulfilled' && healthRes.value
        ? {
            ok: healthRes.value.ok,
            supabase: (healthRes.value.services?.supabase?.ping as 'ok' | 'fail' | 'not_configured') ?? 'not_configured',
            telegram: healthRes.value.services?.telegram?.configured ?? false,
            memory: healthRes.value.memory ?? { rss: 0, heapUsed: 0, unit: 'MB' },
            uptime: healthRes.value.uptime ?? 0,
          }
        : null,
      deputy: deputyRes.status === 'fulfilled' ? deputyRes.value : null,
      dispatch: dispatchRes.status === 'fulfilled' ? dispatchRes.value : null,
      activityLog: logRes.status === 'fulfilled' ? logRes.value : null,
      loading: false,
      error: null,
    });
  }, []);

  const toggleDeputy = useCallback(async () => {
    await fetch(`${API}/openclaw/deputy/toggle`, { method: 'POST' });
    refresh();
  }, [refresh]);

  const toggleDispatch = useCallback(async () => {
    await fetch(`${API}/openclaw/dispatch/toggle`, { method: 'POST' });
    refresh();
  }, [refresh]);

  const triggerDeputyNow = useCallback(async () => {
    await fetch(`${API}/openclaw/deputy/run-now`, { method: 'POST' });
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, pollInterval);
    return () => clearInterval(timerRef.current);
  }, [refresh, pollInterval]);

  return { ...state, refresh, toggleDeputy, toggleDispatch, triggerDeputyNow };
}
