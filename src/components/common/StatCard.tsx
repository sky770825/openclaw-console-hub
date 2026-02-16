import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** OpenClaw Stats 風格 — 與 Agent 板一致：大數值 + 小標籤、深色卡片 */
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'accent';
  className?: string;
}

const OC_COLORS: Record<Exclude<StatCardProps['variant'], undefined>, string> = {
  default: 'var(--oc-indigo)',
  success: 'var(--oc-green)',
  warning: 'var(--oc-amber)',
  destructive: 'var(--oc-red)',
  accent: 'var(--oc-purple)',
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  className,
}: StatCardProps) {
  const color = OC_COLORS[variant];
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;

  return (
    <div
      className={cn(
        'oc-stat-item rounded-xl p-3 text-center transition-all duration-200',
        'border border-[var(--oc-border)] bg-[var(--oc-s2)] hover:bg-[var(--oc-s3)]',
        className
      )}
    >
      <div className="oc-stat-value" style={{ color }}>{value}</div>
      <div className="oc-stat-label">{title}</div>
      {trendValue && (
        <div
          className={cn(
            'flex items-center justify-center gap-1 mt-1 text-[10px] font-medium',
            trend === 'up' && 'text-[var(--oc-green)]',
            trend === 'down' && 'text-[var(--oc-red)]',
            trend === 'neutral' && 'text-[var(--oc-t3)]'
          )}
        >
          <TrendIcon className="h-3 w-3" />
          <span>{trendValue}</span>
        </div>
      )}
      {Icon && (
        <div className="flex justify-center mt-2 opacity-70">
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      )}
    </div>
  );
}
