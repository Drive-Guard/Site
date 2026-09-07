import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Risk = "low" | "medium" | "high" | "critical";

interface RouteRow {
  origin: string;
  destination: string;
  fatigue: number;
  events: number;
  risk: Risk;
  trend: number; // % vs período anterior
}

const routes: RouteRow[] = [
  { origin: "São Paulo", destination: "Cuiabá", fatigue: 87, events: 42, risk: "critical", trend: 12 },
  { origin: "Belo Horizonte", destination: "Salvador", fatigue: 81, events: 35, risk: "critical", trend: 6 },
  { origin: "Curitiba", destination: "Porto Alegre", fatigue: 74, events: 28, risk: "high", trend: -3 },
  { origin: "Goiânia", destination: "Brasília", fatigue: 68, events: 22, risk: "high", trend: 4 },
  { origin: "Campinas", destination: "Ribeirão Preto", fatigue: 58, events: 17, risk: "medium", trend: -8 },
  { origin: "Recife", destination: "Fortaleza", fatigue: 52, events: 14, risk: "medium", trend: 2 },
  { origin: "Vitória", destination: "Rio de Janeiro", fatigue: 41, events: 9, risk: "low", trend: -5 },
];

const riskStyles: Record<Risk, { dot: string; chip: string; label: string }> = {
  critical: {
    dot: "bg-risk-critical",
    chip: "text-risk-critical bg-risk-critical/10 border-risk-critical/30",
    label: "crítico",
  },
  high: {
    dot: "bg-risk-high",
    chip: "text-risk-high bg-risk-high/10 border-risk-high/30",
    label: "alto",
  },
  medium: {
    dot: "bg-risk-medium",
    chip: "text-risk-medium bg-risk-medium/10 border-risk-medium/30",
    label: "médio",
  },
  low: {
    dot: "bg-risk-low",
    chip: "text-risk-low bg-risk-low/10 border-risk-low/30",
    label: "baixo",
  },
};

export function RiskRoutesList() {
  const sorted = [...routes].sort((a, b) => b.fatigue - a.fatigue);

  return (
    <ul className="flex flex-col gap-2 h-full overflow-auto pr-1">
      {sorted.map((r) => {
        const s = riskStyles[r.risk];
        const up = r.trend >= 0;
        return (
          <li
            key={`${r.origin}-${r.destination}`}
            className="rounded-xl border border-border p-3 hover:bg-secondary/40 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("h-2 w-2 rounded-full shrink-0", s.dot)} />
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  <span className="truncate">{r.origin}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{r.destination}</span>
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                  s.chip,
                )}
              >
                {s.label}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>
                  Fadiga <span className="font-semibold text-foreground">{r.fatigue}</span>
                </span>
                <span>
                  Eventos <span className="font-semibold text-foreground">{r.events}</span>
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium",
                  up ? "text-risk-high" : "text-risk-low",
                )}
              >
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {up ? "+" : ""}
                {r.trend}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}