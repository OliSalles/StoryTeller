import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Sparkles,
  History,
  Settings,
  FileText,
  Brain,
  GitBranch,
  Cloud,
  TrendingUp,
  CreditCard,
  Zap,
  Database,
  MessageSquare,
  Building2,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: Sparkles, label: "Gerar Feature", path: "/generate" },
  { icon: History, label: "Histórico", path: "/history" },
  { icon: Database, label: "Base de Conhecimento", path: "/knowledge" },
  { icon: MessageSquare, label: "Knowledge Chat", path: "/knowledge/chat" },
  { icon: FileText, label: "Execuções", path: "/executions" },
  { icon: TrendingUp, label: "Uso de Tokens", path: "/tokens" },
  { icon: Zap, label: "Planos", path: "/pricing" },
  { icon: CreditCard, label: "Assinatura", path: "/account/subscription" },
  { icon: Building2, label: "Empresa & Times", path: "/company/settings" },
  { icon: Brain, label: "Config. LLM", path: "/config/llm" },
  // { icon: GitBranch, label: "Config. Jira", path: "/config/jira" }, // Oculto temporariamente
  { icon: Cloud, label: "Config. Azure DevOps", path: "/config/azure-devops" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    window.location.href = "/login";
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Redirecionando...</div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const breadcrumbs = [
    { label: "StoryTeller", path: "/" },
    { label: activeMenuItem?.label || "Página", path: location },
  ];

  return (
    <>
      {/* Azure DevOps style thin top header */}
      <header className="h-12 border-b bg-card flex items-center px-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="StoryTeller" className="h-6 w-6" />
            <span className="font-semibold text-sm">StoryTeller</span>
          </div>
          
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-1">
                {idx > 0 && <span>/</span>}
                <span className={idx === breadcrumbs.length - 1 ? "text-foreground" : ""}>
                  {crumb.label}
                </span>
              </div>
            ))}
          </nav>
        </div>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent/50 rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-7 w-7 border">
                <AvatarFallback className="text-xs font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline-block">
                {user?.name || "-"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex pt-12">
        {/* Left navigation sidebar - Azure DevOps style */}
        <div className="relative" ref={sidebarRef}>
          <Sidebar
            collapsible="icon"
            className="border-r h-[calc(100vh-3rem)]"
            disableTransition={isResizing}
          >
            <SidebarHeader className="h-12 justify-center px-0">
              <button
                onClick={toggleSidebar}
                className="h-10 w-10 mx-auto flex items-center justify-center hover:bg-accent rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            </SidebarHeader>

            <SidebarContent className="gap-0 px-0">
              <SidebarMenu className="py-1">
                {menuItems
                  .filter(item => {
                    if (
                      item.path === "/config/llm" ||
                      item.path === "/executions"
                    ) {
                      return user?.role === "admin";
                    }
                    return true;
                  })
                  .map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path} className="relative">
                        {/* Azure DevOps blue left accent bar */}
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                        )}
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 mx-1 px-2 font-normal text-sm ${
                            isActive ? "bg-accent" : ""
                          }`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                          />
                          <span className={isActive ? "font-medium" : ""}>
                            {item.label}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-2">
              <div className="text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
                v1.0.0
              </div>
            </SidebarFooter>
          </Sidebar>
          <div
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
            onMouseDown={() => {
              if (isCollapsed) return;
              setIsResizing(true);
            }}
            style={{ zIndex: 50 }}
          />
        </div>

        {/* Main content area */}
        <SidebarInset className="flex-1">
          <main className="p-6">{children}</main>
        </SidebarInset>
      </div>
    </>
  );
}
