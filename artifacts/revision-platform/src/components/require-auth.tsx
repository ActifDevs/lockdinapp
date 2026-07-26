import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { PageLoader } from "@/components/page-loader";

type RequireAuthProps = {
  children: ReactNode;
  /** When true, redirect onboarded users away from onboarding */
  onboardingOnly?: boolean;
};

/**
 * Client-side route guard for the localStorage auth model.
 * - Unauthenticated → /login
 * - Authenticated but not onboarded → /onboarding (unless onboardingOnly)
 * - Onboarded on /onboarding → /dashboard
 */
export function RequireAuth({ children, onboardingOnly = false }: RequireAuthProps) {
  const { isAuthenticated, isOnboarded } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
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
  }, [isAuthenticated, isOnboarded, onboardingOnly, location, setLocation]);

  if (!isAuthenticated) return <PageLoader />;
  if (onboardingOnly && isOnboarded) return <PageLoader />;
  if (!onboardingOnly && !isOnboarded) return <PageLoader />;

  return <>{children}</>;
}

/** Redirect authenticated users away from login/signup */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isOnboarded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;
    setLocation(isOnboarded ? "/dashboard" : "/onboarding");
  }, [isAuthenticated, isOnboarded, setLocation]);

  if (isAuthenticated) return <PageLoader />;
  return <>{children}</>;
}
