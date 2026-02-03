import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('flex-1 p-4 md:p-6 lg:p-8 overflow-auto', className)}>
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6', className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div className="mt-3 sm:mt-0">{action}</div>}
    </div>
  );
}

interface SectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, children, className }: SectionProps) {
  return (
    <section className={cn('mb-6', className)}>
      {title && (
        <h2 className="text-lg font-medium mb-4">{title}</h2>
      )}
      {children}
    </section>
  );
}
