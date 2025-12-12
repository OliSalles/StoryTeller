import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

import JiraConfig from "./pages/JiraConfig";
import AzureDevOpsConfig from "./pages/AzureDevOpsConfig";
import GenerateFeature from "./pages/GenerateFeature";
import FeatureDetail from "./pages/FeatureDetail";
import History from "./pages/History";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      
      <Route path={"/dashboard"}>
        <DashboardLayout>
          <GenerateFeature />
        </DashboardLayout>
      </Route>

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
