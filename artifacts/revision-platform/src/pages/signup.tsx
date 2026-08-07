import { BrandName } from "@/components/brand-name";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { IllustBooks } from "@/components/illustrations";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

function validateName(value: string) {
  if (value.trim().length < 2) return "Enter your full name.";
  return undefined;
}

function validateEmail(value: string) {
  if (!value.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter a valid email address.";
  return undefined;
}

function validatePassword(value: string) {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return undefined;
}

const googleAuthEnabled =
  import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

export default function Signup() {
  const { signUp, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean }>({});

  const validators = {
    name: validateName,
    email: validateEmail,
    password: validatePassword,
  };

  const handleBlur = (field: keyof FieldErrors) => {
    const value = field === "name" ? name : field === "email" ? email : password;
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validators[field](value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setTouched({ name: true, email: true, password: true });
    setErrors(next);
    if (next.name || next.email || next.password) return;

    setIsLoading(true);
    setFormError(null);
    try {
      const result = await signUp({
        fullName: name.trim(),
        email: email.trim(),
        password,
      });
      if (result.emailConfirmationRequired) {
        setNeedsConfirmation(true);
      }
      // When a session is available, AuthProvider routes via RedirectIfAuthenticated / guards.
    } catch {
      setFormError("We couldn't create your account. Please try again.");
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
            <IllustBooks onBrand className="w-full max-w-[18rem]" />
          </div>
          <div className="max-w-sm">
            <p className="text-3xl font-semibold leading-snug tracking-tight">
              Your A-Level workspace starts with your subjects.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
              Add syllabus units, log papers, and keep a daily plan that matches Cambridge structure.
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
          {needsConfirmation ? (
            <div className="space-y-4">
              <h1 className="font-bold tracking-tight">Check your email</h1>
              <p className="text-muted-foreground">
                If an account was created, we sent a confirmation link. Open it to continue, then
                sign in.
              </p>
              <Button asChild className="h-11 w-full cursor-pointer">
                <Link href="/login">Back to login</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-bold tracking-tight">Create your account</h1>
              <p className="mt-2 text-muted-foreground">Start Lockdin with your school email.</p>

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
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (touched.name) {
                        setErrors((prev) => ({ ...prev, name: validateName(e.target.value) }));
                      }
                    }}
                    onBlur={() => handleBlur("name")}
                    className={cn("h-11", errors.name && touched.name && "border-destructive")}
                  />
                  {errors.name && touched.name && (
                    <p className="text-sm text-destructive" role="alert">{errors.name}</p>
                  )}
                </div>
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
                        setErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                      }
                    }}
                    onBlur={() => handleBlur("email")}
                    className={cn("h-11", errors.email && touched.email && "border-destructive")}
                  />
                  {errors.email && touched.email && (
                    <p className="text-sm text-destructive" role="alert">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
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
                    className={cn("h-11", errors.password && touched.password && "border-destructive")}
                  />
                  {errors.password && touched.password && (
                    <p className="text-sm text-destructive" role="alert">{errors.password}</p>
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
                  {isLoading ? "Creating account…" : "Create account"}
                </Button>
              </form>

              <p className="mt-8 text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
