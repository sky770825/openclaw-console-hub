import { useState, useEffect, useCallback } from 'react';
import {
  getFedMembers,
  getAttackEvents,
  getBlocklist,
  getFedStatus,
  suspendMember,
  type FadpMember,
  type FadpAttackEvent,
  type FadpBlocklistEntry,
  type FadpStatus,
} from '@/services/federationApi';
import { AllianceMemberCard } from './AllianceMemberCard';
import { AttackEventFeed } from './AttackEventFeed';
import { BlocklistTable } from './BlocklistTable';
import { HandshakeModal } from './HandshakeModal';

type Tab = 'members' | 'attacks' | 'blocklist';

const ATTACK_TYPE_FILTER_OPTIONS = [
  { value: '', label: '全部類型' },
  { value: 'critical', label: '危急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export function FederationPanel() {
  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<FadpMember[]>([]);
  const [attackEvents, setAttackEvents] = useState<FadpAttackEvent[]>([]);
  const [blocklist, setBlocklist] = useState<FadpBlocklistEntry[]>([]);
  const [hotIps, setHotIps] = useState<string[]>([]);
  const [hotTokens, setHotTokens] = useState<string[]>([]);
  const [status, setStatus] = useState<FadpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handshakeOpen, setHandshakeOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [membersData, eventsData, blocklistData, statusData] = await Promise.allSettled([
        getFedMembers(),
        getAttackEvents(50, severityFilter || undefined),
        getBlocklist(),
        getFedStatus(),
      ]);

      if (membersData.status === 'fulfilled') setMembers(membersData.value);
      if (eventsData.status === 'fulfilled') setAttackEvents(eventsData.value);
      if (blocklistData.status === 'fulfilled') {
        setBlocklist(blocklistData.value.blocklist);
        setHotIps(blocklistData.value.hot.ips);
        setHotTokens(blocklistData.value.hot.tokens);
      }
      if (statusData.status === 'fulfilled') setStatus(statusData.value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [severityFilter]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // WebSocket 監聽 FADP 事件
  useEffect(() => {
    const wsUrl = (import.meta.env.VITE_WS_URL as string | undefined) || 'ws://localhost:3011/ws';
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'fadp:attack' && msg.event) {
              setAttackEvents((prev) => [msg.event as FadpAttackEvent, ...prev].slice(0, 100));
            } else if (msg.type === 'fadp:member_joined') {
              loadData();
            } else if (msg.type === 'fadp:blocklist_update') {
              loadData();
            }
          } catch {
            // ignore
          }
        };
        ws.onerror = () => {};
        ws.onclose = () => {
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch {
        reconnectTimeout = setTimeout(connect, 5000);
      }
    }

    connect();
    return () => {
      ws?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [loadData]);

  const handleSuspend = async (nodeId: string) => {
    if (!confirm(`確定要踢出成員 ${nodeId}？`)) return;
    try {
      await suspendMember(nodeId);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const activeCount = members.filter((m) => m.status === 'active').length;
  const pendingCount = members.filter((m) => m.status === 'pending_owner_approval').length;
  const criticalEvents = attackEvents.filter((e) => e.severity === 'critical').length;

  return (
    <div className="flex flex-col gap-6">
      {/* 狀態列 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '活躍成員', value: activeCount, icon: '🤖', color: 'text-green-400' },
          { label: '等待審核', value: pendingCount, icon: '⏳', color: 'text-yellow-400' },
          { label: '危急攻擊', value: criticalEvents, icon: '🚨', color: 'text-red-400' },
          { label: '封鎖 IP', value: status?.hotBlocklistSize ?? 0, icon: '🛑', color: 'text-orange-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <span>{stat.icon}</span>
              <span className="text-xs text-white/50">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2">
        <button
          onClick={() => setHandshakeOpen(true)}
          className="text-sm bg-cyan-600/80 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          🤝 引導節點加入
        </button>
        <button
          onClick={loadData}
          className="text-sm bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors"
        >
          🔄 重新整理
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 分頁 */}
      <div className="border-b border-white/10">
        <div className="flex gap-0">
          {([
            { key: 'members', label: `成員 (${activeCount})` },
            { key: 'attacks', label: `攻擊事件 (${attackEvents.length})` },
            { key: 'blocklist', label: `封鎖清單 (${blocklist.length})` },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                tab === key
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 分頁內容 */}
      {loading ? (
        <div className="py-8 text-center text-white/30 text-sm">載入中...</div>
      ) : (
        <>
          {tab === 'members' && (
            <div>
              {members.length === 0 ? (
                <div className="py-16 text-center text-white/30">
                  <div className="text-4xl mb-3">🤖</div>
                  <p>尚無聯盟成員</p>
                  <p className="text-xs mt-1">點擊「引導節點加入」開始握手流程</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {members.map((m) => (
                    <AllianceMemberCard key={m.id} member={m} onSuspend={handleSuspend} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'attacks' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                {ATTACK_TYPE_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSeverityFilter(opt.value)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      severityFilter === opt.value
                        ? 'bg-cyan-600/80 text-white'
                        : 'bg-white/5 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <AttackEventFeed events={attackEvents} />
            </div>
          )}

          {tab === 'blocklist' && (
            <BlocklistTable
              entries={blocklist}
              hotIps={hotIps}
              hotTokens={hotTokens}
              onRefresh={loadData}
            />
          )}
        </>
      )}

      <HandshakeModal open={handshakeOpen} onClose={() => { setHandshakeOpen(false); loadData(); }} />
    </div>
  );
}
