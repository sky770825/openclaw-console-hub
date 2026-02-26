import { useEffect, useRef } from 'react';
import type { FadpAttackEvent } from '@/services/federationApi';

interface Props {
  events: FadpAttackEvent[];
}

const SEVERITY_STYLE: Record<FadpAttackEvent['severity'], { dot: string; row: string; label: string }> = {
  critical: { dot: 'bg-red-500 animate-pulse', row: 'border-l-2 border-red-500/60 bg-red-500/5', label: '危急' },
  high: { dot: 'bg-orange-500', row: 'border-l-2 border-orange-500/50 bg-orange-500/5', label: '高' },
  medium: { dot: 'bg-yellow-500', row: 'border-l-2 border-yellow-500/40 bg-yellow-500/5', label: '中' },
  low: { dot: 'bg-green-500', row: 'border-l-2 border-green-500/30 bg-green-500/5', label: '低' },
};

const ATTACK_TYPE_LABEL: Record<FadpAttackEvent['attack_type'], string> = {
  ddos: 'DDoS',
  malicious_postmessage: '惡意 postMessage',
  api_key_forgery: 'API Key 偽造',
  task_injection: '任務注入',
  self_defense: '自我防護',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AttackEventFeed({ events }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/30">
        <span className="text-3xl mb-3">🛡️</span>
        <p className="text-sm">暫無攻擊事件</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 max-h-96 overflow-y-auto pr-1">
      {events.map((ev) => {
        const style = SEVERITY_STYLE[ev.severity];
        return (
          <div
            key={ev.id}
            className={`px-3 py-2 rounded-md flex items-start gap-3 ${style.row}`}
          >
            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white/80">
                  {ATTACK_TYPE_LABEL[ev.attack_type]}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  ev.severity === 'critical' ? 'bg-red-500/30 text-red-300' :
                  ev.severity === 'high' ? 'bg-orange-500/30 text-orange-300' :
                  ev.severity === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
                  'bg-green-500/30 text-green-300'
                }`}>
                  {style.label}
                </span>
                <span className="text-xs text-white/30 ml-auto">{formatTime(ev.created_at)}</span>
              </div>
              <div className="text-xs text-white/50 mt-0.5">
                <span className="text-white/30">回報：</span>{ev.reporter_node_id}
                {ev.attacker_ip && (
                  <span className="ml-2">
                    <span className="text-white/30">IP：</span>
                    <span className="font-mono text-red-300/80">{ev.attacker_ip}</span>
                  </span>
                )}
              </div>
              {ev.description && (
                <div className="text-xs text-white/40 mt-0.5 truncate">{ev.description}</div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
