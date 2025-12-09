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
        "relative rounded-xl border border-white/10",
        "bg-gradient-to-br from-white/[0.08] to-white/[0.02]",
        "backdrop-blur-xl shadow-2xl",
        "transition-all duration-300",
        hover && "hover:border-white/20 hover:shadow-primary/20",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
