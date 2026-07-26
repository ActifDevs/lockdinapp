import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight, GraduationCap, LayoutDashboard, BookOpen, FileText, TrendingUp } from "lucide-react";
import {
  EmptyIllustration,
  type EmptyScene,
} from "@/components/illustrations";

const features: {
  title: string;
  body: string;
  variant: string;
  scene: EmptyScene;
}[] = [
  {
    title: "Syllabus, topic by topic",
    body: "Cambridge A-Level syllabuses broken into units you can mark as covered — so completion is a real percentage, not a guess.",
    variant: "pastel-purple",
    scene: "books",
  },
  {
    title: "Past papers with a trail",
    body: "Log scores and papers in one place. Spot weak topics from the record instead of hunting through folders.",
    variant: "pastel-blue",
    scene: "papers",
  },
  {
    title: "Today's plan only",
    body: "Pick the topics and time blocks for the day. Open Scholr and know what to revise next — nothing else.",
    variant: "pastel-mint",
    scene: "tasks",
  },
];

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Study plan", icon: BookOpen, active: false },
  { label: "Subjects", icon: GraduationCap, active: false },
  { label: "Past papers", icon: FileText, active: false },
];

function ProductHeroVisual() {
  return (
    <div className="absolute inset-0 bg-background" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,hsl(var(--brand-teal)/0.22),transparent_45%),radial-gradient(ellipse_at_90%_20%,hsl(var(--brand-amber)/0.2),transparent_40%),radial-gradient(ellipse_at_80%_85%,hsl(var(--brand-coral)/0.14),transparent_45%)]" />
      <div className="absolute inset-x-0 bottom-0 top-[12%] mx-auto max-w-5xl px-4 sm:px-8">
        <div className="flex h-full overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-[0_24px_80px_-12px_hsl(var(--primary)/0.18)]">
          <div className="hidden w-48 shrink-0 flex-col border-r border-border/50 bg-card p-4 sm:flex">
            <div className="mb-5 flex items-center gap-2 px-1">
              <div className="brand-icon-sm">
                <GraduationCap className="h-4 w-4" strokeWidth={2} />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">Scholr</span>
            </div>
            <div className="space-y-1">
              {navItems.map(({ label, icon: Icon, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-auto rounded-xl border border-border/60 bg-muted/40 p-3">
              <div className="h-2 w-16 rounded bg-muted" />
              <div className="mt-2 h-2 w-24 rounded bg-muted/70" />
            </div>
          </div>
          <div className="min-w-0 flex-1 bg-muted/30">
            <div className="flex h-11 items-center border-b border-border/50 bg-card px-4 sm:hidden">
              <span className="text-sm font-bold tracking-tight">Scholr</span>
            </div>
            <div className="grid h-full grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:p-6">
              <div className="space-y-4 sm:col-span-2">
                <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-5 text-primary-foreground shadow-sm">
                  <div className="mb-1 text-xs font-medium text-primary-foreground/75">Good afternoon</div>
                  <div className="text-lg font-bold">Today's revision</div>
                  <div className="mt-3 inline-flex rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
                    3 tasks · 2h planned
                  </div>
                </div>
                <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold text-muted-foreground">Today's tasks</div>
                    <div className="text-xs font-medium text-primary">40% done</div>
                  </div>
                  {[["Mechanics review", "Physics"], ["Integration practice", "Maths"], ["Organic reactions", "Chemistry"]].map(
                    ([title, subject], i) => (
                      <div
                        key={title}
                        className="flex items-center gap-3 border-t border-border/40 py-3 first:border-t-0 first:pt-0"
                      >
                        <div
                          className={`h-4 w-4 rounded-full border-2 ${
                            i === 0 ? "border-primary bg-primary" : "border-primary/40"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="text-xs font-medium">{title}</div>
                          <div className="text-xs text-muted-foreground">{subject}</div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="hidden space-y-4 sm:block">
                <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" /> Syllabus
                  </div>
                  {[
                    { label: "Physics", pct: 72, color: "hsl(var(--chart-1))" },
                    { label: "Maths", pct: 54, color: "hsl(var(--chart-2))" },
                    { label: "Chemistry", pct: 41, color: "hsl(var(--chart-3))" },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="mb-3 last:mb-0">
                      <div className="mb-1 flex justify-between text-[10px]">
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground">Next exam</div>
                  <div className="mt-2 text-sm font-bold">Physics P2</div>
                  <div className="mt-1 text-xs font-medium text-primary">12 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <span className="brand-icon-sm">
              <GraduationCap className="h-4 w-4" strokeWidth={2} />
            </span>
            Scholr
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Open workspace
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log in
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="cursor-pointer active:scale-[0.98]">
                    Start free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <section className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden sm:min-h-[calc(100dvh-4rem)]">
          <ProductHeroVisual />

          <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:min-h-[calc(100dvh-4rem)] sm:px-6 sm:pb-20 md:pb-24">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
              }
              className="max-w-2xl rounded-2xl border border-border/50 bg-card/90 p-8 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.2)] backdrop-blur-sm sm:p-10"
            >
              <p className="mb-3 text-sm font-semibold tracking-wide text-primary">
                Cambridge A-Level revision
              </p>
              <h1 className="display-title mb-4">
                Syllabus, papers, and today&apos;s plan — in one workspace.
              </h1>
              <p className="mb-8 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Built around how A-Levels are actually structured. See what you've covered, what you've sat, and what to do next.
              </p>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
                  <Button
                    size="lg"
                    className="h-12 cursor-pointer px-7 text-base active:scale-[0.98]"
                  >
                    {isAuthenticated ? "Open workspace" : "Create your workspace"}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <Link
                    href="/login"
                    className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Already revising here? Log in
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-b bg-background py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-14 max-w-xl md:mb-20">
              <h2 className="mb-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
                Built for the A-Level calendar, not generic to-do lists.
              </h2>
              <p className="text-pretty text-muted-foreground md:text-lg">
                Syllabus units, past-paper logs, and a daily plan that matches how Cambridge courses actually run.
              </p>
            </div>

            <div className="space-y-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }
                  }
                  className={cn(
                    "surface-card grid items-center gap-6 rounded-2xl p-6 md:grid-cols-2 md:gap-10 md:p-8",
                    ["card-tint-cream", "card-tint-teal", "card-tint-amber", "card-tint-coral"][index % 4],
                    index % 2 === 1 && "md:[&>*:first-child]:order-2",
                  )}
                >
                  <div>
                    <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.variant}`}>
                      <span className="text-sm font-bold tabular text-primary">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mb-3 text-xl font-semibold tracking-tight">{feature.title}</h3>
                    <p className="max-w-prose text-pretty leading-relaxed text-muted-foreground">{feature.body}</p>
                  </div>
                  <div
                    className={cn(
                      "flex min-h-[11rem] items-center justify-center rounded-xl px-4 py-6",
                      feature.variant,
                    )}
                    aria-hidden
                  >
                    <EmptyIllustration scene={feature.scene} className="max-w-[11rem]" />
                  </div>                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-cta-section">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-xl">
              <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl">
                Start with your subjects. Plan today's revision from there.
              </h2>
              <p className="hero-band-muted mb-8 text-pretty md:text-lg">
                Free to set up. Add your papers and syllabus when you're ready — no trial countdown.
              </p>
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 cursor-pointer px-7 text-base cta-on-brand active:scale-[0.98]"
                >
                  Create your workspace
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/40 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="brand-icon h-7 w-7 rounded-lg">
              <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            Scholr
          </span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span>© {new Date().getFullYear()} Scholr</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
