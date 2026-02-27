import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3011';
const KEY = import.meta.env.VITE_OPENCLAW_API_KEY || '';
const headers = { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' };

function useInterval(cb: () => void, ms: number) {
  useEffect(() => {
    cb();
    const t = setInterval(cb, ms);
    return () => clearInterval(t);
  }, []);
}

// ── N8N Workflows ─────────────────────────────────────────────────────────────
const N8NPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/n8n/workflows`, { headers });
      const d = await r.json();
      if (d.ok) setWorkflows(d.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useInterval(load, 30000);

  const filtered = workflows.filter(w =>
    activeFilter === 'all' ? true : activeFilter === 'active' ? w.active : !w.active
  );
  const activeCount = workflows.filter(w => w.active).length;
  const totalExecutions = workflows.reduce((s, w) => s + (w.statistics?.count || 0), 0);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Active Workflows', value: loading ? '…' : String(activeCount), color: '#10b981' },
          { label: 'Total Workflows', value: loading ? '…' : String(workflows.length), color: '#38bdf8' },
          { label: 'Inactive', value: loading ? '…' : String(workflows.length - activeCount), color: '#f59e0b' },
          { label: 'Total Executions', value: loading ? '…' : totalExecutions > 0 ? String(totalExecutions) : 'n/a', color: '#a855f7' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${s.color}33`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ color: s.color, fontSize: 24, fontWeight: 700, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#38bdf8', margin: 0, fontSize: 14, letterSpacing: 2 }}>WORKFLOW REGISTRY</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                style={{ background: activeFilter === f ? '#38bdf822' : 'transparent', border: `1px solid ${activeFilter === f ? '#38bdf8' : '#334155'}`, color: activeFilter === f ? '#38bdf8' : '#64748b', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>載入中…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>無資料</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map((wf: any) => (
              <div key={wf.id} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${wf.active ? '#10b98133' : '#33415533'}`, borderRadius: 8, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: 13, marginBottom: 4 }}>{wf.name}</div>
                  <div style={{ color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>id: {wf.id}</div>
                </div>
                <span style={{ color: '#64748b', fontSize: 11 }}>
                  {wf.updatedAt ? new Date(wf.updatedAt).toLocaleDateString('zh-TW') : '—'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 16, borderRadius: 8, background: wf.active ? '#10b981' : '#334155', position: 'relative' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: wf.active ? 14 : 2, transition: 'left 0.2s' }} />
                  </div>
                  <span style={{ color: wf.active ? '#10b981' : '#64748b', fontSize: 11 }}>{wf.active ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Executor ──────────────────────────────────────────────────────────────────
const ExecutorPage: React.FC = () => {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/openclaw/auto-executor/status`, { headers });
      setState(await r.json());
    } catch {}
    setLoading(false);
  }, []);

  useInterval(load, 10000);

  const toggle = async () => {
    if (!state) return;
    setToggling(true);
    const action = state.isRunning ? 'stop' : 'start';
    try {
      await fetch(`${API}/api/openclaw/auto-executor/${action}`, { method: 'POST', headers });
      await load();
    } catch {}
    setToggling(false);
  };

  const executions: any[] = state?.recentExecutions || [];
  const priorityColor = (r: string) => r === 'critical' ? '#ef4444' : r === 'medium' ? '#f59e0b' : r === 'low' ? '#38bdf8' : '#64748b';
  const statusColor = (s: string) => s === 'success' ? '#10b981' : s === 'failed' ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${state?.isRunning ? '#10b98155' : '#1e3a5f'}`, borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ color: '#38bdf8', margin: '0 0 4px', fontSize: 16 }}>AUTO EXECUTOR</h3>
              <div style={{ color: state?.isRunning ? '#10b981' : '#ef4444', fontSize: 12 }}>
                {loading ? '…' : state?.isRunning ? '● 運行中' : '● 已停止'}
              </div>
            </div>
            <button onClick={toggle} disabled={toggling || loading}
              style={{ background: state?.isRunning ? '#ef4444' : '#10b981', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: toggling ? 0.6 : 1 }}>
              {toggling ? '…' : state?.isRunning ? 'STOP' : 'START'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Completed Today', value: loading ? '…' : String(state?.totalExecutedToday ?? 0) },
              { label: 'Poll Interval', value: loading ? '…' : state ? `${state.pollIntervalMs / 1000}s` : '—' },
              { label: 'Max Tasks/min', value: loading ? '…' : String(state?.maxTasksPerMinute ?? 1) },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {state?.lastExecutedAt && (
            <div style={{ color: '#475569', fontSize: 11, marginTop: 12 }}>
              最後執行：{new Date(state.lastExecutedAt).toLocaleString('zh-TW')}
            </div>
          )}
        </div>

        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>RECENT EXECUTIONS</h3>
          {loading ? (
            <div style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>載入中…</div>
          ) : executions.length === 0 ? (
            <div style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>尚無執行記錄</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {[...executions].reverse().map((e: any, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: '#e2e8f0', fontSize: 12 }}>{e.taskName}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: priorityColor(e.riskLevel), fontSize: 10, background: `${priorityColor(e.riskLevel)}1a`, padding: '2px 6px', borderRadius: 4 }}>{e.riskLevel}</span>
                      <span style={{ color: statusColor(e.status), fontSize: 10, fontWeight: 700 }}>{e.status}</span>
                    </div>
                  </div>
                  {e.summary && <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>{e.summary}</div>}
                  <div style={{ color: '#334155', fontSize: 10, marginTop: 4 }}>{new Date(e.executedAt).toLocaleString('zh-TW')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#000', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, letterSpacing: 1 }}>PENDING REVIEWS</div>
        {(state?.pendingReviews || []).length === 0 ? (
          <div style={{ color: '#334155', fontSize: 12, padding: '20px 0' }}>無待審核任務</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {(state?.pendingReviews || []).map((r: any, i: number) => (
              <div key={i} style={{ background: '#0a0118', border: '1px solid #7c3aed44', borderRadius: 8, padding: 12 }}>
                <div style={{ color: '#a855f7', fontSize: 12 }}>{r.taskName}</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{r.reason}</div>
                <div style={{ color: '#334155', fontSize: 10, marginTop: 4 }}>{new Date(r.queuedAt).toLocaleString('zh-TW')}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16, borderTop: '1px solid #1e293b', paddingTop: 12 }}>
          <div style={{ color: '#64748b', fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>DISPATCH MODE</div>
          <div style={{ color: state?.dispatchMode ? '#10b981' : '#64748b', fontSize: 12 }}>
            {state?.dispatchMode ? '● 已開啟' : '○ 已關閉'}
          </div>
          {state?.dispatchStartedAt && (
            <div style={{ color: '#334155', fontSize: 10, marginTop: 4 }}>
              啟動於 {new Date(state.dispatchStartedAt).toLocaleString('zh-TW')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Patrol ────────────────────────────────────────────────────────────────────
const PatrolPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/health`, { headers });
      setHealth(await r.json());
      setLastChecked(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
    } catch {}
    setLoading(false);
  }, []);

  useInterval(load, 30000);

  const checks = health ? [
    { name: 'Server HTTP', endpoint: `GET /api/health`, status: health.ok ? 'pass' : 'fail', detail: `uptime ${Math.round((health.uptime || 0) / 60)}m · v${health.version}` },
    { name: 'Supabase DB', endpoint: 'Supabase (postgres)', status: health.services?.supabase?.ping === 'ok' ? 'pass' : health.services?.supabase?.configured ? 'warn' : 'fail', detail: health.services?.supabase?.ping || '未連線' },
    { name: 'Telegram Bot', endpoint: 'telegram bot API', status: health.services?.telegram?.configured ? 'pass' : 'warn', detail: health.services?.telegram?.configured ? '已設定' : '未設定' },
    { name: 'n8n Webhook', endpoint: 'n8n localhost:5678', status: health.services?.n8n?.configured ? 'pass' : 'warn', detail: health.services?.n8n?.configured ? '已設定' : '未設定' },
    { name: 'Auto Executor', endpoint: '/api/openclaw/auto-executor', status: health.autoExecutor?.isRunning ? 'pass' : 'warn', detail: health.autoExecutor?.isRunning ? `今日執行 ${health.autoExecutor.totalExecutedToday} 次` : '已停止' },
    { name: 'WebSocket', endpoint: 'ws://localhost:3011', status: (health.services?.websocket?.totalConnections ?? 0) >= 0 ? 'pass' : 'warn', detail: `連線 ${health.services?.websocket?.totalConnections ?? 0}` },
    { name: 'Memory', endpoint: 'process heap', status: (health.memory?.heapUsed || 0) < 200 ? 'pass' : 'warn', detail: `heap ${health.memory?.heapUsed ?? '?'} MB / ${health.memory?.heapTotal ?? '?'} MB` },
  ] : [];

  const statusColor = (s: string) => s === 'pass' ? '#10b981' : s === 'warn' ? '#f59e0b' : '#ef4444';
  const passing = checks.filter(c => c.status === 'pass').length;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ color: '#38bdf8', margin: '0 0 8px', fontSize: 16, letterSpacing: 2 }}>SYSTEM PATROL</h3>
          <div style={{ color: '#64748b', fontSize: 12 }}>每 30 秒自動巡邏 · 發現異常立即通報 Telegram</div>
          {lastChecked && <div style={{ color: '#334155', fontSize: 11, marginTop: 4 }}>最後檢查：{lastChecked}</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          {loading ? (
            <div style={{ color: '#64748b', fontSize: 20 }}>…</div>
          ) : (
            <>
              <div style={{ color: passing === checks.length ? '#10b981' : '#f59e0b', fontSize: 40, fontWeight: 700 }}>{passing}/{checks.length}</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>CHECKS PASSING</div>
            </>
          )}
        </div>
      </div>

      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>HEALTH CHECKS</h3>
        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>載入中…</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {checks.map(c => (
              <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 80px auto', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: `1px solid ${statusColor(c.status)}22`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                <span style={{ color: '#e2e8f0' }}>{c.name}</span>
                <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{c.detail}</span>
                <span style={{ color: '#475569', fontSize: 10 }}>{c.endpoint}</span>
                <span style={{ color: statusColor(c.status), fontWeight: 700, textTransform: 'uppercase', minWidth: 40, textAlign: 'center' }}>{c.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {health && (
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>SERVER INFO</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, fontFamily: 'monospace', fontSize: 12 }}>
            {[
              { label: 'Version', value: health.version },
              { label: 'Uptime', value: `${Math.round(health.uptime / 60)} min` },
              { label: 'RSS Memory', value: `${health.memory?.rss ?? '?'} MB` },
            ].map(i => (
              <div key={i.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12 }}>
                <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>{i.label}</div>
                <div style={{ color: '#e2e8f0' }}>{i.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Telegram ──────────────────────────────────────────────────────────────────
const TelegramPage: React.FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/openclaw/activity-log?limit=30`, { headers });
      const d = await r.json();
      setLines((d.lines || []).reverse());
    } catch {}
    setLoading(false);
  }, []);

  useInterval(load, 15000);

  const parseLevel = (line: string) => {
    if (line.includes('[error]') || line.includes('[fail]')) return '#ef4444';
    if (line.includes('[warn]')) return '#f59e0b';
    if (line.includes('[sync]') || line.includes('[config]')) return '#38bdf8';
    return '#94a3b8';
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#38bdf8', margin: 0, fontSize: 14, letterSpacing: 2 }}>ACTIVITY LOG</h3>
          <span style={{ color: '#64748b', fontSize: 11 }}>每 15 秒更新</span>
        </div>
        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>載入中…</div>
        ) : lines.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>尚無活動記錄</div>
        ) : (
          <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 2, maxHeight: 500, overflowY: 'auto' }}>
            {lines.map((line, i) => (
              <div key={i} style={{ color: parseLevel(line), borderBottom: '1px solid #0f172a', paddingBottom: 2, marginBottom: 2, wordBreak: 'break-all' }}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Scripts ───────────────────────────────────────────────────────────────────
const AutoScriptsPage: React.FC = () => {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/openclaw/automations`, { headers });
      const d = await r.json();
      setAutomations(Array.isArray(d) ? d : d.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useInterval(load, 60000);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>載入中…</div>
      ) : automations.length === 0 ? (
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 40, textAlign: 'center', color: '#64748b' }}>
          尚無自動化腳本記錄
        </div>
      ) : (
        automations.map((a: any, i) => (
          <div key={i} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${a.status === 'active' ? '#10b98133' : '#33415533'}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{a.name || a.title}</div>
                {a.schedule && <div style={{ color: '#64748b', fontSize: 11 }}>⏰ {a.schedule}</div>}
              </div>
              <span style={{ color: a.status === 'active' ? '#10b981' : '#64748b', fontSize: 11, background: a.status === 'active' ? '#10b98122' : '#33415544', padding: '3px 10px', borderRadius: 4 }}>
                {(a.status || 'unknown').toUpperCase()}
              </span>
            </div>
            {a.description && <div style={{ color: '#94a3b8', fontSize: 12 }}>{a.description}</div>}
          </div>
        ))
      )}
    </div>
  );
};

// ── Backup ────────────────────────────────────────────────────────────────────
const BackupPage: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/openclaw/runs?limit=10`, { headers });
      const d = await r.json();
      setRuns(Array.isArray(d) ? d : d.data || d.runs || []);
    } catch {}
    setLoading(false);
  }, []);

  useInterval(load, 60000);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>RECENT RUNS</h3>
        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>載入中…</div>
        ) : runs.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>尚無執行記錄</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {runs.map((r: any, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: `1px solid ${r.status === 'success' ? '#10b98122' : r.status === 'failed' ? '#ef444422' : '#33415522'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                <span style={{ color: '#e2e8f0' }}>{r.name || r.task_name || r.id}</span>
                <span style={{ color: r.status === 'success' ? '#10b981' : r.status === 'failed' ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{r.status}</span>
                <span style={{ color: '#64748b' }}>{r.duration_ms ? `${Math.round(r.duration_ms / 1000)}s` : '—'}</span>
                <span style={{ color: '#475569', textAlign: 'right', fontSize: 10 }}>{r.created_at ? new Date(r.created_at).toLocaleString('zh-TW') : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Overview ──────────────────────────────────────────────────────────────────
const AutomationOverview: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [executor, setExecutor] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/health`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/openclaw/auto-executor/status`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/n8n/workflows`, { headers }).then(r => r.json()).catch(() => null),
    ]).then(([h, e, w]) => {
      setHealth(h);
      setExecutor(e);
      setWorkflows(w?.data || []);
    });
  }, []);

  const activeWorkflows = workflows.filter(w => w.active).length;

  const modules = [
    { id: 'n8n', name: 'N8N 工作流', icon: '⚡', desc: workflows.length ? `${activeWorkflows} / ${workflows.length} 啟用中` : '載入中…', path: '/center/automation/n8n' },
    { id: 'executor', name: '自動執行器', icon: '🤖', desc: executor?.isRunning ? `運行中 · 今日 ${executor.totalExecutedToday} 次` : '已停止', path: '/center/automation/executor' },
    { id: 'patrol', name: '系統巡邏', icon: '🛡️', desc: health?.ok ? `v${health.version} · uptime ${Math.round((health.uptime || 0) / 60)}m` : '載入中…', path: '/center/automation/patrol' },
    { id: 'scripts', name: '自動化腳本', icon: '📜', desc: '排程自動化任務', path: '/center/automation/scripts' },
    { id: 'backup', name: '執行記錄', icon: '💾', desc: '任務執行歷史', path: '/center/automation/backup' },
    { id: 'telegram', name: 'Activity Log', icon: '📡', desc: '系統活動日誌', path: '/center/automation/telegram' },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Active Workflows', value: workflows.length ? String(activeWorkflows) : '…', color: '#10b981' },
          { label: 'Tasks Today', value: executor ? String(executor.totalExecutedToday) : '…', color: '#38bdf8' },
          { label: 'Server Status', value: health?.ok ? 'OK' : '…', color: health?.ok ? '#a855f7' : '#ef4444' },
          { label: 'Executor', value: executor ? (executor.isRunning ? 'ON' : 'OFF') : '…', color: executor?.isRunning ? '#10b981' : '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${s.color}33`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ color: s.color, fontSize: 26, fontWeight: 700, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {modules.map(m => (
          <Link key={m.id} to={m.path} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#a855f7')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e3a5f')}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{m.icon}</div>
              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{m.name}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{m.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AutomationDeck() {
  const { module } = useParams<{ module?: string }>();

  const moduleMap: Record<string, { name: string; component: React.FC }> = {
    n8n: { name: 'N8N 工作流', component: N8NPage },
    executor: { name: '自動執行器', component: ExecutorPage },
    patrol: { name: '系統巡邏', component: PatrolPage },
    scripts: { name: '自動化腳本', component: AutoScriptsPage },
    backup: { name: '執行記錄', component: BackupPage },
    telegram: { name: 'Activity Log', component: TelegramPage },
  };

  const current = module ? moduleMap[module] : null;
  const PageComponent = current?.component;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0118 0%, #110828 50%, #0a0118 100%)', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid #2d1458', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/center/automation" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>自動化甲板</Link>
        {current && (
          <>
            <span style={{ color: '#334155' }}>›</span>
            <span style={{ color: '#a855f7', fontSize: 13 }}>{current.name}</span>
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(moduleMap).map(([key, val]) => (
            <Link key={key} to={`/center/automation/${key}`} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, background: module === key ? '#a855f722' : 'transparent', color: module === key ? '#a855f7' : '#64748b', border: `1px solid ${module === key ? '#a855f7' : 'transparent'}`, cursor: 'pointer' }}>
                {val.name}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {!module ? (
            <>
              <h1 style={{ color: '#a855f7', fontSize: 28, fontWeight: 300, letterSpacing: 4, marginBottom: 8 }}>自動化甲板</h1>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>AUTOMATION DECK · N8N · 執行器 · 巡邏 · Activity Log</p>
              <AutomationOverview />
            </>
          ) : PageComponent ? (
            <>
              <h2 style={{ color: '#a855f7', fontSize: 22, fontWeight: 300, letterSpacing: 3, marginBottom: 20 }}>
                {current?.name}
              </h2>
              <PageComponent />
            </>
          ) : (
            <div style={{ color: '#ef4444', padding: 40, textAlign: 'center' }}>模組不存在：{module}</div>
          )}
        </div>
      </div>
    </div>
  );
}
