import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { IllustLost } from "@/components/illustrations";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Scholr
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <IllustLost className="mb-6 max-w-[14rem]" />
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          404
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          This page isn’t here.
        </h1>
        <p className="mt-3 text-pretty text-muted-foreground">
          The link may be out of date, or the page moved. Head back to your workspace or the home page.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard">
            <Button className="active:scale-[0.98]">Go to dashboard</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="active:scale-[0.98]">
              Back to home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
