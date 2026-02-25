import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

// ── Hook ─────────────────────────────────────────────────────────────────────
function useAutomationStatus() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 3000);
    return () => clearInterval(t);
  }, []);
  return { tick };
}

// ── N8N Workflows ─────────────────────────────────────────────────────────────
const N8NPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const workflows = [
    { id: 'wf001', name: '每週工作總報告', active: true, executions: 48, lastRun: '6h ago', trigger: 'schedule', tags: ['report', 'weekly'] },
    { id: 'wf002', name: 'Telegram 指令接收器', active: true, executions: 1243, lastRun: '2m ago', trigger: 'webhook', tags: ['telegram', 'bot'] },
    { id: 'wf003', name: '任務自動派工', active: true, executions: 312, lastRun: '15m ago', trigger: 'webhook', tags: ['tasks', 'automation'] },
    { id: 'wf004', name: 'AI 日誌摘要', active: true, executions: 87, lastRun: '2h ago', trigger: 'schedule', tags: ['ai', 'digest'] },
    { id: 'wf005', name: '系統健康巡邏', active: true, executions: 2904, lastRun: '30s ago', trigger: 'schedule', tags: ['monitor', 'health'] },
    { id: 'wf006', name: '資料備份 & 同步', active: false, executions: 14, lastRun: '3d ago', trigger: 'schedule', tags: ['backup'] },
    { id: 'wf007', name: 'GitHub PR 通知', active: false, executions: 28, lastRun: '7d ago', trigger: 'webhook', tags: ['github', 'notify'] },
  ];

  const filtered = workflows.filter(w =>
    activeFilter === 'all' ? true : activeFilter === 'active' ? w.active : !w.active
  );

  const triggerColor: Record<string, string> = {
    schedule: '#a855f7',
    webhook: '#38bdf8',
    manual: '#f59e0b',
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Active Workflows', value: workflows.filter(w => w.active).length.toString(), color: '#10b981' },
          { label: 'Total Executions', value: '4,636', color: '#38bdf8' },
          { label: 'Success Rate', value: '99.2%', color: '#a855f7' },
          { label: 'Avg Duration', value: '1.4s', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${s.color}33`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ color: s.color, fontSize: 24, fontWeight: 700, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Workflow list */}
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
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(wf => (
            <div key={wf.id} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${wf.active ? '#10b98133' : '#33415533'}`, borderRadius: 8, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr auto auto auto 100px', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 13, marginBottom: 4 }}>{wf.name}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {wf.tags.map(tag => (
                    <span key={tag} style={{ color: '#64748b', fontSize: 10, background: '#1e293b', padding: '1px 6px', borderRadius: 3 }}>#{tag}</span>
                  ))}
                </div>
              </div>
              <span style={{ color: triggerColor[wf.trigger], fontSize: 11, background: `${triggerColor[wf.trigger]}1a`, padding: '2px 8px', borderRadius: 4 }}>{wf.trigger}</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>{wf.executions.toLocaleString()} runs</span>
              <span style={{ color: '#475569', fontSize: 11 }}>{wf.lastRun}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 16, borderRadius: 8, background: wf.active ? '#10b981' : '#334155', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: wf.active ? 14 : 2, transition: 'left 0.2s' }} />
                </div>
                <span style={{ color: wf.active ? '#10b981' : '#64748b', fontSize: 11 }}>{wf.active ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Executor ──────────────────────────────────────────────────────────────────
const ExecutorPage: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<Array<{ time: string; msg: string; level: string }>>([
    { time: '08:14:22', msg: '自動執行器啟動', level: 'info' },
    { time: '08:14:23', msg: '掃描待執行任務... 找到 12 項', level: 'info' },
    { time: '08:14:25', msg: '[TASK-1482] 執行: 資料庫備份', level: 'exec' },
    { time: '08:14:67', msg: '[TASK-1482] 完成 (42s)', level: 'ok' },
    { time: '08:15:10', msg: '[TASK-1483] 執行: 日誌清理', level: 'exec' },
    { time: '08:15:18', msg: '[TASK-1483] 完成 (8s)', level: 'ok' },
  ]);

  const queue = [
    { id: 'T-1484', name: '同步 n8n 設定檔', priority: 'high', eta: '2m' },
    { id: 'T-1485', name: '產生每週報告', priority: 'medium', eta: '5m' },
    { id: 'T-1486', name: '清理過期 session', priority: 'low', eta: '1m' },
    { id: 'T-1487', name: 'SSL 憑證檢查', priority: 'high', eta: '30s' },
  ];

  const toggle = async () => {
    const action = running ? 'stop' : 'start';
    try {
      await fetch(`/api/openclaw/auto-executor/${action}`, { method: 'POST' });
    } catch {}
    setRunning(!running);
    const now = new Date().toLocaleTimeString('en', { hour12: false });
    setLog(prev => [...prev, { time: now, msg: running ? '自動執行器已停止' : '自動執行器已啟動', level: running ? 'warn' : 'ok' }]);
  };

  const priorityColor = (p: string) => p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#64748b';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Status */}
        <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${running ? '#10b98155' : '#1e3a5f'}`, borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ color: '#38bdf8', margin: '0 0 4px', fontSize: 16 }}>AUTO EXECUTOR</h3>
              <div style={{ color: running ? '#10b981' : '#ef4444', fontSize: 12 }}>
                {running ? '● 運行中' : '● 已停止'}
              </div>
            </div>
            <button onClick={toggle} style={{ background: running ? '#ef4444' : '#10b981', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              {running ? 'STOP' : 'START'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Completed Today', value: '38' },
              { label: 'In Queue', value: queue.length.toString() },
              { label: 'Avg Duration', value: '28s' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Queue */}
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>EXECUTION QUEUE</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {queue.map((item, i) => (
              <div key={item.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#475569', fontSize: 11, minWidth: 20 }}>#{i + 1}</span>
                  <code style={{ color: '#38bdf8', fontSize: 11 }}>{item.id}</code>
                  <span style={{ color: '#e2e8f0', fontSize: 12 }}>{item.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: priorityColor(item.priority), fontSize: 10, background: `${priorityColor(item.priority)}1a`, padding: '2px 8px', borderRadius: 4 }}>{item.priority}</span>
                  <span style={{ color: '#64748b', fontSize: 11 }}>ETA {item.eta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Log terminal */}
      <div style={{ background: '#000', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, letterSpacing: 1 }}>EXECUTOR LOG</div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8 }}>
          {log.map((entry, i) => (
            <div key={i} style={{ color: entry.level === 'ok' ? '#10b981' : entry.level === 'exec' ? '#38bdf8' : entry.level === 'warn' ? '#f59e0b' : '#94a3b8' }}>
              <span style={{ color: '#475569' }}>[{entry.time}]</span> {entry.msg}
            </div>
          ))}
          {running && <div style={{ color: '#38bdf8', animation: 'none' }}>▌</div>}
        </div>
      </div>
    </div>
  );
};

// ── Patrol ────────────────────────────────────────────────────────────────────
const PatrolPage: React.FC = () => {
  const { tick } = useAutomationStatus();
  const now = new Date().toLocaleTimeString('en', { hour12: false });

  const checks = [
    { id: 'c01', name: 'Server HTTP Response', endpoint: 'GET /api/health', status: 'pass', latency: 12, lastCheck: now },
    { id: 'c02', name: 'Database Connection', endpoint: 'postgresql://localhost:5432', status: 'pass', latency: 3, lastCheck: now },
    { id: 'c03', name: 'n8n Webhook', endpoint: 'GET /n8n-health', status: 'pass', latency: 28, lastCheck: now },
    { id: 'c04', name: 'Redis Ping', endpoint: 'PING redis:6379', status: 'pass', latency: 1, lastCheck: now },
    { id: 'c05', name: 'MinIO Bucket', endpoint: 's3://openclaw-bucket', status: 'warn', latency: 145, lastCheck: now },
    { id: 'c06', name: 'Telegram Bot API', endpoint: 'telegram.org/bot/getMe', status: 'pass', latency: 340, lastCheck: now },
    { id: 'c07', name: 'Ollama LLM', endpoint: 'GET /ollama/api/tags', status: 'pass', latency: 5, lastCheck: now },
  ];

  const statusColor = (s: string) => s === 'pass' ? '#10b981' : s === 'warn' ? '#f59e0b' : '#ef4444';

  const overallPass = checks.filter(c => c.status === 'pass').length;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Overall */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ color: '#38bdf8', margin: '0 0 8px', fontSize: 16, letterSpacing: 2 }}>SYSTEM PATROL</h3>
          <div style={{ color: '#64748b', fontSize: 12 }}>每 30 秒自動巡邏 · 發現異常立即通報 Telegram</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#10b981', fontSize: 40, fontWeight: 700 }}>{overallPass}/{checks.length}</div>
          <div style={{ color: '#64748b', fontSize: 11 }}>CHECKS PASSING</div>
        </div>
      </div>

      {/* Check list */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>HEALTH CHECKS</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {checks.map(c => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 80px 60px 80px', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: `1px solid ${statusColor(c.status)}22`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
              <span style={{ color: '#e2e8f0' }}>{c.name}</span>
              <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{c.endpoint}</span>
              <span style={{ color: c.latency > 100 ? '#f59e0b' : '#10b981', textAlign: 'right' }}>{c.latency}ms</span>
              <span style={{ color: statusColor(c.status), fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>{c.status}</span>
              <span style={{ color: '#475569', fontSize: 10, textAlign: 'right' }}>{c.lastCheck}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Patrol log */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>PATROL LOG</h3>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', lineHeight: 1.8 }}>
          <div><span style={{ color: '#10b981' }}>[PASS]</span> <span style={{ color: '#475569' }}>08:14:30</span> All 7 checks passing · latency avg 76ms</div>
          <div><span style={{ color: '#10b981' }}>[PASS]</span> <span style={{ color: '#475569' }}>08:14:00</span> All 7 checks passing · latency avg 73ms</div>
          <div><span style={{ color: '#f59e0b' }}>[WARN]</span> <span style={{ color: '#475569' }}>08:12:30</span> minio-storage latency spike: 342ms (threshold 200ms)</div>
          <div><span style={{ color: '#64748b' }}>[INFO]</span> <span style={{ color: '#475569' }}>08:12:30</span> Telegram alert sent: minio latency warning</div>
          <div><span style={{ color: '#10b981' }}>[PASS]</span> <span style={{ color: '#475569' }}>08:12:00</span> All 7 checks passing</div>
        </div>
      </div>
    </div>
  );
};

// ── Scripts (Automation) ──────────────────────────────────────────────────────
const AutoScriptsPage: React.FC = () => {
  const automations = [
    {
      name: '夜間任務清算', schedule: '02:00 daily', status: 'active', nextRun: '今晚 02:00',
      steps: ['掃描未完成任務', '通知負責人', '標記 overdue', '更新統計報表']
    },
    {
      name: '每週文明指數計算', schedule: 'Sunday 00:00', status: 'active', nextRun: '週日 00:00',
      steps: ['讀取各維度數據', '計算 MDCI 分數', '生成週報', '發送 Telegram 摘要']
    },
    {
      name: '資源使用快照', schedule: 'every 1h', status: 'active', nextRun: '09:00',
      steps: ['收集 CPU/MEM 指標', '寫入 DB', '超過閾值告警']
    },
    {
      name: '模型知識同步', schedule: 'Monday 03:00', status: 'paused', nextRun: '暫停中',
      steps: ['下載最新知識庫', '更新向量索引', '測試問答品質']
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {automations.map((a, i) => (
        <div key={i} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${a.status === 'active' ? '#10b98133' : '#33415533'}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
                <span>⏰ {a.schedule}</span>
                <span>→ 下次執行：{a.nextRun}</span>
              </div>
            </div>
            <span style={{ color: a.status === 'active' ? '#10b981' : '#64748b', fontSize: 11, background: a.status === 'active' ? '#10b98122' : '#33415544', padding: '3px 10px', borderRadius: 4 }}>
              {a.status === 'active' ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {a.steps.map((step, si) => (
              <React.Fragment key={step}>
                {si > 0 && <div style={{ color: '#334155', fontSize: 12 }}>→</div>}
                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #1e293b', borderRadius: 6, padding: '4px 10px', color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {step}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Backup ────────────────────────────────────────────────────────────────────
const BackupPage: React.FC = () => {
  const backups = [
    { id: 'bk-20260226-0200', type: 'full', size: '412 MB', status: 'success', duration: '45s', time: '08:00 today' },
    { id: 'bk-20260225-0200', type: 'full', size: '409 MB', status: 'success', duration: '43s', time: 'yesterday' },
    { id: 'bk-20260224-0200', type: 'full', size: '405 MB', status: 'success', duration: '44s', time: '2d ago' },
    { id: 'bk-20260223-0200', type: 'full', size: '401 MB', status: 'success', duration: '41s', time: '3d ago' },
    { id: 'bk-20260222-0200', type: 'full', size: '398 MB', status: 'failed', duration: '0s', time: '4d ago' },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Storage meter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { label: 'Local Backups', value: '5 / 30 days', color: '#38bdf8', pct: 17 },
          { label: 'S3 Storage Used', value: '12.4 GB / 100 GB', color: '#a855f7', pct: 12 },
          { label: 'Last Success', value: '6h ago', color: '#10b981', pct: 100 },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${s.color}33`, borderRadius: 10, padding: 16 }}>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>{s.label}</div>
            <div style={{ height: 4, background: '#1e293b', borderRadius: 2 }}>
              <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Backup history */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#38bdf8', margin: 0, fontSize: 14, letterSpacing: 2 }}>BACKUP HISTORY</h3>
          <button style={{ background: '#38bdf8', border: 'none', color: '#000', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            RUN BACKUP NOW
          </button>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {backups.map(b => (
            <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '220px 60px 80px 80px 60px 1fr', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: `1px solid ${b.status === 'success' ? '#10b98122' : '#ef444422'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
              <code style={{ color: '#64748b', fontSize: 10 }}>{b.id}</code>
              <span style={{ color: '#a855f7' }}>{b.type}</span>
              <span style={{ color: '#e2e8f0' }}>{b.size}</span>
              <span style={{ color: b.status === 'success' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{b.status}</span>
              <span style={{ color: '#64748b' }}>{b.duration}</span>
              <span style={{ color: '#475569', textAlign: 'right' }}>{b.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Telegram ──────────────────────────────────────────────────────────────────
const TelegramPage: React.FC = () => {
  const { tick } = useAutomationStatus();

  const messages = [
    { dir: 'in', text: '/status', time: '08:14:20', from: 'openclaw-owner' },
    { dir: 'out', text: '✅ 系統狀態正常\nCPU: 18% · MEM: 42%\n7/7 服務運行中', time: '08:14:21', from: 'bot' },
    { dir: 'in', text: '/tasks summary', time: '08:12:10', from: 'openclaw-owner' },
    { dir: 'out', text: '📋 任務摘要\n完成: 38 今日\n待執行: 4\n最高優先: SSL憑證檢查', time: '08:12:11', from: 'bot' },
    { dir: 'in', text: '/mdci', time: '08:10:05', from: 'openclaw-owner' },
    { dir: 'out', text: '🌐 MDCI 文明指數: 3.67/5.00\nE:100% I:100% V:100%\nS:100% C:100% D:100%', time: '08:10:06', from: 'bot' },
  ];

  const commands = [
    { cmd: '/status', desc: '系統狀態總覽' },
    { cmd: '/tasks [summary|list]', desc: '任務狀態查詢' },
    { cmd: '/mdci', desc: '文明指數查詢' },
    { cmd: '/deploy [prod|staging]', desc: '觸發部署流程' },
    { cmd: '/backup now', desc: '立即執行備份' },
    { cmd: '/patrol', desc: '執行一次系統巡邏' },
    { cmd: '/alert off [minutes]', desc: '暫停告警指定分鐘' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
      {/* Chat */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>TELEGRAM CHAT LOG</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {[...messages].reverse().map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.dir === 'in' ? 'flex-start' : 'flex-end' }}>
              <div style={{ maxWidth: '70%', background: msg.dir === 'in' ? '#1e293b' : '#1e3a5f', border: `1px solid ${msg.dir === 'in' ? '#334155' : '#38bdf833'}`, borderRadius: 10, padding: '8px 14px' }}>
                <div style={{ color: '#475569', fontSize: 10, marginBottom: 4 }}>{msg.from} · {msg.time}</div>
                <div style={{ color: '#e2e8f0', fontSize: 12, whiteSpace: 'pre-line', fontFamily: 'monospace' }}>{msg.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Commands */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 20 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 14px', fontSize: 13, letterSpacing: 2 }}>COMMAND REGISTRY</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {commands.map(c => (
            <div key={c.cmd} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '8px 10px' }}>
              <code style={{ color: '#38bdf8', fontSize: 11 }}>{c.cmd}</code>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{c.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid #10b98144', borderRadius: 8 }}>
          <div style={{ color: '#10b981', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>BOT STATUS</div>
          <div style={{ color: '#94a3b8', fontSize: 11 }}>● Online · 1 authorized user</div>
          <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Last message: 2m ago</div>
        </div>
      </div>
    </div>
  );
};

// ── Overview ──────────────────────────────────────────────────────────────────
const AutomationOverview: React.FC = () => {
  const modules = [
    { id: 'n8n', name: 'N8N 工作流', icon: '⚡', desc: '7 個工作流 · 5 個啟用中', path: '/center/automation/n8n' },
    { id: 'executor', name: '自動執行器', icon: '🤖', desc: '任務自動執行引擎', path: '/center/automation/executor' },
    { id: 'patrol', name: '系統巡邏', icon: '🛡️', desc: '7/7 健康檢查通過', path: '/center/automation/patrol' },
    { id: 'scripts', name: '自動化腳本', icon: '📜', desc: '4 個排程自動化', path: '/center/automation/scripts' },
    { id: 'backup', name: '備份管理', icon: '💾', desc: '每日 02:00 自動備份', path: '/center/automation/backup' },
    { id: 'telegram', name: 'Telegram Bot', icon: '📡', desc: '指令控制介面', path: '/center/automation/telegram' },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Active Workflows', value: '5', color: '#10b981' },
          { label: 'Tasks Completed', value: '38', color: '#38bdf8' },
          { label: 'Health Checks', value: '7/7', color: '#a855f7' },
          { label: 'Backups OK', value: '4/5', color: '#f59e0b' },
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
    backup: { name: '備份管理', component: BackupPage },
    telegram: { name: 'Telegram Bot', component: TelegramPage },
  };

  const current = module ? moduleMap[module] : null;
  const PageComponent = current?.component;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0118 0%, #110828 50%, #0a0118 100%)', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
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

      {/* Content */}
      <div style={{ padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {!module ? (
            <>
              <h1 style={{ color: '#a855f7', fontSize: 28, fontWeight: 300, letterSpacing: 4, marginBottom: 8 }}>自動化甲板</h1>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>AUTOMATION DECK · N8N · 執行器 · 巡邏 · 備份 · Telegram</p>
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
