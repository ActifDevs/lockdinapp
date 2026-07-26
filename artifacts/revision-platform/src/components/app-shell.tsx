import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChartBar,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const primaryNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Study plan", href: "/study-plan", icon: ClipboardList },
  { title: "Subjects", href: "/subjects", icon: BookOpen },
  { title: "Past papers", href: "/past-papers", icon: FileText },
];

const secondaryNav: NavItem[] = [
  { title: "Progress", href: "/progress", icon: ChartBar },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
];

function isActivePath(location: string, href: string) {
  return location === href || (href !== "/dashboard" && location.startsWith(href));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

function SidebarNav({
  location,
  onNavigate,
}: {
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <nav className="space-y-1" aria-label="Primary">
        {primaryNav.map((item) => {
          const active = isActivePath(location, item.href);
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <span
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>

      <div>
        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/45">
          Insights
        </p>
        <nav className="space-y-1" aria-label="Secondary">
          {secondaryNav.map((item) => {
            const active = isActivePath(location, item.href);
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate}>
                <span
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function SidebarAccount({
  displayName,
  userName,
  onLogout,
  onNavigate,
}: {
  displayName: string;
  userName?: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  const settingsActive = isActivePath(location, "/settings");

  return (
    <div className="mt-auto space-y-1 border-t border-sidebar-border pt-4">
      <div className="mb-3 flex items-center gap-3 px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
          {initials(userName || displayName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
          <p className="text-xs text-sidebar-foreground/55">A-Level</p>
        </div>
      </div>
      <Link href="/settings" onClick={onNavigate}>
        <span
          className={cn(
            "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
            settingsActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
          )}
        >
          <Settings className="h-4 w-4" aria-hidden />
          Settings
        </span>
      </Link>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          onLogout();
        }}
        className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, user, firstName } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (!isAuthenticated) {
    return <div className="min-h-[100dvh] bg-background text-foreground">{children}</div>;
  }

  const displayName = firstName || user?.name || "Student";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" className="font-serif text-2xl font-bold tracking-tight text-sidebar-foreground">
            Scholr
          </Link>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-3 pb-4">
          <SidebarNav location={location} />
          <SidebarAccount
            displayName={displayName}
            userName={user?.name}
            onLogout={logout}
          />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 cursor-pointer"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
        <Link href="/dashboard" className="font-serif text-xl font-bold tracking-tight">
          Scholr
        </Link>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-[min(18rem,85vw)] flex-col bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="border-b border-sidebar-border px-5 py-4 text-left">
            <SheetTitle className="font-serif text-2xl font-bold tracking-tight text-sidebar-foreground">
              Scholr
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
            <SidebarNav location={location} onNavigate={() => setMobileOpen(false)} />
            <SidebarAccount
              displayName={displayName}
              userName={user?.name}
              onLogout={logout}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="md:pl-60">
        <main id="main-content" className="min-h-[100dvh]">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
