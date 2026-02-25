import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

// ── Shared types ────────────────────────────────────────────────────────────
interface ServiceNode {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  cpu: number;
  mem: number;
  uptime: string;
}

interface DBTable {
  name: string;
  rows: number;
  size: string;
  lastVacuum: string;
}

interface NetInterface {
  name: string;
  ip: string;
  rx: number;
  tx: number;
  status: 'up' | 'down';
}

// ── Hook ─────────────────────────────────────────────────────────────────────
function useInfraStatus() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const jitter = (base: number, range: number) =>
    Math.max(0, Math.min(100, base + (Math.random() - 0.5) * range * 2));

  const services: ServiceNode[] = [
    { id: 's1', name: 'openclaw-server', status: 'healthy', cpu: jitter(18, 5), mem: jitter(42, 8), uptime: '12d 4h 32m' },
    { id: 's2', name: 'nginx-proxy', status: 'healthy', cpu: jitter(4, 2), mem: jitter(12, 3), uptime: '12d 4h 35m' },
    { id: 's3', name: 'postgresql', status: 'healthy', cpu: jitter(9, 4), mem: jitter(31, 6), uptime: '12d 4h 35m' },
    { id: 's4', name: 'n8n-workflow', status: 'healthy', cpu: jitter(6, 3), mem: jitter(55, 10), uptime: '8d 2h 11m' },
    { id: 's5', name: 'redis-cache', status: 'healthy', cpu: jitter(2, 1), mem: jitter(8, 2), uptime: '12d 4h 35m' },
    { id: 's6', name: 'minio-storage', status: 'degraded', cpu: jitter(5, 3), mem: jitter(20, 5), uptime: '3d 6h 44m' },
  ];

  const tables: DBTable[] = [
    { name: 'tasks', rows: 1482 + tick, size: '4.2 MB', lastVacuum: '2h ago' },
    { name: 'users', rows: 38, size: '0.1 MB', lastVacuum: '6h ago' },
    { name: 'idea_logs', rows: 312, size: '1.8 MB', lastVacuum: '4h ago' },
    { name: 'activity_logs', rows: 9431 + tick * 3, size: '22.1 MB', lastVacuum: '30m ago' },
    { name: 'executions', rows: 2847 + tick, size: '8.7 MB', lastVacuum: '1h ago' },
    { name: 'workflows', rows: 61, size: '3.4 MB', lastVacuum: '3h ago' },
    { name: 'agents', rows: 14, size: '0.2 MB', lastVacuum: '1d ago' },
    { name: 'memory_entries', rows: 1847, size: '6.1 MB', lastVacuum: '30m ago' },
    { name: 'patrol_logs', rows: 4219, size: '9.8 MB', lastVacuum: '15m ago' },
    { name: 'proposals', rows: 23, size: '0.5 MB', lastVacuum: '4h ago' },
    { name: 'deployments', rows: 89, size: '1.2 MB', lastVacuum: '2h ago' },
    { name: 'checkpoints', rows: 312, size: '7.4 MB', lastVacuum: '1h ago' },
    { name: 'sessions', rows: 47, size: '0.3 MB', lastVacuum: '5m ago' },
    { name: 'knowledge_base', rows: 131, size: '4.8 MB', lastVacuum: '3h ago' },
  ];

  const netInterfaces: NetInterface[] = [
    { name: 'eth0', ip: '10.0.0.1', rx: jitter(150, 40), tx: jitter(80, 25), status: 'up' },
    { name: 'lo0', ip: '127.0.0.1', rx: jitter(20, 5), tx: jitter(20, 5), status: 'up' },
    { name: 'docker0', ip: '172.17.0.1', rx: jitter(45, 15), tx: jitter(38, 12), status: 'up' },
  ];

  return { services, tables, netInterfaces, tick };
}

