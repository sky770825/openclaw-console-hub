import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'accent';
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon,
  trend, 
  trendValue,
  variant = 'default',
  className 
}: StatCardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    destructive: 'border-destructive/30 bg-destructive/5',
    accent: 'border-accent/30 bg-accent/5',
  };

  const iconStyles = {
    default: 'bg-secondary text-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    accent: 'bg-accent/10 text-accent',
  };

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-card-hover',
      variantStyles[variant],
      className
    )}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl md:text-3xl font-semibold mt-1 tracking-tight">{value}</p>
            {trendValue && (
              <div className={cn(
                'flex items-center gap-1 mt-2 text-xs font-medium',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                <TrendIcon className="h-3 w-3" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn(
              'flex-shrink-0 p-2.5 rounded-lg ml-3',
              iconStyles[variant]
            )}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
