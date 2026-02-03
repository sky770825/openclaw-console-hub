import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { SeverityBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Check, 
  Clock, 
  AlertTriangle,
  Bell,
  MoreHorizontal,
  ExternalLink,
  Shield,
  Zap,
  Database,
  Key,
  Webhook
} from 'lucide-react';
import { getAlerts, updateAlertStatus } from '@/services/api';
import type { Alert, AlertType } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const alertTypeConfig: Record<AlertType, { label: string; icon: typeof Webhook }> = {
  webhook_fail: { label: 'Webhook 失敗', icon: Webhook },
  queue_backlog: { label: '佇列積壓', icon: Clock },
  auth_issue: { label: '驗證問題', icon: Key },
  rate_limit: { label: '速率限制', icon: Zap },
  db_connection: { label: '資料庫連線', icon: Database },
};

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  if (diffHour < 24) return `${diffHour} 小時前`;
  return `${diffDay} 天前`;
}

export default function Alerts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'acked' | 'snoozed'>('all');

  useEffect(() => {
    getAlerts().then(setAlerts);
  }, []);

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.status === filter);

  const handleAck = async (id: string) => {
    await updateAlertStatus(id, 'acked');
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acked' } : a));
    toast({ description: '警報已確認' });
  };

  const handleSnooze = async (id: string) => {
    await updateAlertStatus(id, 'snoozed');
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'snoozed' } : a));
    toast({ description: '警報已延後 1 小時' });
  };

  const openCount = alerts.filter(a => a.status === 'open').length;

  const filterLabels = {
    all: '全部',
    open: '未處理',
    acked: '已確認',
    snoozed: '已延後',
  };

  return (
    <PageContainer>
      <SectionHeader
        title="警報"
        description="監控系統警告和重大問題"
        action={
          openCount > 0 && (
            <Badge variant="destructive" className="h-6">
              {openCount} 未處理
            </Badge>
          )
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'open', 'acked', 'snoozed'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {filterLabels[status]}
            {status === 'open' && openCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                {openCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Alerts Grid */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="沒有警報"
          description={filter === 'all' ? '系統運作正常！' : `沒有${filterLabels[filter]}的警報`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAlerts.map((alert) => {
            const config = alertTypeConfig[alert.type];
            const Icon = config.icon;

            return (
              <Card 
                key={alert.id}
                className={cn(
                  'relative overflow-hidden transition-all hover:shadow-card-hover',
                  alert.status === 'open' && alert.severity === 'critical' && 'border-destructive/50',
                  alert.status === 'open' && alert.severity === 'warning' && 'border-warning/50',
                  alert.status !== 'open' && 'opacity-60'
                )}
              >
                {/* Severity indicator */}
                <div className={cn(
                  'absolute top-0 left-0 w-1 h-full',
                  alert.severity === 'critical' && 'bg-destructive',
                  alert.severity === 'warning' && 'bg-warning',
                  alert.severity === 'info' && 'bg-info'
                )} />

                <CardContent className="p-4 pl-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'p-1.5 rounded-md',
                        alert.severity === 'critical' && 'bg-destructive/10 text-destructive',
                        alert.severity === 'warning' && 'bg-warning/10 text-warning',
                        alert.severity === 'info' && 'bg-info/10 text-info'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <SeverityBadge severity={alert.severity} />
                      {alert.status !== 'open' && (
                        <Badge variant="secondary" className="text-xs">
                          {alert.status === 'acked' ? '已確認' : '已延後'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm mb-4 line-clamp-2">{alert.message}</p>

                  {/* Related links */}
                  {(alert.relatedTaskId || alert.relatedRunId) && (
                    <div className="flex flex-wrap gap-2 mb-4 text-xs">
                      {alert.relatedTaskId && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => navigate(`/tasks/${alert.relatedTaskId}`)}
                        >
                          查看任務 <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                      {alert.relatedRunId && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => navigate(`/runs/${alert.relatedRunId}`)}
                        >
                          查看執行 <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t">
                    {alert.status === 'open' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleAck(alert.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          確認
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleSnooze(alert.id)}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          延後
                        </Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast({ description: '已建立事件（模擬）' })}>
                          <Shield className="h-3 w-3 mr-2" />
                          建立事件
                        </DropdownMenuItem>
                        <DropdownMenuItem>查看詳情</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
