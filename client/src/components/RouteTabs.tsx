import { Brain, FileText, History, Sparkles, type LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

type RouteTab = { path: string; label: string; icon: LucideIcon };

/** Subabas em que cada aba é uma rota própria */
function RouteTabs({ tabs, children }: { tabs: RouteTab[]; children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <Tabs value={location} onValueChange={setLocation}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.path} value={tab.path}>
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}

const FEATURE_TABS: RouteTab[] = [
  { path: "/generate", label: "Gerar Feature", icon: Sparkles },
  { path: "/history", label: "Histórico", icon: History },
];

const LLM_TABS: RouteTab[] = [
  { path: "/config/llm", label: "LLM", icon: Brain },
  { path: "/executions", label: "Execuções", icon: FileText },
];

export function FeaturesTabs({ children }: { children: React.ReactNode }) {
  return <RouteTabs tabs={FEATURE_TABS}>{children}</RouteTabs>;
}

export function LLMTabs({ children }: { children: React.ReactNode }) {
  return <RouteTabs tabs={LLM_TABS}>{children}</RouteTabs>;
}
