import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar, SidebarProvider } from './AppSidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const location = useLocation();
  const isOpenClawPage = location.pathname === '/cursor';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {!isOpenClawPage && <Topbar />}
          <main className={cn('flex-1 overflow-auto', !isOpenClawPage && 'oc-main', isOpenClawPage && 'overflow-x-hidden')}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
