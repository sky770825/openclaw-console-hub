import type { FadpMember } from '@/services/federationApi';

interface Props {
  member: FadpMember;
  onSuspend?: (nodeId: string) => void;
}

const STATUS_BADGE: Record<FadpMember['status'], { label: string; cls: string }> = {
  active: { label: '活躍', cls: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  pending_challenge: { label: '等待挑戰', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  pending_owner_approval: { label: '等待審核', cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  suspended: { label: '已暫停', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  rejected: { label: '已拒絕', cls: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
};

const NODE_TYPE_ICON: Record<FadpMember['node_type'], string> = {
  local: '🖥️',
  remote: '🌐',
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '從未';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

export function AllianceMemberCard({ member, onSuspend }: Props) {
  const badge = STATUS_BADGE[member.status];
  const trustColor =
    member.trust_score >= 80
      ? 'text-green-400'
      : member.trust_score >= 50
      ? 'text-yellow-400'
      : 'text-red-400';

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 flex flex-col gap-2 hover:bg-white/8 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{NODE_TYPE_ICON[member.node_type]}</span>
          <div className="min-w-0">
            <div className="font-medium text-sm text-white truncate">
              {member.label || member.node_id}
            </div>
            <div className="text-xs text-white/40 truncate">{member.node_id}</div>
          </div>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-white/50">
        <span>
          信任分數：<span className={`font-semibold ${trustColor}`}>{member.trust_score}</span>
        </span>
        <span>類型：{member.node_type}</span>
      </div>

      {member.endpoint_url && (
        <div className="text-xs text-white/40 truncate">
          端點：{member.endpoint_url}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-white/30">
        <span>加入：{formatRelativeTime(member.joined_at)}</span>
        <span>最後上線：{formatRelativeTime(member.last_seen_at)}</span>
      </div>

      {member.status === 'active' && onSuspend && (
        <button
          onClick={() => onSuspend(member.node_id)}
          className="mt-1 text-xs text-red-400/70 hover:text-red-400 hover:underline text-left transition-colors"
        >
          踢出成員
        </button>
      )}
    </div>
  );
}
