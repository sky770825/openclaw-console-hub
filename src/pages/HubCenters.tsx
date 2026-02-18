/**
 * 中心總覽 — Hub Centers Overview
 *
 * /center         → 五大中心概覽
 * /center/:id     → 單一中心模組列表
 * /center/:id/:module → 模組詳情頁
 */

import { Link, useParams, useLocation } from 'react-router-dom';
import { Building2, Lock, ArrowLeft, Construction } from 'lucide-react';
import { HUB_CENTERS, getCenterById } from '@/config/hubCenters';
import type { HubCenter, CenterModule } from '@/config/hubCenters';
import { useCoreAuth } from '@/components/auth';
import { LEVEL_LABEL } from '@/config/coreAuth';

// ─── 模組詳情（/center/:id/:module） ───
function ModuleDetail({ center, mod }: { center: HubCenter; mod: CenterModule }) {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          to={center.route}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          返回{center.label}
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <span>{mod.icon}</span>
          {mod.label}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
      </div>

      {!mod.enabled ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Lock className="h-10 w-10 mb-3" />
          <p className="font-medium">此模組尚未開放</p>
          <p className="text-xs mt-1">審核通過後啟用</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Construction className="h-10 w-10 mb-3" />
          <p className="font-medium">模組建置中</p>
          <p className="text-xs mt-1">功能即將上線，目前僅做路由預留</p>
        </div>
      )}
    </div>
  );
}

// ─── 單一中心模組列表（/center/:id） ───
function CenterDetail({ center, level }: { center: HubCenter; level: string | null }) {
  const hasAccess = level && (['owner', 'admin', 'operator', 'viewer'].indexOf(level) <= ['owner', 'admin', 'operator', 'viewer'].indexOf(center.requiredLevel));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          to="/center"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          返回中心總覽
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <span className="text-2xl">{center.icon}</span>
          {center.label}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{center.description}</p>
      </div>

      {!hasAccess ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Lock className="h-10 w-10 mb-3" />
          <p className="font-medium">需要 {LEVEL_LABEL[center.requiredLevel]} 以上權限</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {center.modules.map(mod => (
            <Link
              key={mod.id}
              to={mod.route}
              className={`block rounded-lg border bg-card p-4 transition-colors ${
                mod.enabled ? 'hover:bg-accent/50 hover:border-foreground/20' : 'opacity-50 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{mod.icon}</span>
                <span className="font-medium text-sm">{mod.label}</span>
                {!mod.enabled && <Lock className="h-3 w-3 text-muted-foreground/40 ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground">{mod.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 五大中心總覽（/center） ───
export default function HubCenters() {
  const { level } = useCoreAuth();
  const location = useLocation();

  // 解析路由：/center, /center/tech, /center/tech/tasks
  const segments = location.pathname.replace(/^\/center\/?/, '').split('/').filter(Boolean);
  const centerId = segments[0] || null;
  const moduleSlug = segments[1] || null;

  // 單一中心 + 模組詳情
  if (centerId) {
    const center = getCenterById(centerId);
    if (!center) {
      return (
        <div className="p-6 text-center text-muted-foreground">
          <p>找不到中心：{centerId}</p>
          <Link to="/center" className="text-xs underline mt-2 block">返回中心總覽</Link>
        </div>
      );
    }

    if (moduleSlug) {
      const mod = center.modules.find(m => m.route.endsWith('/' + moduleSlug));
      if (mod) return <ModuleDetail center={center} mod={mod} />;
      return (
        <div className="p-6 text-center text-muted-foreground">
          <p>找不到模組：{moduleSlug}</p>
          <Link to={center.route} className="text-xs underline mt-2 block">返回{center.label}</Link>
        </div>
      );
    }

    return <CenterDetail center={center} level={level} />;
  }

  // 五大中心總覽
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
