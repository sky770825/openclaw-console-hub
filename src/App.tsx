import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ErrorBoundary } from "@/components/common";
import { CoreAuthProvider } from "@/components/auth";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { useSpeculationRules, STARSHIP_PRERENDER_URLS } from "@/hooks/useSpeculationRules";
import { useFederationPostMessageGuard } from "@/hooks/useFederationPostMessageGuard";
import { LocaleProvider } from "@/i18n/LocaleContext";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy-loaded route pages
const TaskBoard = lazy(() => import("./pages/TaskBoard"));
const TaskList = lazy(() => import("./pages/TaskList"));
const Runs = lazy(() => import("./pages/Runs"));
const Logs = lazy(() => import("./pages/Logs"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Settings = lazy(() => import("./pages/Settings"));
const Projects = lazy(() => import("./pages/Projects"));
const ReviewCenter = lazy(() => import("./pages/ReviewCenter"));
const Domains = lazy(() => import("./pages/Domains"));
const CaseStudies = lazy(() => import("./pages/CaseStudies"));
const OpenClawV4 = lazy(() => import("../openclaw-cursor.jsx"));
const CommunityFrame = lazy(() => import("./pages/CommunityFrame"));
const HubCenters = lazy(() => import("./pages/HubCenters"));
const DefenseCenter = lazy(() => import("./pages/DefenseCenter"));
const ProtectionCenter = lazy(() => import("./pages/ProtectionCenter"));
const ControlCenter = lazy(() => import("./pages/ControlCenter"));
const CommunicationDeck = lazy(() => import("./pages/CommunicationDeck"));
const EngineDeck = lazy(() => import("./pages/EngineDeck"));
const AIDeck = lazy(() => import("./pages/AIDeck"));
const LogisticsDeck = lazy(() => import("./pages/LogisticsDeck"));
const InfraDeck = lazy(() => import("./pages/InfraDeck"));
const AutomationDeck = lazy(() => import("./pages/AutomationDeck"));
const MDCIDashboard = lazy(() => import("./pages/starship/MDCIDashboard"));
const FrameworksOverview = lazy(() => import("./pages/starship/FrameworksOverview"));
const ManufacturingRoadmap = lazy(() => import("./pages/starship/ManufacturingRoadmap"));
const Live2DShowcase = lazy(() => import("./pages/Live2DShowcase"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 分鐘內不重複請求
      gcTime: 5 * 60 * 1000, // 5 分鐘快取
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false, // 避免切換分頁時頻繁重打
    },
  },
});

// 快捷鍵元件
function KeyboardShortcuts() {
  useGlobalShortcuts();
  return null;
}

// 效能監控元件
function PerformanceMonitor() {
  usePerformanceMonitoring();
  return null;
}

// Speculation Rules — 預渲染近鄰頁面（Chrome 121+）
function SpeculationPrerender() {
  useSpeculationRules(STARSHIP_PRERENDER_URLS);
  return null;
}

// FADP postMessage 白名單防護（掛在 App 頂層，全局生效）
const ALLOWED_ORIGINS = [
  window.location.origin,
  'http://localhost:5173',
  'http://localhost:3011',
  ...(import.meta.env.VITE_ALLOWED_ORIGINS
    ? String(import.meta.env.VITE_ALLOWED_ORIGINS).split(',').map((s: string) => s.trim())
    : []),
];

function PostMessageGuard() {
  useFederationPostMessageGuard({
    allowedOrigins: ALLOWED_ORIGINS,
    fadpKey: import.meta.env.VITE_FADP_KEY as string | undefined,
  });
  return null;
}

const App = () => (
  <ErrorBoundary>
    <PerformanceMonitor />
    <SpeculationPrerender />
    <PostMessageGuard />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LocaleProvider>
        <Toaster />
        <Sonner />
        <CoreAuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <KeyboardShortcuts />
            <Suspense fallback={<div className="flex items-center justify-center h-32 text-muted-foreground text-sm">載入中…</div>}>
              <Routes>
                <Route element={<AppLayout />}>
                  {/* ─── 核心指揮中心路由（需通過防線認證）─── */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/cursor" element={<OpenClawV4 />} />
                  <Route path="/tasks" element={<TaskBoard />} />
                  <Route path="/tasks/list" element={<TaskList />} />
                  <Route path="/tasks/:taskId" element={<TaskBoard />} />
                  <Route path="/runs" element={<Runs />} />
                  <Route path="/runs/:runId" element={<Runs />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/domains" element={<Domains />} />
                  <Route path="/review" element={<ReviewCenter />} />
                  <Route path="/case-studies" element={<CaseStudies />} />
                  {/* ─── 科技甲板（核心基建）─── */}
                  <Route path="/center" element={<HubCenters />} />
                  <Route path="/center/protection" element={<ProtectionCenter />} />
                  <Route path="/center/protection/:module" element={<ProtectionCenter />} />
                  <Route path="/center/defense" element={<DefenseCenter />} />
                  <Route path="/center/defense/:module" element={<DefenseCenter />} />
                  <Route path="/center/:centerId" element={<HubCenters />} />
                  <Route path="/center/:centerId/:module" element={<HubCenters />} />
                  {/* ─── 星艦科技頁面 ─── */}
                  <Route path="/starship/mdci" element={<MDCIDashboard />} />
                  <Route path="/starship/frameworks" element={<FrameworksOverview />} />
                  <Route path="/starship/manufacturing" element={<ManufacturingRoadmap />} />
                  <Route path="/starship/live2d" element={<Live2DShowcase />} />
                  {/* ─── 通信甲板 ─── */}
                  <Route path="/center/communication" element={<CommunicationDeck />} />
                  <Route path="/center/communication/:module" element={<CommunicationDeck />} />
                  {/* ─── 輪機艙 ─── */}
                  <Route path="/center/engine" element={<EngineDeck />} />
                  <Route path="/center/engine/:module" element={<EngineDeck />} />
                  {/* ─── AI 甲板 ─── */}
                  <Route path="/center/ai" element={<AIDeck />} />
                  <Route path="/center/ai/:module" element={<AIDeck />} />
                  {/* ─── 後勤甲板 ─── */}
                  <Route path="/center/commerce" element={<LogisticsDeck />} />
                  <Route path="/center/commerce/:module" element={<LogisticsDeck />} />
                  {/* ─── 工程甲板 ─── */}
                  <Route path="/center/infra" element={<InfraDeck />} />
                  <Route path="/center/infra/:module" element={<InfraDeck />} />
                  {/* ─── 自動化甲板 ─── */}
                  <Route path="/center/automation" element={<AutomationDeck />} />
                  <Route path="/center/automation/:module" element={<AutomationDeck />} />
                  {/* ─── 社區空間（防火牆外，iframe 沙盒隔離）─── */}
                  <Route path="/community/*" element={<CommunityFrame />} />
                  <Route path="/control" element={<ControlCenter />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CoreAuthProvider>
        </LocaleProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
