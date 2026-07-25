import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, TrendingUp, Calendar as CalendarIcon, Target, CheckSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight">Scholr</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4 hidden sm:inline-block">
                  Log in
                </Link>
                <Link href="/signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
          <div className="container mx-auto max-w-6xl text-center">
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6 max-w-4xl mx-auto">
              The calm, focused way to master your A-Levels.
            </h1>
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10">
              No endless spreadsheets. No confusing dashboards. Just a clear view of your syllabus, your past papers, and exactly what you need to study today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 items-center mb-16">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12">
                  Start revising for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">No credit card required.</p>
            </div>
            
            {/* Hero Mockup */}
            <div className="relative mx-auto w-full max-w-5xl rounded-xl border bg-background shadow-2xl overflow-hidden aspect-video max-h-[600px]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background z-0" />
              <img 
                src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=2000" 
                alt="Student studying with a clear desk" 
                className="w-full h-full object-cover opacity-60 dark:opacity-40 mix-blend-overlay"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-card border rounded-lg shadow-lg p-6 w-[80%] max-w-3xl transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div>
                      <h3 className="font-serif text-xl font-semibold">Good morning, Alex</h3>
                      <p className="text-sm text-muted-foreground">You have 3 tasks for today.</p>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      12 Day Streak
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-md border bg-background">
                        <div className="w-4 h-4 rounded-full border-2 border-primary" />
                        <div>
                          <p className="text-sm font-medium">Further Integration</p>
                          <p className="text-xs text-muted-foreground">Maths • 45m</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-md border bg-background">
                        <div className="w-4 h-4 rounded-full border-2 border-primary" />
                        <div>
                          <p className="text-sm font-medium">Quantum Physics</p>
                          <p className="text-xs text-muted-foreground">Physics • 60m</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 border">
                      <h4 className="text-sm font-medium mb-3">Maths Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Syllabus covered</span>
                          <span>68%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[68%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-muted/50 border-y">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl font-bold tracking-tight mb-4">Everything you need, nothing you don't.</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Scholr is designed specifically for the unique structure of Cambridge A-Levels. 
                Track your syllabus, log past papers, and stay focused.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              <div className="bg-card border rounded-xl p-8 shadow-sm">
                <Target className="h-10 w-10 text-primary mb-5" />
                <h3 className="text-xl font-bold mb-3">Track the Syllabus</h3>
                <p className="text-muted-foreground">
                  The entire Cambridge syllabus for your subjects, broken down topic by topic. 
                  Mark what you've studied and see your true completion percentage.
                </p>
              </div>
              <div className="bg-card border rounded-xl p-8 shadow-sm">
                <TrendingUp className="h-10 w-10 text-primary mb-5" />
                <h3 className="text-xl font-bold mb-3">Log Past Papers</h3>
                <p className="text-muted-foreground">
                  Stop losing track of which papers you've done. Log your scores, track your 
                  improvement over time, and identify your weakest topics instantly.
                </p>
              </div>
              <div className="bg-card border rounded-xl p-8 shadow-sm">
                <CheckSquare className="h-10 w-10 text-primary mb-5" />
                <h3 className="text-xl font-bold mb-3">Daily Study Plan</h3>
                <p className="text-muted-foreground">
                  Plan your revision sessions with specific topics and estimated times. 
                  Wake up every day knowing exactly what you need to cover.
                </p>
              </div>
              <div className="bg-card border rounded-xl p-8 shadow-sm">
                <CalendarIcon className="h-10 w-10 text-primary mb-5" />
                <h3 className="text-xl font-bold mb-3">Exam Readiness</h3>
                <p className="text-muted-foreground">
                  Enter your exam dates and let Scholr help you pace your revision. 
                  Visualise your progress against the calendar so you're never caught off guard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32">
          <div className="container mx-auto max-w-4xl text-center px-4">
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Ready to take control of your revision?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of students using Scholr to study smarter, reduce stress, and achieve their target grades.
            </p>
            <Link href="/signup">
              <Button size="lg" className="h-14 px-10 text-lg">
                Create your free account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold">Scholr</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Scholr Revision Platform. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
