import { useState, createContext, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Kanban, 
  List, 
  Play, 
  FileText, 
  Bell, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  Cog,
  Bot,
  FolderKanban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebarContext must be used within SidebarProvider');
  return context;
}

const navItems = [
  { path: '/', label: '儀表板', icon: LayoutDashboard },
  { path: '/cursor', label: 'OpenClaw Agent 板', icon: Bot },
  { path: '/projects', label: '專案製作', icon: FolderKanban },
  { path: '/tasks', label: '任務看板', icon: Kanban },
  { path: '/tasks/list', label: '任務列表', icon: List },
  { path: '/runs', label: '執行紀錄', icon: Play },
  { path: '/logs', label: '日誌', icon: FileText },
  { path: '/alerts', label: '警報', icon: Bell },
  { path: '/settings', label: '設定', icon: Settings },
];

function NavItem({ 
  path, 
  label, 
  icon: Icon, 
  collapsed,
  onClick 
}: { 
  path: string; 
  label: string; 
  icon: typeof LayoutDashboard;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === path || 
    (path !== '/' && location.pathname.startsWith(path));

  const handleClick = (e: React.MouseEvent) => {
    onClick?.();
    navigate(path);
    e.preventDefault();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
      navigate(path);
    }
  };

  return (
    <Link
      to={path}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-nav-path={path}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
        'hover:bg-sidebar-accent',
        isActive 
          ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-sidebar-primary')} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SidebarContent({ collapsed, onItemClick }: { collapsed?: boolean; onItemClick?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b border-sidebar-border',
        collapsed && 'justify-center px-2'
      )}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
            <Cog className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">Openclaw</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItem 
            key={item.path} 
            {...item} 
            collapsed={collapsed}
            onClick={onItemClick}
          />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-muted">Openclaw 任務面板</p>
          <p className="text-xs text-sidebar-muted">v1.0.0</p>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebarContext();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent collapsed={collapsed} />
        <Button
          variant="ghost"
          size="sm"
          className="absolute bottom-4 -right-3 h-6 w-6 rounded-full bg-card border shadow-sm p-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn(
            'h-3 w-3 transition-transform',
            collapsed && 'rotate-180'
          )} />
        </Button>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
          <SidebarContent onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}
