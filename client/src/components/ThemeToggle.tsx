import { Moon, Sun } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/404"];

export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  if (!toggleTheme) return null;
  return (
    <button
      onClick={toggleTheme}
      className={`h-9 w-9 flex items-center justify-center rounded border bg-card text-foreground shadow-sm hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** Botao flutuante de tema para as telas publicas (home, login, cadastro). */
export function PublicThemeToggle() {
  const [location] = useLocation();
  if (!PUBLIC_PATHS.includes(location)) return null;
  return (
    <div className="fixed top-4 right-4 z-50">
      <ThemeToggleButton />
    </div>
  );
}