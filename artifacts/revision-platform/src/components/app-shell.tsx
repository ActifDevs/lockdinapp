import { Link, useLocation } from "wouter";
import { BrandName } from "@/components/brand-name";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BookOpen,
  CalendarDays,
  ChartBar,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  /** Soft icon accent — meaning, not decoration */
  tone: "home" | "plan" | "subjects" | "papers" | "progress" | "calendar" | "settings";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Today",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Home, tone: "home" },
      { title: "Study plan", href: "/study-plan", icon: ClipboardList, tone: "plan" },
    ],
  },
  {
    label: "Revision",
    items: [
      { title: "Subjects", href: "/subjects", icon: BookOpen, tone: "subjects" },
      { title: "Past papers", href: "/past-papers", icon: FileText, tone: "papers" },
      { title: "Progress", href: "/progress", icon: ChartBar, tone: "progress" },
      { title: "Calendar", href: "/calendar", icon: CalendarDays, tone: "calendar" },
    ],
  },
];

const bottomPrimary: NavItem[] = [
  { title: "Home", href: "/dashboard", icon: Home, tone: "home" },
  { title: "Plan", href: "/study-plan", icon: ClipboardList, tone: "plan" },
  { title: "Progress", href: "/progress", icon: ChartBar, tone: "progress" },
  { title: "Subjects", href: "/subjects", icon: BookOpen, tone: "subjects" },
];

const bottomMore: NavItem[] = [
  { title: "Past papers", href: "/past-papers", icon: FileText, tone: "papers" },
  { title: "Calendar", href: "/calendar", icon: CalendarDays, tone: "calendar" },
  { title: "Settings", href: "/settings", icon: Settings, tone: "settings" },
];

function navToneClass(tone: NavItem["tone"]) {
  return `sidebar-icon-${tone}`;
}

function isActivePath(location: string, href: string) {
  return location === href || (href !== "/dashboard" && location.startsWith(href));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

function SidebarTooltip({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  if (!collapsed) return children;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarNavLink({
  item,
  location,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  location: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = isActivePath(location, item.href);

  return (
    <SidebarTooltip label={item.title} collapsed={collapsed}>
      <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}>
        <span className={cn("sidebar-link cursor-pointer", active && "sidebar-link-active")}>
          <span className={cn("sidebar-icon", navToneClass(item.tone))} aria-hidden>
            <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
          </span>
          <span className="sidebar-link-label truncate">{item.title}</span>
        </span>
      </Link>
    </SidebarTooltip>
  );
}

function useResolvedDark() {
  const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      setIsDark(theme === "dark" || (theme === "system" && media.matches));
    };

    syncTheme();
    if (theme === "system") {
      media.addEventListener("change", syncTheme);
      return () => media.removeEventListener("change", syncTheme);
    }

    return undefined;
  }, [theme]);

  return {
    isDark,
    toggleTheme: () => setTheme(isDark ? "light" : "dark"),
  };
}

