import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = false, onClick }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card shadow-sm",
        "dark:border-white/10 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.08] dark:to-white/[0.02]",
        "dark:backdrop-blur-xl dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]",
        "transition-all duration-300",
        hover && "hover:border-primary/30 hover:shadow-md dark:hover:border-white/20 dark:hover:shadow-primary/20",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
