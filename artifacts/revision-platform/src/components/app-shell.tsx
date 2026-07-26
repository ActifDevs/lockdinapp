import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChartBar,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  MoreHorizontal,
  Settings,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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

function NavLink({
  item,
  location,
  className,
}: {
  item: NavItem;
  location: string;
  className?: string;
}) {
  const active = isActivePath(location, item.href);
  return (
    <Link href={item.href}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
          active
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
          className,
        )}
      >
        <item.icon className="h-3.5 w-3.5" aria-hidden />
        {item.title}
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, user, firstName } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setMoreOpen(false);
  }, [location]);

  if (!isAuthenticated) {
    return <div className="min-h-[100dvh] bg-background text-foreground">{children}</div>;
  }

  const displayName = firstName || user?.name || "Student";
  const secondaryActive = secondaryNav.some((item) => isActivePath(location, item.href));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:h-16 sm:px-6">
          <Link href="/dashboard" className="shrink-0 font-serif text-xl font-bold tracking-tight sm:text-2xl">
            Scholr
          </Link>

          <nav className="hidden flex-1 items-center gap-0.5 lg:flex" aria-label="Primary">
            {primaryNav.map((item) => (
              <NavLink key={item.href} item={item} location={location} />
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    secondaryActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                  More
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {secondaryNav.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex cursor-pointer items-center gap-2">
                      <item.icon className="h-4 w-4" aria-hidden />
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-11 min-w-11 cursor-pointer items-center gap-2 rounded-md px-1.5 transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Account menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                    {initials(user?.name || displayName)}
                  </div>
                  <div className="hidden min-w-0 flex-col text-left xl:flex">
                    <span className="truncate text-sm font-medium leading-none">{displayName}</span>
                    <span className="mt-1 text-xs text-muted-foreground">A-Level</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex cursor-pointer items-center gap-2">
                    <Settings className="h-4 w-4" aria-hidden />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-muted-foreground"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</div>
      </main>

      {/* Mobile bottom nav — 4 primary + More */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Mobile primary"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {primaryNav.map((item) => {
            const active = isActivePath(location, item.href);
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "text-primary")} aria-hidden />
                  <span className="truncate">{item.title.split(" ")[0]}</span>
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
              moreOpen || secondaryActive ? "text-foreground" : "text-muted-foreground",
            )}
            aria-expanded={moreOpen}
            aria-label="More navigation"
          >
            {moreOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <MoreHorizontal className={cn("h-5 w-5", secondaryActive && "text-primary")} aria-hidden />
            )}
            <span>More</span>
          </button>
        </div>

        {moreOpen && (
          <div className="border-t bg-background px-4 py-3">
            <div className="mx-auto flex max-w-lg flex-col gap-1">
              {secondaryNav.map((item) => {
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
                      <item.icon className="h-4 w-4" aria-hidden />
                      {item.title}
                    </span>
                  </Link>
                );
              })}
              <Link href="/settings">
                <span
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    isActivePath(location, "/settings")
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  <Settings className="h-4 w-4" aria-hidden />
                  Settings
                </span>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