function SidebarContent({
  location,
  displayName,
  userName,
  userEmail,
  onLogout,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  showBrand = true,
  showCollapseControl = false,
}: {
  location: string;
  displayName: string;
  userName: string;
  userEmail?: string;
  onLogout: () => void;
  onNavigate?: () => void;
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  showBrand?: boolean;
  showCollapseControl?: boolean;
}) {
  const { isDark, toggleTheme } = useResolvedDark();
  const settingsActive = isActivePath(location, "/settings");

  return (
    <div className="sidebar-inner">
      {showBrand && (
        <div className="sidebar-brand-row">
          <SidebarTooltip label="Lockdin dashboard" collapsed={collapsed}>
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className={cn("sidebar-brand min-w-0 flex-1", collapsed && "flex-1")}
            >
              <span className="sidebar-brand-mark" aria-hidden>
                <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="sidebar-brand-text">
                <BrandName className="sidebar-brand-name" />
                <span className="sidebar-brand-tag">A-Level workspace</span>
              </span>
            </Link>
          </SidebarTooltip>

          {showCollapseControl && onToggleCollapsed && (
            <SidebarTooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} collapsed={collapsed}>
              <button
                type="button"
                className="sidebar-collapse-btn cursor-pointer"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                onClick={onToggleCollapsed}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                ) : (
                  <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                )}
              </button>
            </SidebarTooltip>
          )}
        </div>
      )}

      <div className="sidebar-scroll">
        {navGroups.map((group) => (
          <section key={group.label} className="sidebar-group" aria-label={group.label}>
            <p className="sidebar-group-label">{group.label}</p>
            <nav className="space-y-0" aria-label={group.label}>
              {group.items.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  location={location}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </nav>
          </section>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <SidebarTooltip label="Settings" collapsed={collapsed}>
            <Link
              href="/settings"
              onClick={onNavigate}
              aria-current={settingsActive ? "page" : undefined}
              className={cn("min-w-0", collapsed ? "w-full" : "flex-1")}
            >
              <span
                className={cn(
                  "sidebar-link mb-0 cursor-pointer",
                  settingsActive && "sidebar-link-active",
                )}
              >
                <span className={cn("sidebar-icon", navToneClass("settings"))} aria-hidden>
                  <Settings className="h-[18px] w-[18px]" strokeWidth={settingsActive ? 2.25 : 1.75} />
                </span>
                <span className="sidebar-link-label truncate">Settings</span>
              </span>
            </Link>
          </SidebarTooltip>

          <SidebarTooltip label={isDark ? "Light mode" : "Dark mode"} collapsed={collapsed}>
            <button
              type="button"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
              onClick={toggleTheme}
              className="sidebar-icon-btn cursor-pointer"
            >
              {isDark ? (
                <Sun className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </SidebarTooltip>
        </div>

        <div className="sidebar-user-card">
          <SidebarTooltip
            label={userEmail ? `${displayName} · ${userEmail}` : displayName}
            collapsed={collapsed}
          >
            <div className="sidebar-user-avatar" aria-hidden>
              {initials(userName || displayName)}
            </div>
          </SidebarTooltip>
          <div className="sidebar-user-meta min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
            {userEmail && <p className="truncate text-xs text-muted-foreground">{userEmail}</p>}
          </div>
          <SidebarTooltip label="Sign out" collapsed={collapsed}>
            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => {
                onNavigate?.();
                onLogout();
              }}
              className="sidebar-icon-btn sidebar-icon-btn-muted cursor-pointer"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          </SidebarTooltip>
        </div>

        <div className="sidebar-legal">
          <Link href="/privacy" onClick={onNavigate}>
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" onClick={onNavigate}>
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, user, firstName } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [location] = useLocation();
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "b" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      toggleCollapsed();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed]);

  if (!isAuthenticated) {
    return <div className="min-h-[100dvh] bg-background text-foreground">{children}</div>;
  }

  const displayName = firstName || user?.name || "Scholar";
  const userName = user?.name || displayName;
  const moreActive = bottomMore.some((item) => isActivePath(location, item.href));

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-[100dvh] bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        <aside
          className={cn("app-sidebar hidden md:flex", collapsed && "app-sidebar-collapsed")}
          aria-label="Sidebar"
          aria-expanded={!collapsed}
        >
          <SidebarContent
            location={location}
            displayName={displayName}
            userName={userName}
            userEmail={user?.email}
            onLogout={() => {
              void logout();
            }}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            showCollapseControl
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/40 bg-background/85 px-4 backdrop-blur-md md:hidden">
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-sheet"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>
            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center gap-2 text-lg font-bold tracking-tight"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-4 w-4" strokeWidth={2} />
              </span>
              <BrandName />
            </Link>
          </header>

          <main
            id="main-content"
            className="flex-1 overflow-x-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-[env(safe-area-inset-bottom,0px)]"
          >
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile bottom nav — daily habit loop */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
          aria-label="Mobile primary"
        >
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {bottomPrimary.map((item) => {
              const active = isActivePath(location, item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                  <span
                    className={cn(
                      "relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors duration-200",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {active && (
                      <span
                        className="absolute inset-x-[38%] top-0 h-0.5 rounded-full bg-primary"
                        aria-hidden
                      />
                    )}
                    <item.icon
                      className={cn("h-5 w-5", active && "sidebar-icon-active")}
                      strokeWidth={active ? 2.25 : 1.75}
                      aria-hidden
                    />
                    <span className="truncate">{item.title}</span>
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className={cn(
                "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors duration-200",
                moreOpen || moreActive ? "text-foreground" : "text-muted-foreground",
              )}
              aria-expanded={moreOpen}
              aria-label="More navigation"
            >
              {moreOpen ? (
                <X className="h-5 w-5" aria-hidden />
              ) : (
                <MoreHorizontal
                  className={cn("h-5 w-5", moreActive && "text-primary")}
                  aria-hidden
                />
              )}
              <span>More</span>
            </button>
          </div>

          {moreOpen && (
            <div className="border-t border-border/60 bg-background px-4 py-3">
              <div className="mx-auto flex max-w-lg flex-col gap-1">
                {bottomMore.map((item) => {
                  const active = isActivePath(location, item.href);
                  return (
                    <Link key={item.href} href={item.href}>
                      <span
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                        )}
                      >
                        <item.icon
                          className={cn("h-4 w-4", active && "sidebar-icon-active")}
                          aria-hidden
                        />
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            id="mobile-nav-sheet"
            side="left"
            className="w-[min(18.5rem,92vw)] border-r border-sidebar-border bg-sidebar p-0 [&>button]:right-3 [&>button]:top-3 [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-xl"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation menu</SheetTitle>
            </SheetHeader>
            <SidebarContent
              location={location}
              displayName={displayName}
              userName={userName}
              userEmail={user?.email}
              onLogout={() => {
                void logout();
              }}
              onNavigate={() => setMobileOpen(false)}
              collapsed={false}
            />
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
