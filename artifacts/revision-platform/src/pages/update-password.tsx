import { BrandName } from "@/components/brand-name";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function UpdatePassword() {
  const { updatePassword, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!isAuthenticated) {
      setError("This reset link is invalid or has expired. Request a new one.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => setLocation("/login"), 1200);
    } catch {
      setError("We couldn't update your password. Request a new reset link and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">
        Checking reset session…
      </div>
    );
  }

  return (
    <div className="grain relative flex min-h-[100dvh] items-center justify-center bg-muted/40 px-4">
      <Link
        href="/"
        className="absolute left-4 top-6 font-bold tracking-tight sm:left-8 sm:top-8"
      >
        <BrandName />
      </Link>

      <div className="relative z-10 w-full max-w-sm">
        <h1 className="font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-muted-foreground">
          {done
            ? "Password updated. Redirecting to login…"
            : "Enter and confirm a new password for your account."}
        </p>

        {!done && (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn("h-11")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={cn("h-11")}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-11 w-full cursor-pointer"
              disabled={submitting}
            >
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-8 inline-flex text-sm text-muted-foreground hover:text-foreground"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
