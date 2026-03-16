import { useState } from 'react';
import type { FadpBlocklistEntry } from '@/services/federationApi';
import { addBlocklistEntry, removeBlocklistEntry } from '@/services/federationApi';

interface Props {
  entries: FadpBlocklistEntry[];
  hotIps: string[];
  hotTokens: string[];
  onRefresh: () => void;
}

const BLOCK_TYPE_LABEL: Record<FadpBlocklistEntry['block_type'], string> = {
  ip: '🌐 IP',
  token_hint: '🔑 Token',
  node_id: '🤖 節點',
};

const CONSENSUS_LABEL: Record<FadpBlocklistEntry['consensus_type'], string> = {
  auto: '自動',
  manual: '手動',
  broadcast: '廣播',
};

function formatExpiry(iso: string | null): string {
  if (!iso) return '永久';
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff < 0) return '已過期';
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return `${Math.floor(diff / 60000)} 分鐘後`;
  if (hrs < 24) return `${hrs} 小時後`;
  return `${Math.floor(hrs / 24)} 天後`;
}

export function BlocklistTable({ entries, hotIps, hotTokens, onRefresh }: Props) {
  const [newType, setNewType] = useState<'ip' | 'token_hint' | 'node_id'>('ip');
  const [newValue, setNewValue] = useState('');
  const [newExpiry, setNewExpiry] = useState('24');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await addBlocklistEntry(newType, newValue.trim(), Number(newExpiry));
      setNewValue('');
      onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      await removeBlocklistEntry(id);
      onRefresh();
    } catch {
      // ignore
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 熱封鎖清單摘要 */}
      {(hotIps.length > 0 || hotTokens.length > 0) && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <div className="text-xs font-medium text-red-400 mb-2">記憶體熱封鎖清單</div>
          <div className="flex flex-wrap gap-1">
            {hotIps.map((ip) => (
              <span key={ip} className="text-xs font-mono bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                {ip}
              </span>
            ))}
            {hotTokens.map((t) => (
              <span key={t} className="text-xs font-mono bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 新增封鎖 */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-2">
        <div className="text-xs font-medium text-white/60">手動新增封鎖</div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as typeof newType)}
            className="text-xs bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
          >
            <option value="ip">IP 地址</option>
            <option value="token_hint">Token Hint</option>
            <option value="node_id">節點 ID</option>
          </select>
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={newType === 'ip' ? '192.168.1.1' : newType === 'token_hint' ? 'fadp_abc...' : 'node-xxx'}
            className="flex-1 min-w-32 text-xs bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white placeholder-white/20"
          />
          <select
            value={newExpiry}
            onChange={(e) => setNewExpiry(e.target.value)}
            className="text-xs bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
          >
            <option value="1">1 小時</option>
            <option value="24">24 小時</option>
            <option value="168">7 天</option>
            <option value="720">30 天</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newValue.trim()}
            className="text-xs bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white px-3 py-1.5 rounded transition-colors"
          >
            {adding ? '封鎖中...' : '封鎖'}
          </button>
        </div>
        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>

      {/* 封鎖清單表格 */}
      {entries.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">
          目前無封鎖記錄
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="text-left py-2 pr-4">類型</th>
                <th className="text-left py-2 pr-4">封鎖值</th>
                <th className="text-left py-2 pr-4">來源</th>
                <th className="text-left py-2 pr-4">到期</th>
                <th className="text-right py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="py-2 pr-4">{BLOCK_TYPE_LABEL[entry.block_type]}</td>
                  <td className="py-2 pr-4 font-mono text-red-300/80">{entry.block_value}</td>
                  <td className="py-2 pr-4 text-white/40">{CONSENSUS_LABEL[entry.consensus_type]}</td>
                  <td className="py-2 pr-4 text-white/40">{formatExpiry(entry.expires_at)}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      disabled={removing === entry.id}
                      className="text-green-400/60 hover:text-green-400 transition-colors"
                    >
                      {removing === entry.id ? '...' : '解除'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
