import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ErrorBoundary } from "@/components/common";
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
import NotFound from "./pages/NotFound";
import OpenClawV4 from "../openclaw-cursor.jsx";

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
    <KeyboardShortcuts />
    <PerformanceMonitor />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route element={<AppLayout />}>
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
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
