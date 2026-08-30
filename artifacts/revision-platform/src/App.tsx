import { Suspense, lazy, type ReactNode } from "react";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { ThemeProvider } from "@/components/theme-provider";
import { DocumentTitle } from "@/components/document-title";
import { PageLoader } from "@/components/page-loader";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-provider";
import { RequireAuth, RedirectIfAuthenticated } from "@/components/require-auth";
import { ReminderRunner } from "@/components/reminder-runner";

const LandingPage = lazy(() => import("@/pages/index"));
const Login = lazy(() => import("@/pages/login"));
const Signup = lazy(() => import("@/pages/signup"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const UpdatePassword = lazy(() => import("@/pages/update-password"));
const AuthCallback = lazy(() => import("@/pages/auth-callback"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Subjects = lazy(() => import("@/pages/subjects"));
const SubjectDetail = lazy(() => import("@/pages/subject-detail"));
const StudyPlan = lazy(() => import("@/pages/study-plan"));
const PastPapers = lazy(() => import("@/pages/past-papers"));
const Progress = lazy(() => import("@/pages/progress"));
const Calendar = lazy(() => import("@/pages/calendar"));
const Settings = lazy(() => import("@/pages/settings"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedPage({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <RequireAuth>
      <AppShell>
        {label ? (
          <RouteErrorBoundary label={label}>
            <Suspense fallback={<PageLoader />}>{children}</Suspense>
          </RouteErrorBoundary>
        ) : (
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        )}
      </AppShell>
    </RequireAuth>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Suspense fallback={<PageLoader />}>
          <LandingPage />
        </Suspense>
      </Route>
      <Route path="/login">
        <RedirectIfAuthenticated>
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/signup">
        <RedirectIfAuthenticated>
          <Suspense fallback={<PageLoader />}>
            <Signup />
          </Suspense>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/forgot-password">
        <Suspense fallback={<PageLoader />}>
          <ForgotPassword />
        </Suspense>
      </Route>
      <Route path="/update-password">
        <Suspense fallback={<PageLoader />}>
          <UpdatePassword />
        </Suspense>
      </Route>
      <Route path="/auth/callback">
        <Suspense fallback={<PageLoader />}>
          <AuthCallback />
        </Suspense>
      </Route>
      <Route path="/onboarding">
        <RequireAuth onboardingOnly>
          <Suspense fallback={<PageLoader />}>
            <Onboarding />
          </Suspense>
        </RequireAuth>
      </Route>

      <Route path="/dashboard">
        <AuthenticatedPage label="Dashboard">
          <Dashboard />
        </AuthenticatedPage>
      </Route>
      <Route path="/subjects">
        <AuthenticatedPage>
          <Subjects />
        </AuthenticatedPage>
      </Route>
      <Route path="/subjects/:id">
        <AuthenticatedPage>
          <SubjectDetail />
        </AuthenticatedPage>
      </Route>
      <Route path="/study-plan">
        <AuthenticatedPage>
          <StudyPlan />
        </AuthenticatedPage>
      </Route>
      <Route path="/past-papers">
        <AuthenticatedPage>
          <PastPapers />
        </AuthenticatedPage>
      </Route>
      <Route path="/progress">
        <AuthenticatedPage>
          <Progress />
        </AuthenticatedPage>
      </Route>
      <Route path="/calendar">
        <AuthenticatedPage>
          <Calendar />
        </AuthenticatedPage>
      </Route>
      <Route path="/settings">
        <AuthenticatedPage>
          <Settings />
        </AuthenticatedPage>
      </Route>

      <Route path="/privacy">
        <Suspense fallback={<PageLoader />}>
          <Privacy />
        </Suspense>
      </Route>
      <Route path="/terms">
        <Suspense fallback={<PageLoader />}>
          <Terms />
        </Suspense>
      </Route>

      <Route>
        <Suspense fallback={<PageLoader />}>
          <NotFound />
        </Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <TooltipProvider>
              <DocumentTitle />
              <ReminderRunner />
              <Router />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </WouterRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
