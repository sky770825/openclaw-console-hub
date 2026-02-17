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
import Dashboard from "./pages/Dashboard";
import TaskBoard from "./pages/TaskBoard";
import TaskList from "./pages/TaskList";
import Runs from "./pages/Runs";
import Logs from "./pages/Logs";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Projects from "./pages/Projects";
import ReviewCenter from "./pages/ReviewCenter";
import NotFound from "./pages/NotFound";
import Domains from "./pages/Domains";
import OpenClawV4 from "../openclaw-cursor.jsx";
import CommunityFrame from "./pages/CommunityFrame";
import HubCenters from "./pages/HubCenters";
import DefenseCenter from "./pages/DefenseCenter";
import ProtectionCenter from "./pages/ProtectionCenter";

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

const App = () => (
  <ErrorBoundary>
    <PerformanceMonitor />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CoreAuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <KeyboardShortcuts />
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
                {/* ─── 研究中心（核心基建）─── */}
                <Route path="/center" element={<HubCenters />} />
                <Route path="/center/tech" element={<HubCenters />} />
                <Route path="/center/protection" element={<ProtectionCenter />} />
                <Route path="/center/protection/:module" element={<ProtectionCenter />} />
                <Route path="/center/defense" element={<DefenseCenter />} />
                <Route path="/center/defense/:module" element={<DefenseCenter />} />
                <Route path="/center/infra" element={<HubCenters />} />
                <Route path="/center/commerce" element={<HubCenters />} />
                {/* ─── 社區空間（防火牆外，iframe 沙盒隔離）─── */}
                <Route path="/community/*" element={<CommunityFrame />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CoreAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
