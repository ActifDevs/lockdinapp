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

export default function Signup() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
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

  const handleSubmit = (e: React.FormEvent) => {
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
    setTimeout(() => {
      login({ name: name.trim(), email: email.trim() });
    }, 600);
  };

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
          <h1 className="font-bold tracking-tight">Create an account</h1>
          <p className="mt-2 text-muted-foreground">Organise your A-Level revision in one place.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
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
                placeholder="Jordan Mensah"
                className={cn("h-11", errors.name && touched.name && "border-destructive")}
                aria-invalid={Boolean(errors.name && touched.name)}
                aria-describedby={errors.name && touched.name ? "name-error" : undefined}
              />
              {errors.name && touched.name && (
                <p id="name-error" className="text-sm text-destructive" role="alert">
                  {errors.name}
                </p>
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
                placeholder="you@school.edu"
                className={cn("h-11", errors.email && touched.email && "border-destructive")}
                aria-invalid={Boolean(errors.email && touched.email)}
                aria-describedby={errors.email && touched.email ? "email-error" : undefined}
              />
              {errors.email && touched.email && (
                <p id="email-error" className="text-sm text-destructive" role="alert">
                  {errors.email}
                </p>
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
                    setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur("password")}
                className={cn("h-11", errors.password && touched.password && "border-destructive")}
                aria-invalid={Boolean(errors.password && touched.password)}
                aria-describedby={
                  errors.password && touched.password ? "password-error" : "password-hint"
                }
              />
              {errors.password && touched.password ? (
                <p id="password-error" className="text-sm text-destructive" role="alert">
                  {errors.password}
                </p>
              ) : (
                <p id="password-hint" className="text-xs text-muted-foreground">
                  At least 8 characters.
                </p>
              )}
            </div>

            <Button type="submit" className="h-11 w-full cursor-pointer text-base active:scale-[0.98]" disabled={isLoading}>
              {isLoading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
