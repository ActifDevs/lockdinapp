import { BrandName } from "@/components/brand-name";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { getLoginReason } from "@/components/auth-provider";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { IllustAuthDesk } from "@/components/illustrations";

type FieldErrors = {
  email?: string;
  password?: string;
};

function validateEmail(value: string) {
  if (!value.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    return "Enter a valid email address.";
  return undefined;
}

function validatePassword(value: string) {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return undefined;
}

function mapLoginError(err: unknown): string {
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  if (
    message.includes("invalid login") ||
    message.includes("invalid credentials") ||
    message.includes("email not confirmed")
  ) {
    return "Email or password is incorrect.";
  }
  return "We couldn't sign you in. Please try again.";
}

const googleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

export default function Login() {
  const { login, signInWithGoogle } = useAuth();
  const search = useSearch();
  const profileLoadReason = useMemo(
    () => getLoginReason(search) === "profile-load",
    [search],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
  }>({});

  const handleBlur = (field: keyof FieldErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({
      ...prev,
      [field]:
        field === "email" ? validateEmail(email) : validatePassword(password),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setTouched({ email: true, password: true });
    setErrors(next);
    if (next.email || next.password) return;

    setIsLoading(true);
    setFormError(null);
    try {
      await login(email, password);
      // RedirectIfAuthenticated honors a safe `next` query when onboarded.
    } catch (err) {
      setFormError(mapLoginError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setFormError(null);
    try {
      await signInWithGoogle();
    } catch {
      setFormError("We couldn't sign you in. Please try again.");
      setGoogleLoading(false);
    }
  };

  const busy = isLoading || googleLoading;

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <aside className="auth-aside grain">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(255,255,255,0.15),transparent_55%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-primary-foreground">
          <Link href="/" className="font-bold tracking-tight">
            <BrandName />
          </Link>
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            <IllustAuthDesk className="w-full max-w-[20rem]" />
          </div>
          <div className="max-w-sm">
            <p className="text-3xl font-semibold leading-snug tracking-tight">
              Pick up where you left off.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
              Your syllabus coverage, paper logs, and today’s plan stay in one
              workspace.
            </p>
          </div>
        </div>
      </aside>

      <div className="relative flex flex-col justify-center bg-background px-4 py-12 sm:px-8">
        <Link
          href="/"
          className="absolute left-4 top-6 font-bold tracking-tight lg:hidden"
        >
          <BrandName />
        </Link>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">
            Log in to continue your revision.
          </p>

          {profileLoadReason && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              We couldn&apos;t load your account. Please sign in again.
            </p>
          )}

          {googleAuthEnabled && (
            <>
              <Button
                type="button"
                variant="outline"
                className="mt-8 h-11 w-full cursor-pointer text-base"
                disabled={busy}
                onClick={() => void handleGoogle()}
              >
                {googleLoading ? "Connecting…" : "Continue with Google"}
              </Button>

              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className={googleAuthEnabled ? "space-y-4" : "mt-8 space-y-4"}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    setErrors((prev) => ({
                      ...prev,
                      email: validateEmail(e.target.value),
                    }));
                  }
                }}
                onBlur={() => handleBlur("email")}
                placeholder="you@school.edu"
                className={cn(
                  "h-11",
                  errors.email && touched.email && "border-destructive",
                )}
                aria-invalid={Boolean(errors.email && touched.email)}
                aria-describedby={
                  errors.email && touched.email ? "email-error" : undefined
                }
              />
              {errors.email && touched.email && (
                <p
                  id="email-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) {
                    setErrors((prev) => ({
                      ...prev,
                      password: validatePassword(e.target.value),
                    }));
                  }
                }}
                onBlur={() => handleBlur("password")}
                className={cn(
                  "h-11",
                  errors.password && touched.password && "border-destructive",
                )}
                aria-invalid={Boolean(errors.password && touched.password)}
                aria-describedby={
                  errors.password && touched.password
                    ? "password-error"
                    : undefined
                }
              />
              {errors.password && touched.password && (
                <p
                  id="password-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
            </div>

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              className="h-11 w-full cursor-pointer text-base active:scale-[0.98]"
              disabled={busy}
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            Need an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Invitation only
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
