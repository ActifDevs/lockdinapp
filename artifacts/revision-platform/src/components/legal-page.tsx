import { BrandName } from "@/components/brand-name";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div className="grain flex min-h-[100dvh] flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="brand-icon-sm">
              <GraduationCap className="h-4 w-4" strokeWidth={2} />
            </span>
            <BrandName />
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="display-title text-balance">{title}</h1>
        <div className="prose prose-neutral mt-8 max-w-none text-muted-foreground dark:prose-invert">
          {children}
        </div>
      </main>
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 text-sm text-muted-foreground sm:px-6">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <span className="text-border">·</span>
          <span>© {new Date().getFullYear()} <BrandName /></span>
        </div>
      </footer>
    </div>
  );
}
