import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const features = [
  {
    title: "Syllabus, topic by topic",
    body: "Cambridge A-Level syllabuses broken into units you can mark as covered — so completion is a real percentage, not a guess.",
  },
  {
    title: "Past papers with a trail",
    body: "Log scores and papers in one place. Spot weak topics from the record instead of hunting through folders.",
  },
  {
    title: "Today’s plan only",
    body: "Pick the topics and time blocks for the day. Open Scholr and know what to revise next — nothing else.",
  },
];

function ProductHeroVisual() {
  return (
    <div className="absolute inset-0 bg-[hsl(220_18%_12%)]" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(220_15%_22%/0.9),transparent_55%),radial-gradient(ellipse_at_80%_70%,hsl(40_12%_18%/0.5),transparent_50%)]" />
      <div className="absolute inset-x-0 bottom-0 top-[18%] mx-auto max-w-5xl px-4 sm:px-8">
        <div className="flex h-full overflow-hidden rounded-t-xl border border-[hsl(40_20%_96%/0.12)] bg-[hsl(40_20%_98%/0.97)] shadow-2xl">
          <div className="hidden w-44 shrink-0 flex-col border-r border-[hsl(240_5%_90%)] bg-[hsl(40_20%_96%)] sm:flex">
            <div className="flex h-12 items-center px-4">
              <span className="font-serif text-sm font-bold tracking-tight text-[hsl(240_10%_15%)]">Scholr</span>
            </div>
            <div className="space-y-1 px-2">
              {["Dashboard", "Study plan", "Subjects", "Past papers"].map((label, i) => (
                <div
                  key={label}
                  className={`rounded-md px-2.5 py-2 text-xs font-medium ${
                    i === 0
                      ? "bg-[hsl(40_10%_92%)] text-[hsl(240_10%_15%)]"
                      : "text-[hsl(240_5%_45%)]"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 px-2">
              <div className="px-2.5 text-[9px] font-medium uppercase tracking-wider text-[hsl(240_5%_55%)]">
                Insights
              </div>
              {["Progress", "Calendar"].map((label) => (
                <div key={label} className="rounded-md px-2.5 py-2 text-xs font-medium text-[hsl(240_5%_45%)]">
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-10 items-center border-b border-[hsl(240_5%_90%)] bg-white px-4 sm:hidden">
              <span className="font-serif text-sm font-bold tracking-tight text-[hsl(240_10%_15%)]">Scholr</span>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:p-6">
              <div className="space-y-3 sm:col-span-2">
                <div className="space-y-1">
                  <div className="h-3 w-40 rounded bg-[hsl(240_5%_90%)]" />
                  <div className="h-6 w-56 rounded bg-[hsl(240_10%_15%/0.12)]" />
                </div>
                <div className="rounded-lg border border-[hsl(240_5%_90%)] bg-white p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="h-3 w-24 rounded bg-[hsl(240_5%_90%)]" />
                    <div className="h-2 w-16 rounded bg-[hsl(240_5%_90%)]" />
                  </div>
                  <div className="mb-3 h-1 rounded-full bg-[hsl(240_5%_92%)]">
                    <div className="h-full w-2/5 rounded-full bg-[hsl(220_15%_30%)]" />
                  </div>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 border-t border-[hsl(240_5%_92%)] py-2.5">
                      <div className="h-4 w-4 rounded-full border-2 border-[hsl(220_15%_30%/0.35)]" />
                      <div className="flex-1 space-y-1.5">
                        <div
                          className={`h-2.5 rounded bg-[hsl(240_10%_15%/0.14)] ${
                            i === 0 ? "w-3/4" : i === 1 ? "w-2/3" : "w-1/2"
                          }`}
                        />
                        <div className="h-2 w-20 rounded bg-[hsl(220_15%_40%/0.15)]" />
                      </div>
                      <div className="h-2 w-8 rounded bg-[hsl(240_5%_90%)]" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden space-y-3 sm:block">
                <div className="rounded-lg border border-[hsl(240_5%_90%)] bg-white p-3">
                  <div className="mb-3 h-3 w-28 rounded bg-[hsl(240_5%_90%)]" />
                  {[72, 54, 41].map((pct, i) => (
                    <div key={i} className="mb-3 space-y-1.5 last:mb-0">
                      <div className="flex justify-between">
                        <div className="h-2 w-16 rounded bg-[hsl(240_5%_88%)]" />
                        <div className="h-2 w-6 rounded bg-[hsl(240_5%_88%)]" />
                      </div>
                      <div className="h-1 rounded-full bg-[hsl(240_5%_92%)]">
                        <div className="h-full rounded-full bg-[hsl(220_15%_40%)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-[hsl(220_15%_30%/0.12)] bg-[hsl(220_15%_30%/0.05)] p-3">
                  <div className="mb-2 h-3 w-24 rounded bg-[hsl(220_15%_30%/0.2)]" />
                  <div className="h-8 w-20 rounded bg-[hsl(220_15%_30%/0.18)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220_18%_10%/0.92)] via-[hsl(220_18%_10%/0.45)] to-[hsl(220_18%_10%/0.55)]" />
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

      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="font-serif text-xl font-bold tracking-tight sm:text-2xl">
            Scholr
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Open workspace
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
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
        <section className="grain relative min-h-[calc(100dvh-3.5rem)] overflow-hidden sm:min-h-[calc(100dvh-4rem)]">
          <ProductHeroVisual />

          <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 md:pb-24">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
              }
              className="max-w-2xl"
            >
              <p className="mb-4 font-serif text-5xl font-bold tracking-tight text-primary-foreground sm:text-6xl md:text-7xl">
                Scholr
              </p>
              <h1 className="mb-5 text-balance font-serif text-3xl font-semibold leading-[1.15] tracking-tight text-primary-foreground sm:text-4xl md:text-[2.75rem]">
                Revision for Cambridge A-Levels — syllabus, papers, and today’s plan.
              </h1>
              <p className="mb-8 max-w-lg text-pretty text-base leading-relaxed text-primary-foreground/80 sm:text-lg">
                Built around how A-Levels are actually structured. See what you’ve covered, what you’ve sat, and what to do next.
              </p>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
                  <Button
                    size="lg"
                    className="h-12 cursor-pointer bg-background px-7 text-base text-foreground hover:bg-background/90 active:scale-[0.98]"
                  >
                    {isAuthenticated ? "Open workspace" : "Create your workspace"}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <Link
                    href="/login"
                    className="text-sm font-medium text-primary-foreground/75 underline-offset-4 transition-colors hover:text-primary-foreground hover:underline"
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
              <h2 className="mb-3 text-balance font-serif text-3xl font-bold tracking-tight md:text-4xl">
                Built for the A-Level calendar, not generic to-do lists.
              </h2>
              <p className="text-pretty text-muted-foreground md:text-lg">
                Syllabus units, past-paper logs, and a daily plan that matches how Cambridge courses actually run.
              </p>
            </div>

            <div className="space-y-0">
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
                  className={`grid gap-4 border-t border-border py-10 md:grid-cols-12 md:gap-8 md:py-12 ${
                    index % 2 === 1 ? "md:[&>*:first-child]:col-start-5" : ""
                  }`}
                >
                  <div className={`md:col-span-4 ${index % 2 === 1 ? "md:col-start-5" : ""}`}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="font-serif text-2xl font-semibold tracking-tight">{feature.title}</h3>
                  </div>
                  <p
                    className={`max-w-md text-pretty leading-relaxed text-muted-foreground md:col-span-6 ${
                      index % 2 === 1 ? "md:col-start-9" : "md:col-start-6"
                    }`}
                  >
                    {feature.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="grain relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-28">
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-xl">
              <h2 className="mb-4 text-balance font-serif text-3xl font-bold tracking-tight md:text-4xl">
                Start with your subjects. Plan today’s revision from there.
              </h2>
              <p className="mb-8 text-pretty text-primary-foreground/75 md:text-lg">
                Free to set up. Add your papers and syllabus when you’re ready — no trial countdown.
              </p>
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 cursor-pointer bg-background px-7 text-base text-foreground hover:bg-background/90 active:scale-[0.98]"
                >
                  Create your workspace
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/40 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
          <span className="font-serif text-xl font-bold tracking-tight">Scholr</span>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Scholr. Cambridge A-Level revision workspace.
          </p>
        </div>
      </footer>
    </div>
  );
}
