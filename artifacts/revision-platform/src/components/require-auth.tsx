import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth, getSafeNextPath } from "@/hooks/use-auth";
import { PageLoader } from "@/components/page-loader";

type RequireAuthProps = {
  children: ReactNode;
  /** When true, redirect onboarded users away from onboarding */
  onboardingOnly?: boolean;
};

/**
 * Client-side route guard for Supabase Auth sessions.
 * - Loading → PageLoader (no redirect)
 * - Unauthenticated → /login?next=…
 * - Authenticated but not onboarded → /onboarding (unless onboardingOnly)
 * - Onboarded on /onboarding → /dashboard
 */
export function RequireAuth({ children, onboardingOnly = false }: RequireAuthProps) {
  const { isLoading, isAuthenticated, isOnboarded } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation(`/login?next=${encodeURIComponent(location)}`);
      return;
    }
    if (onboardingOnly) {
      if (isOnboarded) setLocation("/dashboard");
      return;
    }
    if (!isOnboarded) {
      setLocation("/onboarding");
    }
  }, [isLoading, isAuthenticated, isOnboarded, onboardingOnly, location, setLocation]);

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <PageLoader />;
  if (onboardingOnly && isOnboarded) return <PageLoader />;
  if (!onboardingOnly && !isOnboarded) return <PageLoader />;

  return <>{children}</>;
}

/** Redirect authenticated users away from login/signup */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isOnboarded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!isOnboarded) {
      setLocation("/onboarding");
      return;
    }
    const next = getSafeNextPath(window.location.search);
    setLocation(next ?? "/dashboard");
  }, [isLoading, isAuthenticated, isOnboarded, setLocation]);

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <PageLoader />;
  return <>{children}</>;
}
