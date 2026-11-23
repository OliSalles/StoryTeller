import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
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
import AzureDevOpsConfigNew from "./pages/AzureDevOpsConfigNew";
import LLMConfig from "./pages/LLMConfig";
import GenerateFeature from "./pages/GenerateFeature";
import FeatureDetail from "./pages/FeatureDetail";
import History from "./pages/History";
import Executions from "./pages/Executions";
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
          <GenerateFeature />
        </DashboardLayout>
      </Route>

      <Route path={"/history"}>
        <DashboardLayout>
          <History />
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
            <LLMConfig />
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
          <AzureDevOpsConfigNew />
        </DashboardLayout>
      </Route>

      <Route path={"/executions"}>
        <DashboardLayout>
          <SystemAdminOnly>
            <Executions />
          </SystemAdminOnly>
        </DashboardLayout>
      </Route>

      <Route path={"/tokens"}>
        <Redirect to="/account/subscription?tab=uso" replace />
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
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
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
