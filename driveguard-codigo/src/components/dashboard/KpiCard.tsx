import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  trend?: number;
  variant?: "default" | "risk" | "safe" | "warning";
}

export function KpiCard({ label, value, hint, icon: Icon, trend, variant = "default" }: KpiCardProps) {
  const variants = {
    default: "from-primary/20 to-primary/5 text-primary",
    risk: "from-risk-high/30 to-risk-high/5 text-risk-high",
    safe: "from-risk-low/30 to-risk-low/5 text-risk-low",
    warning: "from-risk-medium/30 to-risk-medium/5 text-risk-medium",
  };

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:border-primary/40 transition-all">
      <div className={cn("absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl", variants[variant])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {trend !== undefined && (
            <p className={cn("mt-2 text-xs font-medium", trend >= 0 ? "text-risk-high" : "text-risk-low")}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs mês anterior
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl bg-gradient-to-br", variants[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}