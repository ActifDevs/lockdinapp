import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';

// Pages
import LandingPage from '@/pages/index';
import Login from '@/pages/login';
import Signup from '@/pages/signup';
import ForgotPassword from '@/pages/forgot-password';
import Onboarding from '@/pages/onboarding';
import Dashboard from '@/pages/dashboard';
import Subjects from '@/pages/subjects';
import SubjectDetail from '@/pages/subject-detail';
import StudyPlan from '@/pages/study-plan';
import PastPapers from '@/pages/past-papers';
import Progress from '@/pages/progress';
import Calendar from '@/pages/calendar';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';

import { AppShell } from '@/components/app-shell';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/onboarding" component={Onboarding} />
      
      {/* Authenticated Routes wrapped in AppShell */}
      <Route path="/dashboard"><AppShell><Dashboard /></AppShell></Route>
      <Route path="/subjects"><AppShell><Subjects /></AppShell></Route>
      <Route path="/subjects/:id"><AppShell><SubjectDetail /></AppShell></Route>
      <Route path="/study-plan"><AppShell><StudyPlan /></AppShell></Route>
      <Route path="/past-papers"><AppShell><PastPapers /></AppShell></Route>
      <Route path="/progress"><AppShell><Progress /></AppShell></Route>
      <Route path="/calendar"><AppShell><Calendar /></AppShell></Route>
      <Route path="/settings"><AppShell><Settings /></AppShell></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
