/* eslint-disable react-refresh/only-export-components */
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
  FolderKanban,
  Lightbulb,
  Tags,
  Cpu,
  Users,
  Building2,
  Shield,
  Castle,
  HardHat,
  Briefcase,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useFeatures } from '@/hooks/useFeatures';

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

// ─── 核心指揮中心（我們這邊 = 最後一站）───
const hubItems = [
  { path: '/', label: '儀表板', icon: LayoutDashboard },
  { path: '/cursor', label: 'Agent 指揮板', icon: Bot },
  { path: '/projects', label: '專案製作', icon: FolderKanban },
  { path: '/tasks', label: '任務看板', icon: Kanban },
  { path: '/tasks/list', label: '任務列表', icon: List },
  { path: '/runs', label: '執行紀錄', icon: Play },
  { path: '/review', label: '發想審核', icon: Lightbulb },
  { path: '/domains', label: '領域分類', icon: Tags },
];

// ─── 研究中心（大型基建）───
const centerItems = [
  { path: '/center', label: '中心總覽', icon: Building2 },
  { path: '/center/protection', label: '防護中心', icon: Shield },
  { path: '/center/defense', label: '防衛中心', icon: Castle },
  { path: '/center/infra', label: '基建區', icon: HardHat },
  { path: '/center/commerce', label: '商業中心', icon: Briefcase },
];

// ─── 社區多層空間（小蔡那邊 = 對外大門，多層防護）───
const communityItems = [
  { path: '/community', label: '多層空間總覽', icon: LayoutDashboard },
  { path: '/community/showcase', label: 'L0 公開展示', icon: LayoutDashboard },
  { path: '/community/contact', label: 'L1 基礎接觸', icon: Users },
  { path: '/community/workspace', label: 'L2 協作空間', icon: Cpu },
  { path: '/community/ollama', label: 'Ollama 任務板', icon: Cpu },
];

// ─── 系統 ───
const systemItems = [
  { path: '/control', label: '控制台', icon: Terminal },
  { path: '/logs', label: '日誌', icon: FileText },
  { path: '/alerts', label: '警報', icon: Bell },
  { path: '/settings', label: '設定', icon: Settings },
];

// 相容舊 navItems（feature flag 過濾用）
const navItems = [...hubItems, ...centerItems, ...communityItems, ...systemItems];

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

// ─── feature flag 過濾 ───
function useVisibleItems(items: typeof hubItems) {
  const { features } = useFeatures();
  return items.filter((item) => {
    if (item.path === '/cursor') return features['page.cursor'];
    if (item.path === '/projects') return features['page.projects'];
    if (item.path === '/tasks' || item.path === '/tasks/list') return true;
    if (item.path === '/runs') return features['page.runs'];
    if (item.path === '/logs') return features['page.logs'];
    if (item.path === '/alerts') return features['page.alerts'];
    if (item.path === '/review') return features['page.review'];
    if (item.path === '/settings') return features['page.settings'];
    if (item.path === '/domains') return true;
    // center routes always visible
    if (item.path.startsWith('/center')) return true;
    // community routes always visible
    if (item.path.startsWith('/community')) return true;
    return true;
  });
}

function SectionHeader({ label, icon: Icon, collapsed }: { label: string; icon: typeof LayoutDashboard; collapsed?: boolean }) {
  if (collapsed) {
    return <div className="mx-auto my-2 w-6 border-t border-sidebar-border/50" />;
  }
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-1">
      <Icon className="h-3.5 w-3.5 text-sidebar-foreground/40" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
        {label}
      </span>
    </div>
  );
}

function SidebarContent({ collapsed, onItemClick }: { collapsed?: boolean; onItemClick?: () => void }) {
  const visibleHub = useVisibleItems(hubItems);
  const visibleCenters = useVisibleItems(centerItems);
  const visibleCommunity = useVisibleItems(communityItems);
  const visibleSystem = useVisibleItems(systemItems);

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

      {/* Navigation — 四區分流 */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {/* 指揮中心 */}
        <SectionHeader label="指揮中心" icon={Bot} collapsed={collapsed} />
        {visibleHub.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} onClick={onItemClick} />
        ))}

        {/* 研究中心 */}
        <SectionHeader label="研究中心" icon={Building2} collapsed={collapsed} />
        {visibleCenters.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} onClick={onItemClick} />
        ))}

        {/* 社區延伸 */}
        <SectionHeader label="社區" icon={Users} collapsed={collapsed} />
        {visibleCommunity.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} onClick={onItemClick} />
        ))}

        {/* 系統 */}
        <SectionHeader label="系統" icon={Settings} collapsed={collapsed} />
        {visibleSystem.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} onClick={onItemClick} />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-muted">Openclaw 指揮中心</p>
          <p className="text-xs text-sidebar-muted">v1.1.0</p>
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
