import { BrandName } from "@/components/brand-name";
import { useLandingLightTheme } from "@/hooks/use-landing-light-theme";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  FileText,
  TrendingUp,
} from "lucide-react";
import { EmptyIllustration, type EmptyScene } from "@/components/illustrations";
import { LandingSection } from "@/components/landing-section";

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
    body: "Pick the topics and time blocks for the day. Open Lockdin and know what to revise next — nothing else.",
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
    <div
      className="landing-hero-visual pointer-events-none absolute inset-0 bg-background"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,hsl(var(--brand-teal)/0.22),transparent_45%),radial-gradient(ellipse_at_90%_20%,hsl(var(--brand-amber)/0.2),transparent_40%),radial-gradient(ellipse_at_80%_85%,hsl(var(--brand-coral)/0.14),transparent_45%)]" />
      <div className="landing-hero-mock-frame">
        <div className="dark landing-hero-mock flex h-full overflow-hidden rounded-t-2xl border border-border/70 bg-card shadow-[0_24px_80px_-12px_hsl(var(--primary)/0.28)]">
          <div className="hidden w-48 shrink-0 flex-col border-r border-border/60 bg-card p-4 md:flex">
            <div className="mb-5 flex items-center gap-2 px-1">
              <div className="brand-icon-sm">
                <GraduationCap className="h-4 w-4" strokeWidth={2} />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">
                <BrandName />
              </span>
            </div>
            <div className="space-y-1">
              {navItems.map(({ label, icon: Icon, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/78"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-auto rounded-xl border border-border/60 bg-muted/55 p-3">
              <div className="h-2 w-16 rounded bg-foreground/20" />
              <div className="mt-2 h-2 w-24 rounded bg-foreground/14" />
            </div>
          </div>
          <div className="min-w-0 flex-1 bg-background/80">
            <div className="flex h-10 items-center border-b border-border/60 bg-card px-3 md:hidden">
              <span className="text-sm font-bold tracking-tight text-foreground">
                <BrandName />
              </span>
            </div>
            <div className="grid h-full grid-cols-1 gap-2.5 p-3 sm:gap-3 sm:p-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] md:gap-4 md:p-6">
              <div className="flex flex-col gap-2.5 sm:gap-3 md:gap-4">
                <div className="rounded-xl bg-gradient-to-br from-primary to-primary/90 p-3.5 text-primary-foreground shadow-sm sm:rounded-2xl sm:p-5">
                  <div className="mb-0.5 text-[11px] font-medium text-primary-foreground/90 sm:mb-1 sm:text-xs">
                    Good afternoon
                  </div>
                  <div className="text-base font-bold sm:text-lg">
                    Today&apos;s revision
                  </div>
                  <div className="mt-2 inline-flex rounded-md bg-primary-foreground/20 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground sm:mt-3 sm:px-3 sm:text-xs">
                    3 tasks · 2h planned
                  </div>
                </div>
                <div className="flex-1 rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:rounded-2xl sm:p-4">
                  <div className="mb-2 flex items-center justify-between sm:mb-3">
                    <div className="text-[11px] font-semibold text-foreground/85 sm:text-xs">
                      Today&apos;s tasks
                    </div>
                    <div className="text-[11px] font-semibold text-primary sm:text-xs">
                      40% done
                    </div>
                  </div>
                  {[
                    ["Mechanics review", "Physics"],
                    ["Integration practice", "Maths"],
                    ["Organic reactions", "Chemistry"],
                  ].map(([title, subject], i) => (
                    <div
                      key={title}
                      className={cn(
                        "flex items-center gap-3 border-t border-border/50 py-2.5 first:border-t-0 first:pt-0 sm:py-3",
                        i === 2 && "hidden sm:flex",
                      )}
                    >
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          i === 0
                            ? "border-primary bg-primary"
                            : "border-primary/65"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-foreground">
                          {title}
                        </div>
                        <div className="text-xs text-foreground/72">
                          {subject}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden flex-col gap-3 sm:gap-4 md:flex">
                <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:flex-1">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground/85">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" /> Syllabus
                  </div>
                  {[
                    { label: "Physics", pct: 72, color: "hsl(var(--chart-1))" },
                    { label: "Maths", pct: 54, color: "hsl(var(--chart-2))" },
                    {
                      label: "Chemistry",
                      pct: 41,
                      color: "hsl(var(--chart-3))",
                    },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="mb-3 last:mb-0">
                      <div className="mb-1 flex justify-between text-[10px]">
                        <span className="font-semibold text-foreground/90">
                          {label}
                        </span>
                        <span className="font-medium text-foreground/75">
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/80">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/45 p-4 shadow-sm">
                  <div className="text-xs font-semibold text-foreground/80">
                    Next exam
                  </div>
                  <div className="mt-2 text-sm font-bold text-foreground">
                    Physics P2
                  </div>
                  <div className="mt-1 text-xs font-semibold text-primary">
                    12 days
                  </div>
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
  useLandingLightTheme();

  return (
    <div className="landing-page flex min-h-[100dvh] flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <header className="landing-header fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight sm:text-2xl"
          >
            <span className="brand-icon-sm shrink-0">
              <GraduationCap className="h-4 w-4" strokeWidth={2} />
            </span>
            <BrandName />
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
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
                  <Button
                    size="sm"
                    className="cursor-pointer active:scale-[0.98]"
                  >
                    Invitation only
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <LandingSection
          id="hero"
          hero
          alignEnd
          center={false}
          background={<ProductHeroVisual />}
        >
          <div className="landing-hero-copy relative z-10 w-full max-w-2xl rounded-2xl border border-border/50 bg-card/95 p-5 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.2)] backdrop-blur-sm sm:p-8 md:p-10">
            <p className="mb-2 text-xs font-semibold tracking-wide text-primary sm:mb-3 sm:text-sm">
              Cambridge A-Level revision
            </p>
            <h1 className="landing-hero-title mb-3 sm:mb-4">
              Syllabus, papers, and today&apos;s plan — in one workspace.
            </h1>
            <p className="mb-5 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground sm:mb-8 sm:text-base md:text-lg">
              Built around how A-Levels are actually structured. See what
              you&apos;ve covered, what you&apos;ve sat, and what to do next.
            </p>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href={isAuthenticated ? "/dashboard" : "/signup"}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="h-12 w-full cursor-pointer px-7 text-base active:scale-[0.98] sm:w-auto"
                >
                  {isAuthenticated ? "Open workspace" : "Invitation only"}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="text-center text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline sm:text-left"
                >
                  Already revising here? Log in
                </Link>
              )}
            </div>
          </div>
        </LandingSection>

        <LandingSection
          id="intro"
          className="landing-section-intro"
          ambient="intro"
        >
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12">
            <div>
              <p className="mb-3 text-sm font-semibold tracking-wide text-primary">
                Why <BrandName /> feels different
              </p>
              <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-[2.65rem]">
                Built for the A-Level calendar, not generic to-do lists.
              </h2>
              <p className="mt-4 max-w-lg text-pretty text-muted-foreground md:text-lg">
                Syllabus units, past-paper logs, and a daily plan that matches
                how Cambridge courses actually run.
              </p>
            </div>

            <div className="landing-proof-bento">
              <div className="landing-proof-primary dash-stat-card card-tint-teal p-6 md:p-8">
                <p className="card-label">Real syllabus coverage</p>
                <p className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Topic-level progress
                </p>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Mark units as covered and Lockdin turns that into a percentage
                  you can trust — not a vague checklist.
                </p>
              </div>
              <div className="landing-proof-stat surface-card p-5">
                <p className="card-label">Past papers</p>
                <p className="mt-2 text-2xl font-bold tabular">Score trail</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Every attempt logged in one timeline.
                </p>
              </div>
              <div className="landing-proof-stat surface-card p-5">
                <p className="card-label">Daily focus</p>
                <p className="mt-2 text-2xl font-bold tabular">One plan</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Open the app and know what to revise next.
                </p>
              </div>
            </div>
          </div>
        </LandingSection>

        {features.map((feature, index) => (
          <LandingSection
            key={feature.title}
            id={`feature-${index + 1}`}
            className="landing-section-feature"
            ambient={
              `feature-${index + 1}` as "feature-1" | "feature-2" | "feature-3"
            }
          >
            <div
              className={cn(
                "landing-feature-row surface-card grid w-full items-center gap-6 rounded-2xl p-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-10 md:p-8 lg:p-10",
                ["card-tint-cream", "card-tint-teal", "card-tint-amber"][index],
                index % 2 === 1 && "md:[&>*:first-child]:order-2",
              )}
            >
              <div>
                <div
                  className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.variant}`}
                >
                  <span className="text-sm font-bold tabular text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mb-3 text-2xl font-semibold tracking-tight md:text-3xl">
                  {feature.title}
                </h3>
                <p className="max-w-prose text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                  {feature.body}
                </p>
              </div>
              <div
                className={cn(
                  "landing-feature-visual flex min-h-[14rem] items-center justify-center rounded-xl px-4 py-6 md:min-h-[18rem]",
                  feature.variant,
                )}
                aria-hidden
              >
                <EmptyIllustration
                  scene={feature.scene}
                  className="max-w-[14rem]"
                />
              </div>
            </div>
          </LandingSection>
        ))}

        <LandingSection
          id="cta"
          className="landing-section-cta marketing-cta-section"
          innerClassName="landing-section-cta-inner"
        >
          <div className="max-w-xl">
            <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Start with your subjects. Plan today&apos;s revision from there.
            </h2>
            <p className="hero-band-muted mb-8 text-pretty text-base md:text-lg">
              Controlled beta — registration is by invitation only. Invited
              participants set up from their email link.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="h-12 cursor-pointer px-7 text-base cta-on-brand active:scale-[0.98]"
              >
                Invitation only
              </Button>
            </Link>
          </div>

          <footer className="border-t border-white/15 pt-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
                <span className="brand-icon h-7 w-7 rounded-lg">
                  <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <BrandName />
              </span>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-white"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-white"
                >
                  Terms
                </Link>
                <span>
                  © {new Date().getFullYear()} <BrandName />
                </span>
              </div>
            </div>
          </footer>
        </LandingSection>
      </main>
    </div>
  );
}
