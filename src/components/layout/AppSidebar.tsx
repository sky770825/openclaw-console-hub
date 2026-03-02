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
  ChevronLeft,
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
  Rocket,
  Radar,
  Factory,
  Brain,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useFeatures } from '@/hooks/useFeatures';
import { useLocale } from '@/i18n/LocaleContext';

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

// ─── 星艦艦橋（核心指揮）───
const hubItems = [
  { path: '/', labelKey: 'sidebar.nav.bridge', icon: LayoutDashboard },
  { path: '/cursor', labelKey: 'sidebar.nav.cursor', icon: Bot },
  { path: '/projects', labelKey: 'sidebar.nav.projects', icon: FolderKanban },
  { path: '/tasks', labelKey: 'sidebar.nav.tasks', icon: Kanban },
  { path: '/tasks/list', labelKey: 'sidebar.nav.taskList', icon: List },
  { path: '/runs', labelKey: 'sidebar.nav.runs', icon: Play },
  { path: '/review', labelKey: 'sidebar.nav.review', icon: Lightbulb },
  { path: '/domains', labelKey: 'sidebar.nav.domains', icon: Tags },
];

// ─── 科技甲板（研究 + 星艦科技）───
const centerItems = [
  { path: '/center', labelKey: 'sidebar.nav.deckOverview', icon: Building2 },
  { path: '/center/protection', labelKey: 'sidebar.nav.protection', icon: Shield },
  { path: '/center/defense', labelKey: 'sidebar.nav.defense', icon: Castle },
  { path: '/center/ai', labelKey: 'sidebar.nav.ai', icon: Brain },
  { path: '/center/infra', labelKey: 'sidebar.nav.infra', icon: HardHat },
  { path: '/center/commerce', labelKey: 'sidebar.nav.commerce', icon: Briefcase },
  { path: '/center/automation', labelKey: 'sidebar.nav.automation', icon: Workflow },
  { path: '/starship/mdci', labelKey: 'sidebar.nav.mdci', icon: Radar },
  { path: '/starship/frameworks', labelKey: 'sidebar.nav.frameworks', icon: Shield },
  { path: '/starship/manufacturing', labelKey: 'sidebar.nav.manufacturing', icon: Factory },
];

// ─── 通訊甲板（社區）───
const communityItems = [
  { path: '/community', labelKey: 'sidebar.nav.communityOverview', icon: LayoutDashboard },
  { path: '/community/showcase', labelKey: 'sidebar.nav.showcase', icon: LayoutDashboard },
  { path: '/community/contact', labelKey: 'sidebar.nav.contact', icon: Users },
  { path: '/community/workspace', labelKey: 'sidebar.nav.workspace', icon: Cpu },
  { path: '/community/ollama', labelKey: 'sidebar.nav.ollama', icon: Cpu },
];

// ─── 輪機系統 ───
const systemItems = [
  { path: '/control', labelKey: 'sidebar.nav.control', icon: Terminal },
  { path: '/logs', labelKey: 'sidebar.nav.logs', icon: FileText },
  { path: '/alerts', labelKey: 'sidebar.nav.alerts', icon: Bell },
  { path: '/settings', labelKey: 'sidebar.nav.settings', icon: Settings },
];

function NavItem({
  path,
  labelKey,
  icon: Icon,
  collapsed,
  onClick
}: {
  path: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const { t } = useLocale();
  const label = t(labelKey);
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path));

  const doNavigate = () => {
    onClick?.();
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => navigate(path));
    } else {
      navigate(path);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    doNavigate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      doNavigate();
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
    // starship routes always visible
    if (item.path.startsWith('/starship')) return true;
    // community routes always visible
    if (item.path.startsWith('/community')) return true;
    return true;
  });
}

function SectionHeader({ labelKey, icon: Icon, collapsed }: { labelKey: string; icon: typeof LayoutDashboard; collapsed?: boolean }) {
  const { t } = useLocale();
  if (collapsed) {
    return <div className="mx-auto my-2 w-6 border-t border-sidebar-border/50" />;
  }
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-1">
      <Icon className="h-3.5 w-3.5 text-sidebar-foreground/40" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
        {t(labelKey)}
      </span>
    </div>
  );
}

function SidebarContent({ collapsed, onItemClick }: { collapsed?: boolean; onItemClick?: () => void }) {
  const { t } = useLocale();
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
            <Rocket className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">{t('sidebar.title')}</span>
          )}
        </div>
      </div>

      {/* Navigation — 四區分流 */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        <SectionHeader labelKey="sidebar.section.bridge" icon={Rocket} collapsed={collapsed} />
        {visibleHub.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} onClick={onItemClick} />
        ))}
        <SectionHeader labelKey="sidebar.section.deck" icon={Building2} collapsed={collapsed} />
        {visibleCenters.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} onClick={onItemClick} />
        ))}
        <SectionHeader labelKey="sidebar.section.community" icon={Users} collapsed={collapsed} />
        {visibleCommunity.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} onClick={onItemClick} />
        ))}
        <SectionHeader labelKey="sidebar.section.system" icon={Settings} collapsed={collapsed} />
        {visibleSystem.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} onClick={onItemClick} />
        ))}
      </nav>

      {!collapsed && (
        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-muted">{t('sidebar.footer')}</p>
          <p className="text-xs text-sidebar-muted">v2.0.0</p>
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
