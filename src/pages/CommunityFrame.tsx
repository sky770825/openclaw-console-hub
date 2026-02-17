/**
 * CommunityFrame — 多層社區空間橋接頁面
 *
 * 安全架構（由外到內）：
 *
 *   L0 公開展示  → 最低權限 sandbox，純展示
 *   L1 基礎接觸  → 可提交表單，低線接觸
 *   L2 協作空間  → 可呼叫社區 API，任務協作
 *   L3 信任區    → 完整社區功能（預搭，審核後開放）
 *   ── 防火牆 ──
 *   L4 核心      → 不經此頁面，只在指揮中心內部
 *
 * 每層有獨立的：
 * - sandbox 權限等級
 * - postMessage 白名單
 * - 安全出口代理（核心→外部不暴露來源）
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Shield, ExternalLink, RefreshCw, AlertTriangle, Wifi, WifiOff, Lock, Layers } from 'lucide-react';
import {
  COMMUNITY_LAYERS,
  GATEWAY_CONFIG,
  getSandboxForLevel,
  isEventAllowed,
  type CommunityLayer,
} from '@/config/communityLayers';

/**
 * 根據 URL 子路徑解析當前所在的社區層級
 * /community          → 層級總覽
 * /community/showcase → L0
 * /community/contact  → L1
 * /community/workspace → L2
 * /community/trusted  → L3
 * /community/ollama   → L2（映射到協作層）
 * /community/tasks    → L2
 * /community/runs     → L2
 */
function resolveLayer(subPath: string): CommunityLayer | null {
  if (!subPath) return null; // 總覽頁

  // 直接匹配 layer route
  const byRoute = COMMUNITY_LAYERS.find(l => l.route === `/${subPath}` || l.route === `/${subPath.split('/')[0]}`);
  if (byRoute) return byRoute;

  // 路徑別名映射（社區的既有路由映射到對應層級）
  const aliasMap: Record<string, string> = {
    'ollama': 'collaborate',
    'tasks': 'collaborate',
    'runs': 'collaborate',
  };
  const aliasId = aliasMap[subPath.split('/')[0]];
  if (aliasId) return COMMUNITY_LAYERS.find(l => l.id === aliasId) ?? null;

  // 預設映射到 L1 接觸層
  return COMMUNITY_LAYERS.find(l => l.id === 'contact') ?? null;
}

/**
 * 安全出口代理 — 從核心往社區 iframe 發送訊息時，清洗核心資訊
 */
function sendToLayer(iframe: HTMLIFrameElement | null, type: string, payload: unknown) {
  if (!iframe?.contentWindow) return;
  if (!GATEWAY_CONFIG.outboundProxy.allowedOutbound.includes(type)) {
    console.warn('[Gateway] 出站事件被攔截:', type);
    return;
  }
  // 清洗：不帶核心 origin 資訊，只傳事件
  iframe.contentWindow.postMessage(
    { type, payload, _from: 'gateway' }, // 不暴露核心地址
    GATEWAY_CONFIG.communityOrigin
  );
}

