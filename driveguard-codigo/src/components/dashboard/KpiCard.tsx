import { ArrowUpRight, type LucideIcon } from "lucide-react";
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
  /** Atalho: abre a tela de detalhe já filtrada. */
  aoClicar?: () => void;
  /** Para onde o atalho leva (aparece ao passar o mouse e para leitores de tela). */
  destino?: string;
}

const ICONE: Record<NonNullable<KpiCardProps["variant"]>, string> = {
  default: "bg-accent text-accent-foreground",
  risk: "bg-risk-high/12 text-risk-high",
  safe: "bg-risk-low/12 text-risk-low",
  warning: "bg-risk-medium/15 text-risk-medium",
};

export function KpiCard({ label, value, hint, icon: Icon, trend, trendLabel = "vs período anterior", melhorQuandoSobe, variant = "default", carregando, aoClicar, destino }: KpiCardProps) {
  // Variação abaixo de 1% é estável: nem seta nem cor de alerta.
  const estavel = trend !== undefined && trend !== null && Math.abs(trend) < 1;
  const ruim = !estavel && trend !== undefined && trend !== null && (melhorQuandoSobe ? trend < 0 : trend > 0);

  const conteudo = (
    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        {carregando ? (
          <div className="mt-3 h-8 w-24 rounded bg-secondary animate-pulse" />
        ) : (
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground truncate tabular-nums">{value}</p>
        )}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        {trend !== undefined && trend !== null && (
          <p className={cn("mt-2 text-xs font-medium", estavel ? "text-muted-foreground" : ruim ? "text-risk-high" : "text-risk-low")}>
            {estavel ? `= estável ${trendLabel}` : `${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}% ${trendLabel}`}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className={cn("p-2 rounded-lg", ICONE[variant])}>
          <Icon className="h-4 w-4" />
        </div>
        {aoClicar && <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />}
      </div>
    </div>
  );

  const classe = "glass-card rounded-xl p-5 relative overflow-hidden group text-left w-full";
  if (!aoClicar) return <div className={classe}>{conteudo}</div>;
  return (
    <button type="button" onClick={aoClicar} title={destino} aria-label={destino ? `${label}: ${value}. ${destino}` : undefined} className={cn(classe, "clicavel")}>
      {conteudo}
    </button>
  );
}
