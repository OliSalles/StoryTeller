import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import JiraConfig from "./pages/JiraConfig";
import AzureDevOpsConfig from "./pages/AzureDevOpsConfig";
import LLMConfig from "./pages/LLMConfig";
import GenerateFeature from "./pages/GenerateFeature";
import FeatureDetail from "./pages/FeatureDetail";
import History from "./pages/History";
import Executions from "./pages/Executions";
import TokenUsage from "./pages/TokenUsage";
import Pricing from "./pages/Pricing";
import AccountSubscription from "./pages/AccountSubscription";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
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
          <LLMConfig />
        </DashboardLayout>
      </Route>

      <Route path={"/config/jira"}>
        <DashboardLayout>
          <JiraConfig />
        </DashboardLayout>
      </Route>

      <Route path={"/config/azure-devops"}>
        <DashboardLayout>
          <AzureDevOpsConfig />
        </DashboardLayout>
      </Route>

      <Route path={"/executions"}>
        <DashboardLayout>
          <Executions />
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

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
