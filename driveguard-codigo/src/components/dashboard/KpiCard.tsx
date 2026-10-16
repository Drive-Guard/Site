import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  /** Variação percentual; subir é ruim (vermelho), a não ser com melhorQuandoSobe. */
  trend?: number | null;
  trendLabel?: string;
  melhorQuandoSobe?: boolean;
  variant?: "default" | "risk" | "safe" | "warning";
  carregando?: boolean;
}

export function KpiCard({ label, value, hint, icon: Icon, trend, trendLabel = "vs período anterior", melhorQuandoSobe, variant = "default", carregando }: KpiCardProps) {
  const variants = {
    default: "from-primary/20 to-primary/5 text-primary",
    risk: "from-risk-high/30 to-risk-high/5 text-risk-high",
    safe: "from-risk-low/30 to-risk-low/5 text-risk-low",
    warning: "from-risk-medium/30 to-risk-medium/5 text-risk-medium",
  };
  // Variação abaixo de 1% é estável: nem seta nem cor de alerta.
  const estavel = trend !== undefined && trend !== null && Math.abs(trend) < 1;
  const ruim = !estavel && trend !== undefined && trend !== null && (melhorQuandoSobe ? trend < 0 : trend > 0);

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:border-primary/40 transition-all">
      <div className={cn("absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl", variants[variant])} />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          {carregando ? (
            <div className="mt-3 h-8 w-24 rounded bg-secondary/60 animate-pulse" />
          ) : (
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground truncate">{value}</p>
          )}
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {trend !== undefined && trend !== null && (
            <p className={cn("mt-2 text-xs font-medium", estavel ? "text-muted-foreground" : ruim ? "text-risk-high" : "text-risk-low")}>
              {estavel ? `= estável ${trendLabel}` : `${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}% ${trendLabel}`}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shrink-0", variants[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
