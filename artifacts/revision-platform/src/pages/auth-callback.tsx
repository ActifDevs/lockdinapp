import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";

/**
 * Handles Supabase Auth redirect callbacks (email confirm / OAuth).
 * Tokens are processed by the Supabase client; this page never prints them.
 */
export default function AuthCallback() {
  const { isLoading, isAuthenticated, isOnboarded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      setLocation(isOnboarded ? "/dashboard" : "/onboarding");
    }
  }, [isLoading, isAuthenticated, isOnboarded, setLocation]);

  if (isLoading || isAuthenticated) {
    return <PageLoader />;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold tracking-tight">Sign-in incomplete</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We couldn’t finish signing you in. Try again from the login page.
      </p>
      <Button asChild>
        <Link href="/login">Back to login</Link>
      </Button>
    </div>
  );
}
