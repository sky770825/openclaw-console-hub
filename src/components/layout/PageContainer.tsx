import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** OpenClaw 風格頁面容器 — 與 Agent 板一致 */
interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('flex-1 p-4 md:p-5 lg:p-6 overflow-auto text-[var(--oc-t1)]', className)}>
      {children}
    </div>
  );
}

/** OpenClaw Sec 風格區塊標題 — icon + title + count + right */
interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: string;
  count?: string | number;
  className?: string;
}

export function SectionHeader({ title, description, action, icon, count, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-6', className)}>
      <div className="flex flex-col gap-1">
        <div className="oc-section-title flex items-center gap-2">
          {icon && <span className="text-[15px]">{icon}</span>}
          <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--oc-t1)' }}>{title}</h1>
          {count !== undefined && (
            <span className="oc-badge px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--oc-t3)' }}>
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs" style={{ color: 'var(--oc-t3)' }}>{description}</p>
        )}
      </div>
      {action && <div className="mt-2 sm:mt-0">{action}</div>}
    </div>
  );
}

interface SectionProps {
  title?: string;
  icon?: string;
  count?: string | number;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** OpenClaw Sec 風格區塊 */
export function Section({ title, icon, count, right, children, className }: SectionProps) {
  return (
    <section className={cn('mb-6', className)}>
      {title && (
        <div className="oc-section-header flex items-center justify-between mb-3">
          <div className="oc-section-title flex items-center gap-2">
            {icon && <span className="text-[15px]">{icon}</span>}
            <h2 className="text-sm font-bold" style={{ color: 'var(--oc-t1)' }}>{title}</h2>
            {count !== undefined && (
              <span className="oc-badge px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--oc-t3)' }}>
                {count}
              </span>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
