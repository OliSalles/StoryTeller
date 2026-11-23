import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { FeaturesTabs, LLMTabs } from "@/components/RouteTabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PublicThemeToggle } from "./components/ThemeToggle";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import JiraConfig from "./pages/JiraConfig";
import LLMConfig from "./pages/LLMConfig";
import GenerateFeature from "./pages/GenerateFeature";
import FeatureDetail from "./pages/FeatureDetail";
import History from "./pages/History";
import Executions from "./pages/Executions";
import TokenUsage from "./pages/TokenUsage";
import Pricing from "./pages/Pricing";
import AccountSubscription from "./pages/AccountSubscription";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import { CompanySettings } from "./pages/CompanySettings";
import { CompanyDetail } from "./pages/CompanyDetail";
import { KnowledgeBase } from "./pages/KnowledgeBase";
import { KnowledgeChat } from "./pages/KnowledgeChat";

/** Páginas do admin do sistema (users.role = admin), que é diferente de admin de empresa */
function SystemAdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role !== "admin") return <Redirect to="/knowledge/chat" replace />;
  return <>{children}</>;
}

/** Leva ao detalhe da empresa em uso (onde ficam as configurações da empresa) */
function ActiveCompanyRedirect() {
  const { data: company, isLoading } = trpc.companies.current.useQuery();
  if (isLoading) return null;
  return <Redirect to={company ? `/company/${company.id}` : "/company/settings"} replace />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/"} component={Home} />

      <Route path={"/generate"}>
        <DashboardLayout>
          <FeaturesTabs>
            <GenerateFeature />
          </FeaturesTabs>
        </DashboardLayout>
      </Route>

      <Route path={"/history"}>
        <DashboardLayout>
          <FeaturesTabs>
            <History />
          </FeaturesTabs>
        </DashboardLayout>
      </Route>

      <Route path={"/features/:id"}>
        <DashboardLayout>
          <FeatureDetail />
        </DashboardLayout>
      </Route>

      <Route path={"/config/llm"}>
        <DashboardLayout>
          <SystemAdminOnly>
            <LLMTabs>
              <LLMConfig />
            </LLMTabs>
          </SystemAdminOnly>
        </DashboardLayout>
      </Route>

      <Route path={"/config/jira"}>
        <DashboardLayout>
          <JiraConfig />
        </DashboardLayout>
      </Route>

      <Route path={"/config/azure-devops"}>
        <DashboardLayout>
          <ActiveCompanyRedirect />
        </DashboardLayout>
      </Route>

      <Route path={"/executions"}>
        <DashboardLayout>
          <SystemAdminOnly>
            <LLMTabs>
              <Executions />
            </LLMTabs>
          </SystemAdminOnly>
        </DashboardLayout>
      </Route>

      <Route path={"/tokens"}>
        <DashboardLayout>
          <TokenUsage />
        </DashboardLayout>
      </Route>

      <Route path={"/pricing"}>
        <DashboardLayout>
          <Pricing />
        </DashboardLayout>
      </Route>

      <Route path={"/subscription/success"}>
        <DashboardLayout>
          <SubscriptionSuccess />
        </DashboardLayout>
      </Route>

      <Route path={"/account/subscription"}>
        <DashboardLayout>
          <AccountSubscription />
        </DashboardLayout>
      </Route>

      <Route path={"/company/settings"}>
        <DashboardLayout>
          <CompanySettings />
        </DashboardLayout>
      </Route>

      <Route path={"/company/:id"}>
        <DashboardLayout>
          <CompanyDetail />
        </DashboardLayout>
      </Route>

      <Route path={"/knowledge"}>
        <DashboardLayout>
          <KnowledgeBase />
        </DashboardLayout>
      </Route>

      <Route path={"/knowledge/chat"}>
        <DashboardLayout>
          <KnowledgeChat />
        </DashboardLayout>
      </Route>

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <PublicThemeToggle />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