// ─── 層級總覽頁（/community 無子路徑時顯示） ───
function LayerOverview() {
  const enabledLayers = COMMUNITY_LAYERS.filter(l => l.enabled);
  const prebuiltLayers = COMMUNITY_LAYERS.filter(l => !l.enabled);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" />
            社區多層空間
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            由外往內的多層防護架構。每一層有獨立的權限和安全隔離。
          </p>
        </div>

        {/* 安全架構示意 */}
        <div className="rounded-lg border bg-card p-4 text-xs font-mono text-muted-foreground leading-relaxed">
          <p>外部使用者</p>
          <p className="ml-4">↓</p>
          {enabledLayers.map((l, i) => (
            <div key={l.id}>
              <p className="ml-4" style={{ color: l.color }}>
                {l.icon} {l.label} — {l.description}
              </p>
              {i < enabledLayers.length - 1 && (
                <p className="ml-8 text-muted-foreground/40">↓ 閘道驗證</p>
              )}
            </div>
          ))}
          <p className="ml-4 text-red-400 mt-1">══ 防火牆 ══</p>
          <p className="ml-4 text-red-500">🔒 L4 核心指揮中心（不可外部存取）</p>
        </div>

        {/* 已啟用的空間 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">已啟用空間</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {enabledLayers.map(l => (
              <a
                key={l.id}
                href={`/community${l.route}`}
                className="block rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{l.icon}</span>
                  <span className="font-medium text-sm">{l.label}</span>
                  <span
                    className="ml-auto h-2 w-2 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{l.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* 預搭的空間（尚未開放） */}
        {prebuiltLayers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">預搭空間（審核後開放）</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {prebuiltLayers.map(l => (
                <div
                  key={l.id}
                  className="rounded-lg border border-dashed bg-card/50 p-4 opacity-60"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg">{l.icon}</span>
                    <span className="font-medium text-sm">{l.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{l.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 主元件 ───
export default function CommunityFrame() {
  const { '*': subPath } = useParams();
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval>>();

  const currentLayer = useMemo(() => resolveLayer(subPath || ''), [subPath]);

  // 總覽模式 — 無 iframe
  if (!currentLayer) {
    return <LayerOverview />;
  }

  // 該層未啟用
  if (!currentLayer.enabled) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-lg font-medium">{currentLayer.icon} {currentLayer.label}</p>
          <p className="text-sm text-muted-foreground">此空間尚未開放，需經審核後啟用</p>
        </div>
      </div>
    );
  }

  const sandbox = getSandboxForLevel(currentLayer.level);
  const communityPath = subPath || '';
  const iframeSrc = `${GATEWAY_CONFIG.communityOrigin}/${communityPath}${location.search}`;

  // postMessage 安全通道 — 按層級過濾
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // 防火牆第一道：驗證來源
      if (event.origin !== GATEWAY_CONFIG.communityOrigin) return;

      const { type, payload } = event.data || {};
      if (!type) return;

      // 防火牆第二道：按層級白名單過濾
      if (!isEventAllowed(currentLayer.id, type)) {
        console.warn(`[Gateway L${currentLayer.level}] 拒絕事件:`, type);
        return;
      }

      if (type === 'community:heartbeat') {
        setConnected(true);
        return;
      }

      console.log(`[Gateway L${currentLayer.level}] 收到:`, type, payload);
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentLayer]);

  // 心跳偵測
  useEffect(() => {
    heartbeatTimer.current = setInterval(() => {
      setConnected(false);
    }, GATEWAY_CONFIG.heartbeatTimeout);
    return () => clearInterval(heartbeatTimer.current);
  }, []);

  const reload = () => {
    setLoadError(false);
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 安全狀態列 — 顯示當前層級 */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" style={{ color: currentLayer.color }} />
            <span className="font-medium" style={{ color: currentLayer.color }}>
              {currentLayer.icon} {currentLayer.label}
            </span>
          </div>
          <span className="text-muted-foreground/50">|</span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>Sandbox: L{currentLayer.level}</span>
          </div>
          <div className="flex items-center gap-1">
            {connected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-muted-foreground/50" />
            )}
            <span className={connected ? 'text-green-600' : 'text-muted-foreground/50'}>
              {connected ? '已連線' : '等待連線'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <RefreshCw className="h-3 w-3" />
            <span>重載</span>
          </button>
          <a
            href={iframeSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            <span>新分頁</span>
          </a>
        </div>
      </div>

      {/* iframe 或錯誤狀態 */}
      {loadError ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <div>
              <p className="text-lg font-medium">社區服務未啟動</p>
              <p className="text-sm text-muted-foreground mt-1">
                請確認社區前端正在 {GATEWAY_CONFIG.communityOrigin} 運行
              </p>
            </div>
            <button
              onClick={reload}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
            >
              重新連線
            </button>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          sandbox={sandbox}
          className="flex-1 w-full border-0"
          title={`社區空間 — ${currentLayer.label}`}
          onLoad={() => setLoadError(false)}
          onError={() => setLoadError(true)}
        />
      )}
    </div>
  );
}