// ── Architecture ─────────────────────────────────────────────────────────────
const ArchitecturePage: React.FC = () => {
  const { services } = useInfraStatus();

  const statusColor = (s: ServiceNode['status']) =>
    s === 'healthy' ? '#10b981' : s === 'degraded' ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 20px', fontSize: 16, letterSpacing: 2 }}>
          SYSTEM ARCHITECTURE MAP
        </h3>

        {/* Topology diagram */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          {/* Internet */}
          <div style={{ background: '#1e3a5f', border: '1px solid #38bdf8', borderRadius: 8, padding: '8px 24px', color: '#38bdf8', fontSize: 12, letterSpacing: 2 }}>
            INTERNET
          </div>
          <div style={{ width: 2, height: 20, background: '#38bdf8', opacity: 0.5 }} />
          {/* Nginx */}
          <div style={{ background: '#0f2a4a', border: '1px solid #10b981', borderRadius: 8, padding: '8px 32px', color: '#10b981', fontSize: 12, letterSpacing: 1 }}>
            NGINX PROXY · :80/:443
          </div>
          <div style={{ width: 2, height: 20, background: '#10b981', opacity: 0.5 }} />
          {/* App Layer */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 1, height: 20, background: '#a855f7', opacity: 0.5, margin: '0 auto' }} />
              <div style={{ background: '#1a0a2e', border: '1px solid #a855f7', borderRadius: 8, padding: '8px 16px', color: '#a855f7', fontSize: 11 }}>
                OPENCLAW<br />:3011
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 1, height: 20, background: '#f59e0b', opacity: 0.5, margin: '0 auto' }} />
              <div style={{ background: '#1a0f00', border: '1px solid #f59e0b', borderRadius: 8, padding: '8px 16px', color: '#f59e0b', fontSize: 11 }}>
                N8N<br />:5678
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 1, height: 20, background: '#38bdf8', opacity: 0.5, margin: '0 auto' }} />
              <div style={{ background: '#0a1a2e', border: '1px solid #38bdf8', borderRadius: 8, padding: '8px 16px', color: '#38bdf8', fontSize: 11 }}>
                MINIO<br />:9000
              </div>
            </div>
          </div>
          <div style={{ width: 2, height: 20, background: '#64748b', opacity: 0.5 }} />
          {/* Data Layer */}
          <div style={{ display: 'flex', gap: 20 }}>
            {['PostgreSQL :5432', 'Redis :6379'].map(db => (
              <div key={db} style={{ background: '#0a1a0a', border: '1px solid #10b981', borderRadius: 8, padding: '8px 16px', color: '#10b981', fontSize: 11, textAlign: 'center' }}>
                {db}
              </div>
            ))}
          </div>
        </div>

        {/* Service list */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {services.map(svc => (
            <div key={svc.id} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${statusColor(svc.status)}33`, borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{svc.name}</span>
                <span style={{ color: statusColor(svc.status), fontSize: 11, background: `${statusColor(svc.status)}1a`, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                  {svc.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                <span>CPU {svc.cpu.toFixed(1)}%</span>
                <span>MEM {svc.mem.toFixed(1)}%</span>
                <span style={{ color: '#64748b' }}>{svc.uptime}</span>
              </div>
              {/* CPU bar */}
              <div style={{ marginTop: 8, height: 3, background: '#1e293b', borderRadius: 2 }}>
                <div style={{ width: `${svc.cpu}%`, height: '100%', background: statusColor(svc.status), borderRadius: 2, transition: 'width 1s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Deployment ─────────────────────────────────────────────────────────────
const DeploymentPage: React.FC = () => {
  const deploys = [
    { id: 'd001', env: 'production', branch: 'main', commit: '5d80e2d', by: 'openclaw-owner', time: '剛才', status: 'success', duration: '1m 38s', msg: 'fix: post-push-sync 改用 --rebase' },
    { id: 'd002', env: 'production', branch: 'main', commit: '8d46011', by: 'openclaw-owner', time: '1h前', status: 'success', duration: '1m 44s', msg: 'feat: 即時同步 + 每日版本遞增機制' },
    { id: 'd003', env: 'production', branch: 'main', commit: '70c737d', by: 'openclaw-owner', time: '1d前', status: 'success', duration: '2m 01s', msg: 'feat: 星艦指揮中心 + 13項先進網頁技術' },
    { id: 'd004', env: 'production', branch: 'main', commit: 'ce9278d', by: 'openclaw-owner', time: '2d前', status: 'success', duration: '1m 52s', msg: 'feat: PWA 化 + 控制台頁面 + activity-log API' },
    { id: 'd005', env: 'production', branch: 'main', commit: 'adf6dc8', by: 'openclaw-owner', time: '3d前', status: 'success', duration: '1m 47s', msg: 'feat: 治理引擎 + 暫代派工小蔡' },
    { id: 'd006', env: 'production', branch: 'main', commit: 'b699bf0', by: 'openclaw-owner', time: '4d前', status: 'success', duration: '1m 33s', msg: 'feat: 構想記錄系統 — API + 前端表單' },
    { id: 'd007', env: 'staging', branch: 'feat/infra-deck', commit: 'a3f9c12', by: 'deputy-bot', time: '5d前', status: 'success', duration: '2m 05s', msg: 'feat: InfraDeck + AutomationDeck 初版' },
    { id: 'd008', env: 'staging', branch: 'feat/holoGlobe', commit: 'b1e8f34', by: 'deputy-bot', time: '6d前', status: 'failed', duration: '0m 28s', msg: 'fix: HoloGlobe render crash — rollback' },
  ];

  const statusColor = (s: string) => s === 'success' ? '#10b981' : s === 'failed' ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#38bdf8', margin: 0, fontSize: 16, letterSpacing: 2 }}>DEPLOYMENT HISTORY</h3>
          <button style={{ background: '#10b981', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            DEPLOY NOW
          </button>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {deploys.map(d => (
            <div key={d.id} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${statusColor(d.status)}33`, borderRadius: 8, padding: '12px 16px', display: 'grid', gridTemplateColumns: '80px 100px 1fr 1fr 80px 80px', gap: 12, alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: statusColor(d.status), fontWeight: 700, textTransform: 'uppercase' }}>{d.status}</span>
              <span style={{ color: '#f59e0b', background: '#1a1000', padding: '2px 8px', borderRadius: 4 }}>{d.env}</span>
              <span style={{ color: '#94a3b8' }}>{d.branch} · <code style={{ color: '#38bdf8' }}>{d.commit}</code></span>
              <span style={{ color: '#94a3b8', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{('msg' in d) ? String(d.msg) : ''}</span>
              <span style={{ color: '#64748b' }}>{d.duration}</span>
              <span style={{ color: '#475569' }}>{d.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CI/CD Pipeline */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>PIPELINE STAGES</h3>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[
            { name: 'Lint', status: 'pass', duration: '12s' },
            { name: 'Build', status: 'pass', duration: '48s' },
            { name: 'Test', status: 'pass', duration: '23s' },
            { name: 'Docker', status: 'pass', duration: '1m 2s' },
            { name: 'Deploy', status: 'pass', duration: '18s' },
            { name: 'Smoke', status: 'pass', duration: '8s' },
          ].map((stage, i) => (
            <React.Fragment key={stage.name}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: '#10b98155' }} />}
              <div style={{ textAlign: 'center', minWidth: 64 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10b98122', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', color: '#10b981', fontSize: 16 }}>✓</div>
                <div style={{ color: '#e2e8f0', fontSize: 11 }}>{stage.name}</div>
                <div style={{ color: '#64748b', fontSize: 10 }}>{stage.duration}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Database ─────────────────────────────────────────────────────────────────
const DatabasePage: React.FC = () => {
  const { tables } = useInfraStatus();

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total Tables', value: '14', color: '#38bdf8' },
          { label: 'Total Rows', value: `${(18200 + tick * 5).toLocaleString()}`, color: '#10b981' },
          { label: 'DB Size', value: '412 MB', color: '#a855f7' },
          { label: 'Active Conn', value: '7 / 100', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${s.color}33`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ color: s.color, fontSize: 24, fontWeight: 700, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table list */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>TABLE REGISTRY</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              {['Table', 'Rows', 'Size', 'Last Vacuum', 'Health'].map(h => (
                <th key={h} style={{ color: '#64748b', padding: '8px 12px', textAlign: 'left', fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tables.map(t => (
              <tr key={t.name} style={{ borderBottom: '1px solid #0f172a' }}>
                <td style={{ padding: '10px 12px', color: '#38bdf8', fontFamily: 'monospace' }}>{t.name}</td>
                <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{t.rows.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', color: '#a855f7' }}>{t.size}</td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>{t.lastVacuum}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ color: '#10b981', fontSize: 10, background: '#10b98122', padding: '2px 8px', borderRadius: 4 }}>HEALTHY</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Query monitor */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>SLOW QUERY LOG</h3>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', lineHeight: 1.8 }}>
          <div><span style={{ color: '#f59e0b' }}>2026-02-26 08:14:22</span> <span style={{ color: '#64748b' }}>[8ms]</span> SELECT * FROM activity_logs WHERE created_at &gt; NOW()-INTERVAL '1h'</div>
          <div><span style={{ color: '#f59e0b' }}>2026-02-26 08:11:05</span> <span style={{ color: '#64748b' }}>[12ms]</span> SELECT tasks.*, executions.status FROM tasks JOIN executions ON tasks.id=...</div>
          <div><span style={{ color: '#f59e0b' }}>2026-02-26 07:58:33</span> <span style={{ color: '#64748b' }}>[6ms]</span> UPDATE tasks SET status='done' WHERE id IN (SELECT id FROM tasks WHERE ...)</div>
          <div><span style={{ color: '#10b981' }}>— No critical slow queries in past 24h —</span></div>
        </div>
      </div>
    </div>
  );
};

// ── Networking ─────────────────────────────────────────────────────────────
const NetworkingPage: React.FC = () => {
  const { netInterfaces } = useInfraStatus();

  const dnsRecords = [
    { type: 'A', name: 'openclaw.internal', value: '10.0.0.1', ttl: 300 },
    { type: 'CNAME', name: 'api.openclaw.internal', value: 'openclaw.internal', ttl: 300 },
    { type: 'A', name: 'n8n.openclaw.internal', value: '10.0.0.2', ttl: 300 },
    { type: 'A', name: 'minio.openclaw.internal', value: '10.0.0.3', ttl: 300 },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Network interfaces */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>NETWORK INTERFACES</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {netInterfaces.map(iface => (
            <div key={iface.name} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: 14 }}>{iface.name}</span>
                <span style={{ color: '#e2e8f0', fontSize: 12 }}>{iface.ip}</span>
                <span style={{ color: iface.status === 'up' ? '#10b981' : '#ef4444', fontSize: 11, background: iface.status === 'up' ? '#10b98122' : '#ef444422', padding: '2px 8px', borderRadius: 4 }}>
                  {iface.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>RX (Mbps)</div>
                  <div style={{ height: 6, background: '#1e293b', borderRadius: 3 }}>
                    <div style={{ width: `${(iface.rx / 200) * 100}%`, height: '100%', background: '#10b981', borderRadius: 3, transition: 'width 1s' }} />
                  </div>
                  <div style={{ color: '#10b981', fontSize: 11, marginTop: 4 }}>{iface.rx.toFixed(1)} Mbps</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>TX (Mbps)</div>
                  <div style={{ height: 6, background: '#1e293b', borderRadius: 3 }}>
                    <div style={{ width: `${(iface.tx / 200) * 100}%`, height: '100%', background: '#38bdf8', borderRadius: 3, transition: 'width 1s' }} />
                  </div>
                  <div style={{ color: '#38bdf8', fontSize: 11, marginTop: 4 }}>{iface.tx.toFixed(1)} Mbps</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DNS */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>DNS RECORDS</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              {['Type', 'Name', 'Value', 'TTL'].map(h => (
                <th key={h} style={{ color: '#64748b', padding: '6px 12px', textAlign: 'left', fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dnsRecords.map(r => (
              <tr key={r.name} style={{ borderBottom: '1px solid #0f172a' }}>
                <td style={{ padding: '8px 12px', color: '#a855f7', fontWeight: 700 }}>{r.type}</td>
                <td style={{ padding: '8px 12px', color: '#38bdf8', fontFamily: 'monospace' }}>{r.name}</td>
                <td style={{ padding: '8px 12px', color: '#10b981', fontFamily: 'monospace' }}>{r.value}</td>
                <td style={{ padding: '8px 12px', color: '#64748b' }}>{r.ttl}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Port map */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>PORT MAP</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
          {[
            { port: '80', service: 'nginx HTTP', open: true },
            { port: '443', service: 'nginx HTTPS', open: true },
            { port: '3011', service: 'openclaw', open: true },
            { port: '5432', service: 'postgresql', open: false },
            { port: '5678', service: 'n8n', open: true },
            { port: '6379', service: 'redis', open: false },
            { port: '9000', service: 'minio', open: true },
            { port: '9001', service: 'minio console', open: true },
          ].map(p => (
            <div key={p.port} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${p.open ? '#10b98133' : '#64748b33'}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ color: p.open ? '#10b981' : '#64748b', fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>:{p.port}</div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{p.service}</div>
              <div style={{ color: p.open ? '#10b981' : '#475569', fontSize: 10, marginTop: 4 }}>{p.open ? 'LISTENING' : 'INTERNAL'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Scripts ───────────────────────────────────────────────────────────────────
const ScriptsPage: React.FC = () => {
  const [runningScript, setRunningScript] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);

  const scripts = [
    { id: 'backup-db', name: 'backup-db.sh', desc: 'PostgreSQL 全量備份', lastRun: '6h ago', duration: '45s', category: 'backup' },
    { id: 'restart-server', name: 'restart-server.sh', desc: '重啟 openclaw server', lastRun: '2h ago', duration: '12s', category: 'ops' },
    { id: 'cleanup-logs', name: 'cleanup-logs.sh', desc: '清理 30 天以前的 logs', lastRun: '1d ago', duration: '8s', category: 'maintenance' },
    { id: 'sync-configs', name: 'sync-configs.sh', desc: '同步設定檔至所有節點', lastRun: '3h ago', duration: '23s', category: 'sync' },
    { id: 'health-check', name: 'health-check.sh', desc: '全服務健康檢查', lastRun: '10m ago', duration: '18s', category: 'monitor' },
    { id: 'update-certs', name: 'update-certs.sh', desc: 'SSL 憑證更新', lastRun: '30d ago', duration: '2m 10s', category: 'security' },
  ];

  const catColor: Record<string, string> = {
    backup: '#38bdf8',
    ops: '#f97316',
    maintenance: '#a855f7',
    sync: '#10b981',
    monitor: '#f59e0b',
    security: '#ef4444',
  };

  const runScript = (id: string) => {
    setRunningScript(id);
    setOutput(['$ Running ' + id + '...']);
    const lines = [
      '[INFO] Initializing...',
      '[INFO] Connecting to services...',
      '[OK] Preflight checks passed',
      '[EXEC] Running main routine...',
      '[OK] Script completed successfully',
      '$ Exit code: 0',
    ];
    lines.forEach((line, i) => {
      setTimeout(() => {
        setOutput(prev => [...prev, line]);
        if (i === lines.length - 1) setRunningScript(null);
      }, (i + 1) * 600);
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        {scripts.map(s => (
          <div key={s.id} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <code style={{ color: '#38bdf8', fontSize: 13 }}>{s.name}</code>
                <span style={{ color: catColor[s.category], fontSize: 10, background: `${catColor[s.category]}1a`, padding: '1px 8px', borderRadius: 4 }}>{s.category}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{s.desc}</div>
              <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>Last: {s.lastRun} · {s.duration}</div>
            </div>
            <button
              onClick={() => runScript(s.id)}
              disabled={runningScript === s.id}
              style={{ background: runningScript === s.id ? '#1e293b' : '#10b981', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: runningScript === s.id ? 'wait' : 'pointer', fontSize: 12, minWidth: 64 }}
            >
              {runningScript === s.id ? '...' : 'RUN'}
            </button>
          </div>
        ))}
      </div>

      {/* Output terminal */}
      <div style={{ background: '#000', border: '1px solid #1e293b', borderRadius: 10, padding: 16 }}>
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, letterSpacing: 1 }}>TERMINAL OUTPUT</div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#10b981', lineHeight: 1.8, minHeight: 200 }}>
          {output.length === 0
            ? <span style={{ color: '#475569' }}>Select a script to run...</span>
            : output.map((line, i) => (
              <div key={i} style={{ color: line.startsWith('[OK]') ? '#10b981' : line.startsWith('[INFO]') ? '#38bdf8' : line.startsWith('$') ? '#f59e0b' : '#e2e8f0' }}>
                {line}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

// ── Monitoring ────────────────────────────────────────────────────────────────
const MonitoringPage: React.FC = () => {
  const { services, tick } = useInfraStatus();
  const ts = new Date().toLocaleTimeString('en', { hour12: false });

  const alerts = [
    { level: 'warn', msg: 'minio-storage CPU > 40% for 5min', time: '8m前' },
    { level: 'info', msg: 'v2.2.0 post-push-sync 自動觸發 — 小蔡同步完成', time: '剛才' },
    { level: 'info', msg: '每日版本遞增任務 launchd 已載入', time: '1h前' },
    { level: 'info', msg: 'n8n 週報 workflow 執行完成 (6m 12s)', time: '3h前' },
    { level: 'warn', msg: 'activity_logs 表超過 9000 rows — 建議清理', time: '4h前' },
    { level: 'info', msg: 'Scheduled backup completed (45s, 412MB)', time: '6h前' },
    { level: 'info', msg: 'Ollama qwen3:8b 模型熱機完成', time: '8h前' },
    { level: 'info', msg: 'SSL certificate renewed (90d)', time: '15d前' },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Metrics overview */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ color: '#38bdf8', margin: 0, fontSize: 14, letterSpacing: 2 }}>LIVE METRICS</h3>
          <span style={{ color: '#10b981', fontSize: 11 }}>{ts}</span>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {services.map(svc => (
            <div key={svc.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 60px', gap: 12, alignItems: 'center' }}>
              <span style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace' }}>{svc.name}</span>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                  <span>CPU</span><span style={{ color: '#f59e0b' }}>{svc.cpu.toFixed(1)}%</span>
                </div>
                <div style={{ height: 4, background: '#1e293b', borderRadius: 2 }}>
                  <div style={{ width: `${svc.cpu}%`, height: '100%', background: svc.cpu > 80 ? '#ef4444' : svc.cpu > 60 ? '#f59e0b' : '#10b981', borderRadius: 2, transition: 'width 1s' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                  <span>MEM</span><span style={{ color: '#a855f7' }}>{svc.mem.toFixed(1)}%</span>
                </div>
                <div style={{ height: 4, background: '#1e293b', borderRadius: 2 }}>
                  <div style={{ width: `${svc.mem}%`, height: '100%', background: '#a855f7', borderRadius: 2, transition: 'width 1s' }} />
                </div>
              </div>
              <span style={{ color: svc.status === 'healthy' ? '#10b981' : '#f59e0b', fontSize: 10, textAlign: 'right' }}>
                {svc.status === 'healthy' ? '●' : '◐'} {svc.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#38bdf8', margin: '0 0 16px', fontSize: 14, letterSpacing: 2 }}>ALERT LOG</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${a.level === 'warn' ? '#f59e0b33' : '#10b98133'}`, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: a.level === 'warn' ? '#f59e0b' : '#10b981', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{a.level}</span>
                <span style={{ color: '#e2e8f0', fontSize: 12 }}>{a.msg}</span>
              </div>
              <span style={{ color: '#475569', fontSize: 11 }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Overview ──────────────────────────────────────────────────────────────────
const InfraOverview: React.FC = () => {
  const { services } = useInfraStatus();
  const healthyCount = services.filter(s => s.status === 'healthy').length;

  const modules = [
    { id: 'architecture', name: '系統架構', icon: '🏗️', desc: '服務拓撲與節點狀態', path: '/center/infra/architecture' },
    { id: 'deployment', name: '部署流水線', icon: '🚀', desc: 'CI/CD 部署歷史', path: '/center/infra/deployment' },
    { id: 'database', name: '資料庫管理', icon: '🗄️', desc: 'PostgreSQL 表與查詢', path: '/center/infra/database' },
    { id: 'networking', name: '網路管理', icon: '🌐', desc: '介面、DNS、端口映射', path: '/center/infra/networking' },
    { id: 'scripts', name: '腳本中心', icon: '📜', desc: 'Ops 腳本執行器', path: '/center/infra/scripts' },
    { id: 'monitoring', name: '即時監控', icon: '📊', desc: '指標、警告與告警', path: '/center/infra/monitoring' },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Services Up', value: `${healthyCount}/${services.length}`, color: '#10b981' },
          { label: 'Deployments Today', value: '3', color: '#38bdf8' },
          { label: 'DB Tables', value: '14', color: '#a855f7' },
          { label: 'Open Alerts', value: '1', color: '#f59e0b' },
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
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#38bdf8')}
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function InfraDeck() {
  const { module } = useParams<{ module?: string }>();

  const moduleMap: Record<string, { name: string; component: React.FC }> = {
    architecture: { name: '系統架構', component: ArchitecturePage },
    deployment: { name: '部署流水線', component: DeploymentPage },
    database: { name: '資料庫管理', component: DatabasePage },
    networking: { name: '網路管理', component: NetworkingPage },
    scripts: { name: '腳本中心', component: ScriptsPage },
    monitoring: { name: '即時監控', component: MonitoringPage },
  };

  const current = module ? moduleMap[module] : null;
  const PageComponent = current?.component;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020818 0%, #0a1628 50%, #020818 100%)', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid #1e3a5f', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/center/infra" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>工程甲板</Link>
        {current && (
          <>
            <span style={{ color: '#334155' }}>›</span>
            <span style={{ color: '#38bdf8', fontSize: 13 }}>{current.name}</span>
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {Object.entries(moduleMap).map(([key, val]) => (
            <Link key={key} to={`/center/infra/${key}`} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, background: module === key ? '#38bdf822' : 'transparent', color: module === key ? '#38bdf8' : '#64748b', border: `1px solid ${module === key ? '#38bdf8' : 'transparent'}`, cursor: 'pointer' }}>
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
              <h1 style={{ color: '#38bdf8', fontSize: 28, fontWeight: 300, letterSpacing: 4, marginBottom: 8 }}>工程甲板</h1>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>INFRA DECK · 基礎設施 · 部署 · 資料庫 · 網路</p>
              <InfraOverview />
            </>
          ) : PageComponent ? (
            <>
              <h2 style={{ color: '#38bdf8', fontSize: 22, fontWeight: 300, letterSpacing: 3, marginBottom: 20 }}>
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
