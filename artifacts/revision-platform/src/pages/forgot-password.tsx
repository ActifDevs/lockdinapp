import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

function validateEmail(value: string) {
  if (!value.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter a valid email address.";
  return undefined;
}

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validateEmail(email);
    setTouched(true);
    setError(next);
    if (next) return;
    setIsSubmitted(true);
  };

  return (
    <div className="grain relative flex min-h-[100dvh] items-center justify-center bg-muted/40 px-4">
      <Link
        href="/"
        className="absolute left-4 top-6 font-serif text-2xl font-bold tracking-tight sm:left-8 sm:top-8"
      >
        Scholr
      </Link>

      <div className="relative z-10 w-full max-w-sm">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-2 text-muted-foreground">
          {isSubmitted
            ? "If an account exists for that email, a reset link is on its way."
            : "Enter your email and we’ll send a reset link."}
        </p>

        {isSubmitted ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Check your inbox for instructions. The link expires after a short time.
            </p>
            <Button
              variant="outline"
              className="h-11 w-full cursor-pointer"
              onClick={() => {
                setIsSubmitted(false);
                setEmail("");
                setError(undefined);
                setTouched(false);
              }}
            >
              Try another email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched) setError(validateEmail(e.target.value));
                }}
                onBlur={() => {
                  setTouched(true);
                  setError(validateEmail(email));
                }}
                placeholder="you@school.edu"
                className={cn("h-11", error && touched && "border-destructive")}
                aria-invalid={Boolean(error && touched)}
                aria-describedby={error && touched ? "email-error" : undefined}
              />
              {error && touched && (
                <p id="email-error" className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" className="h-11 w-full cursor-pointer text-base active:scale-[0.98]">
              Send reset link
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to login
        </Link>
      </div>
    </div>
  );
}
