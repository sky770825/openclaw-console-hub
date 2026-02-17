/**
 * 中心總覽 — Hub Centers Overview
 *
 * 五大中心的入口頁面：科技、防護、防衛、基建、商業
 */

import { Link } from 'react-router-dom';
import { Building2, Lock } from 'lucide-react';
import { HUB_CENTERS } from '@/config/hubCenters';
import { useCoreAuth } from '@/components/auth';
import { LEVEL_LABEL } from '@/config/coreAuth';

export default function HubCenters() {
  const { level } = useCoreAuth();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          研究中心
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Openclaw 核心基建：五大中心統一管理
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HUB_CENTERS.map(center => {
          const hasAccess = level && (['owner', 'admin', 'operator', 'viewer'].indexOf(level) <= ['owner', 'admin', 'operator', 'viewer'].indexOf(center.requiredLevel));

          return (
            <div
              key={center.id}
              className={`rounded-xl border bg-card overflow-hidden transition-all ${
                center.enabled && hasAccess ? 'hover:shadow-md hover:border-foreground/20' : 'opacity-60'
              }`}
            >
              {/* Header */}
              <div className="p-5 border-b" style={{ borderBottomColor: center.color + '30' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{center.icon}</span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: center.enabled ? center.color : '#888' }}
                  />
                </div>
                <h3 className="font-semibold">{center.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{center.description}</p>
              </div>

              {/* Modules */}
              <div className="p-4 space-y-2">
                {center.modules.slice(0, 3).map(mod => (
                  <div key={mod.id} className="flex items-center gap-2 text-xs">
                    <span>{mod.icon}</span>
                    <span className={mod.enabled ? 'text-foreground' : 'text-muted-foreground/50'}>
                      {mod.label}
                    </span>
                    {!mod.enabled && <Lock className="h-2.5 w-2.5 text-muted-foreground/30" />}
                  </div>
                ))}
                {center.modules.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{center.modules.length - 3} 項功能
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="px-4 pb-4">
                {center.enabled && hasAccess ? (
                  <Link
                    to={center.route}
                    className="block w-full text-center py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: center.color + '15', color: center.color }}
                  >
                    進入{center.label}
                  </Link>
                ) : !hasAccess ? (
                  <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>需要 {LEVEL_LABEL[center.requiredLevel]} 以上權限</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>即將開放</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
