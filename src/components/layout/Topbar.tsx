import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Search, Plus, Play, User, Bell, Moon, Sun, Lightbulb, Bot, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSidebarContext } from './AppSidebar';
import { useLocale } from '@/i18n/LocaleContext';
import { mockUser } from '@/data/mock';
import { getAlerts } from '@/services/api';
import { cn } from '@/lib/utils';

export function Topbar() {
  const { setMobileOpen } = useSidebarContext();
  const { t, locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [openAlerts, setOpenAlerts] = useState(0);

  useEffect(() => {
    getAlerts().then((list) => {
      setOpenAlerts(list.filter((a) => a.status === 'open').length);
    }).catch(() => {});
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-40 h-14 border-b backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl" style={{ borderColor: 'var(--oc-border)', background: 'rgba(6,6,10,0.9)' }}>
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 w-8 p-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search - Desktop */}
          <div className="hidden md:flex relative w-64 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('topbar.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/tasks?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              className="pl-9 h-8 text-sm bg-secondary/50"
            />
          </div>

          {/* Search - Mobile trigger */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-8 w-8 p-0"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Quick Actions - Desktop */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              size="sm"
              className="h-8 gap-1.5"
              data-nav-action="new-task"
              data-nav-path="/tasks?new=true"
              onClick={() => navigate('/tasks?new=true')}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t('topbar.newTask')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              data-nav-action="run-now"
              data-nav-path="/runs"
              onClick={() => navigate('/runs')}
            >
              <Play className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t('topbar.runNow')}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 hidden xl:flex" asChild>
              <Link to="/review">
                <Lightbulb className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{t('topbar.review')}</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 hidden xl:flex" asChild>
              <Link to="/cursor">
                <Bot className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">OpenClaw</span>
              </Link>
            </Button>
          </div>

          {/* Alerts */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 relative"
            onClick={() => navigate('/alerts')}
          >
            <Bell className="h-4 w-4" />
            {openAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
                {openAlerts}
              </span>
            )}
          </Button>

          {/* Language: 中文 / English */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={locale === 'zh' ? 'Switch to English' : '切換至中文'}>
                <Languages className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale('zh')}>
                中文 {locale === 'zh' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('en')}>
                English {locale === 'en' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={toggleDarkMode}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
                <div className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium">
                  {mockUser.name.charAt(0)}
                </div>
                <span className="hidden lg:inline text-sm">{mockUser.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{mockUser.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{mockUser.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                {t('topbar.settings')}
              </DropdownMenuItem>
              <DropdownMenuItem>{t('topbar.profile')}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                {t('topbar.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="top-4 translate-y-0 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="sr-only">{t('topbar.searchTitle')}</DialogTitle>
            <DialogDescription className="sr-only">{t('topbar.searchPlaceholder')}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('topbar.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/tasks?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchOpen(false);
                }
              }}
              className="pl-9"
              autoFocus
            />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
