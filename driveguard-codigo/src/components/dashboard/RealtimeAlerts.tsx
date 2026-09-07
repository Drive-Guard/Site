import { useEffect, useState } from "react";
import { AlertTriangle, Eye, Clock } from "lucide-react";
import { Driver, riskFromScore } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface Props {
  drivers: Driver[];
}

const riskStyles: Record<string, string> = {
  critical: "bg-risk-critical/15 border-risk-critical/40 text-risk-critical",
  high: "bg-risk-high/15 border-risk-high/40 text-risk-high",
  medium: "bg-risk-medium/15 border-risk-medium/40 text-risk-medium",
  low: "bg-risk-low/15 border-risk-low/40 text-risk-low",
};

export function RealtimeAlerts({ drivers }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const alerts = drivers
    .filter((d) => d.fatigueScore >= 60)
    .sort((a, b) => b.fatigueScore - a.fatigueScore)
    .slice(0, 6)
    .map((d) => ({
      ...d,
      // simula leve flutuação
      fatigueScore: Math.min(100, Math.max(0, d.fatigueScore + ((tick % 2 === 0 ? 1 : -1) * (d.id.charCodeAt(5) % 4)))),
    }))
    .map((d) => ({ ...d, risk: riskFromScore(d.fatigueScore) }));

  return (
    <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={cn(
            "rounded-xl border p-3 flex items-center gap-3 transition-all",
            riskStyles[a.risk],
          )}
        >
          <div className="relative">
            <div className={cn("h-2.5 w-2.5 rounded-full pulse-dot", a.risk === "critical" ? "bg-risk-critical" : a.risk === "high" ? "bg-risk-high" : "bg-risk-medium")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm text-foreground truncate">{a.name}</p>
              <span className="text-xs font-mono text-muted-foreground">{a.id}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {a.blinkRate}/min</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.shiftHours}h turno</span>
              <span>{a.vehicle} • {a.region}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold leading-none">{a.fatigueScore}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-80">fadiga</div>
          </div>
          <AlertTriangle className="h-4 w-4 opacity-70" />
        </div>
      ))}
    </div>
  );
}