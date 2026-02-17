import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar, SidebarProvider } from './AppSidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/utils';
import { CoreGatekeeper, CoreAuthBar } from '@/components/auth';

export function AppLayout() {
  const location = useLocation();
  const isOpenClawPage = location.pathname === '/cursor';
  // 社區路由在防火牆外，不需要核心認證
  const isCommunityRoute = location.pathname.startsWith('/community');

  // 社區路由 — 不經過核心防線
  if (isCommunityRoute) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-1 overflow-auto oc-main">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // 核心路由 — 必須通過防線認證
  return (
    <CoreGatekeeper>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <CoreAuthBar />
            {!isOpenClawPage && <Topbar />}
            <main className={cn('flex-1 overflow-auto', !isOpenClawPage && 'oc-main', isOpenClawPage && 'overflow-x-hidden')}>
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </CoreGatekeeper>
  );
}
