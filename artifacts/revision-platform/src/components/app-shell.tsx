import { Link, useLocation } from "wouter";
import { BookOpen, Calendar, CheckSquare, LayoutDashboard, Settings, TrendingUp, Menu, X, Library } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useState } from "react";
import { useTheme } from "./theme-provider";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "My Subjects", href: "/subjects", icon: BookOpen },
  { title: "Study Plan", href: "/study-plan", icon: CheckSquare },
  { title: "Past Papers", href: "/past-papers", icon: Library },
  { title: "Progress", href: "/progress", icon: TrendingUp },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  
  return (
    <div className={cn("flex h-full w-[240px] flex-col border-r bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex h-16 items-center px-6 font-serif text-2xl font-bold tracking-tight">
        Scholr
      </div>
      
      <div className="px-6 py-4">
        <div className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Alex M.</span>
            <span className="text-xs text-muted-foreground mt-1">A-Level Student</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-2">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "")} />
                {item.title}
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  
  // Close mobile menu on route change
  useState(() => {
    setMobileMenuOpen(false);
  });

  if (!isAuthenticated) {
    return <div className="min-h-[100dvh] bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar className="fixed inset-y-0 left-0 z-50" />
      </div>
      
      {/* Mobile Header & Menu */}
      <div className="md:hidden flex flex-col w-full h-[100dvh]">
        <header className="flex h-14 items-center justify-between border-b px-4 bg-sidebar">
          <div className="font-serif text-xl font-bold">Scholr</div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>
        
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-14 z-50 bg-background/80 backdrop-blur-sm">
            <div className="absolute inset-x-0 top-0 bg-sidebar border-b p-4 shadow-lg animate-in slide-in-from-top">
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium",
                          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.title}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
        
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Desktop Main Content */}
      <main className="hidden md:block flex-1 pl-[240px]">
        <div className="mx-auto max-w-5xl p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
