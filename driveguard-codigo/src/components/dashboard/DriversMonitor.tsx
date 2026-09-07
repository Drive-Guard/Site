import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  BellRing,
  CoffeeIcon,
  FileText,
  Phone,
  BellOff,
  Sparkles,
  Zap,
  Clock,
  Eye,
  Gauge,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Driver, riskFromScore } from "@/lib/mockData";
import { KpiCard } from "./KpiCard";
import { ChartCard } from "./ChartCard";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  background: "oklch(0.21 0.025 255)",
  border: "1px solid oklch(0.3 0.025 255)",
  borderRadius: 12,
  color: "oklch(0.97 0.01 250)",
  fontSize: 12,
};

const riskRing: Record<string, string> = {
  critical: "border-risk-critical/60 bg-risk-critical/10 hover:bg-risk-critical/15",
  high: "border-risk-high/50 bg-risk-high/10 hover:bg-risk-high/15",
  medium: "border-risk-medium/50 bg-risk-medium/10 hover:bg-risk-medium/15",
  low: "border-risk-low/40 bg-risk-low/10 hover:bg-risk-low/15",
};
const riskDot: Record<string, string> = {
  critical: "bg-risk-critical",
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
};
const riskLabel: Record<string, string> = {
  critical: "crítico",
  high: "alto",
  medium: "médio",
  low: "baixo",
};

function buildShiftCurve(seedKey: string, peak: number) {
  // pseudo-random deterministic per driver
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) seed = (seed * 31 + seedKey.charCodeAt(i)) % 100000;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: 12 }).map((_, i) => {
    const base = 18 + i * (peak / 14) + Math.sin(i / 2) * 6;
    const noise = (rand() - 0.5) * 10;
    return { hora: `${i + 1}h`, fadiga: Math.max(8, Math.min(100, Math.round(base + noise))) };
  });
}

interface Props {
  drivers: Driver[];
}

export function DriversMonitor({ drivers }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const liveDrivers = useMemo(
    () =>
      drivers
        .map((d) => {
          const drift = ((tick + d.id.charCodeAt(5)) % 5) - 2;
          const score = Math.min(100, Math.max(0, d.fatigueScore + drift));
          return {
            ...d,
            fatigueScore: score,
            risk: riskFromScore(score),
            trend: drift >= 0 ? "up" : "down",
          } as Driver & { trend: "up" | "down" };
        })
        .sort((a, b) => b.fatigueScore - a.fatigueScore),
    [drivers, tick],
  );

  const selected = useMemo(
    () => liveDrivers.find((d) => d.id === selectedId) ?? null,
    [liveDrivers, selectedId],
  );

  const fleetAvg = Math.round(
    liveDrivers.reduce((a, d) => a + d.fatigueScore, 0) / liveDrivers.length,
  );
  const criticalCount = liveDrivers.filter(
    (d) => d.risk === "critical" || d.risk === "high",
  ).length;

  const currentScore = selected ? selected.fatigueScore : fleetAvg;
  const currentHours = selected
    ? selected.shiftHours
    : Math.round((liveDrivers.reduce((a, d) => a + d.shiftHours, 0) / liveDrivers.length) * 10) / 10;
  const alertsToday = selected
    ? Math.max(1, Math.round(selected.fatigueScore / 18))
    : liveDrivers.reduce((a, d) => a + Math.round(d.fatigueScore / 22), 0);
  const severeProb = selected
    ? Math.min(98, Math.round(selected.fatigueScore * 0.9 + selected.shiftHours * 2))
    : Math.min(95, Math.round(fleetAvg * 0.8 + 10));

  const shiftCurve = useMemo(
    () =>
      selected
        ? buildShiftCurve(selected.id, selected.fatigueScore)
        : Array.from({ length: 12 }).map((_, i) => ({
            hora: `${i + 1}h`,
            fadiga: Math.min(100, Math.round(15 + i * 6 + Math.sin(i) * 4)),
          })),
    [selected],
  );

  type InsightLevel = "low" | "medium" | "high" | "critical";
  interface Insight {
    level: InsightLevel;
    icon: typeof AlertTriangle;
    title: string;
    description: string;
  }

  const insights: Insight[] = useMemo(() => {
    if (!selected) {
      return [
        {
          level: criticalCount > 2 ? "critical" : "medium",
          icon: Users,
          title: "Visão agregada da frota",
          description: `${criticalCount} motoristas em risco elevado neste momento.`,
        },
        {
          level: fleetAvg >= 60 ? "high" : "low",
          icon: Brain,
          title: "Score médio da frota",
          description: `Fadiga média de ${fleetAvg}/100 nas últimas leituras.`,
        },
        {
          level: "medium",
          icon: Sparkles,
          title: "Selecione um motorista",
          description: "Veja insights individuais e gere ações rápidas direcionadas.",
        },
      ];
    }
    const list: Insight[] = [];
    if (severeProb >= 70) {
      list.push({
        level: "critical",
        icon: AlertTriangle,
        title: "Risco severo nas próximas 2h",
        description: `Probabilidade estimada de ${severeProb}% de fadiga severa.`,
      });
    }
    if (selected.shiftHours >= 6) {
      list.push({
        level: selected.shiftHours >= 8 ? "high" : "medium",
        icon: CoffeeIcon,
        title: "Pausa recomendada",
        description: `Motorista dirige há ${selected.shiftHours}h sem descanso adequado.`,
      });
    }
    if (selected.fatigueScore >= 75) {
      list.push({
        level: "high",
        icon: TrendingUp,
        title: "Aumento repentino de fadiga",
        description: `Score atual ${selected.fatigueScore}/100, acima do limite de alerta.`,
      });
    }
    if (selected.blinkRate < 12 || selected.eyeClosureMs > 400) {
      list.push({
        level: "high",
        icon: Eye,
        title: "Comportamento anormal",
        description: `Microssonos detectados — fechamento ocular de ${selected.eyeClosureMs}ms.`,
      });
    }
    if (alertsToday >= 4) {
      list.push({
        level: "critical",
        icon: Zap,
        title: "Reincidência crítica",
        description: `${alertsToday} alertas registrados hoje neste motorista.`,
      });
    }
    if (list.length === 0) {
      list.push({
        level: "low",
        icon: ShieldCheck,
        title: "Operação dentro do esperado",
        description: "Nenhum padrão crítico identificado neste turno.",
      });
    }
    return list.slice(0, 4);
  }, [selected, severeProb, alertsToday, fleetAvg, criticalCount]);

  const insightStyles: Record<InsightLevel, { ring: string; chip: string; icon: string; label: string }> = {
    low: {
      ring: "border-risk-low/40 bg-risk-low/5",
      chip: "bg-risk-low/20 text-risk-low",
      icon: "text-risk-low",
      label: "baixo",
    },
    medium: {
      ring: "border-risk-medium/40 bg-risk-medium/5",
      chip: "bg-risk-medium/20 text-risk-medium",
      icon: "text-risk-medium",
      label: "médio",
    },
    high: {
      ring: "border-risk-high/40 bg-risk-high/5",
      chip: "bg-risk-high/20 text-risk-high",
      icon: "text-risk-high",
      label: "alto",
    },
    critical: {
      ring: "border-risk-critical/50 bg-risk-critical/10",
      chip: "bg-risk-critical/20 text-risk-critical",
      icon: "text-risk-critical",
      label: "crítico",
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      {/* LEFT — driver list */}
      <aside className="lg:col-span-3 h-full">
        <div className="glass-card rounded-2xl p-4 flex flex-col h-full min-h-[600px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Motoristas ativos
              </h3>
              <p className="text-xs text-muted-foreground">
                {liveDrivers.length} streams • {criticalCount} em risco
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-risk-low">
              <span className="h-2 w-2 rounded-full bg-risk-low pulse-dot" /> live
            </span>
          </div>
          <div className="space-y-2 overflow-auto pr-1 flex-1 min-h-0">
            {liveDrivers.map((d) => {
              const active = d.id === selectedId;
              const critical = d.risk === "critical";
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(active ? null : d.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all",
                    riskRing[d.risk],
                    active && "ring-2 ring-primary/60",
                    critical && "glow-primary",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn("h-2.5 w-2.5 rounded-full pulse-dot", riskDot[d.risk])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                        <span className="text-[10px] font-mono text-muted-foreground">{d.id}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" /> {d.vehicle}
                        </span>
                        <span>•</span>
                        <span>{d.region}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {d.shiftHours}h
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-lg font-bold leading-none">{d.fatigueScore}</span>
                        {d.trend === "up" ? (
                          <TrendingUp className="h-3.5 w-3.5 text-risk-high" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-risk-low" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "mt-1 inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                          d.risk === "critical" && "bg-risk-critical/20 text-risk-critical",
                          d.risk === "high" && "bg-risk-high/20 text-risk-high",
                          d.risk === "medium" && "bg-risk-medium/20 text-risk-medium",
                          d.risk === "low" && "bg-risk-low/20 text-risk-low",
                        )}
                      >
                        {riskLabel[d.risk]}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* RIGHT — analytical panel */}
      <section className="lg:col-span-7 space-y-6">
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {selected ? "Motorista selecionado" : "Visão da frota"}
            </p>
            <h2 className="text-xl font-bold">
              {selected ? selected.name : "Todos os motoristas"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {selected
                ? `${selected.id} • ${selected.vehicle} • ${selected.region} • ${selected.age} anos • ${selected.yearsDriving}a de CNH`
                : `${liveDrivers.length} motoristas monitorados em tempo real`}
            </p>
          </div>
          {selected && (
            <button
              onClick={() => setSelectedId(null)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary/60"
            >
              Limpar seleção
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Score de fadiga"
            value={currentScore}
            hint={selected ? "score atual" : "média da frota"}
            icon={Gauge}
            variant={currentScore >= 70 ? "risk" : currentScore >= 50 ? "warning" : "safe"}
          />
          <KpiCard
            label="Tempo dirigindo"
            value={`${currentHours}h`}
            hint={selected ? "turno contínuo" : "média da frota"}
            icon={Clock}
            variant={currentHours >= 8 ? "risk" : "default"}
          />
          <KpiCard
            label="Alertas hoje"
            value={alertsToday}
            hint={selected ? "deste motorista" : "frota completa"}
            icon={AlertTriangle}
            variant="warning"
          />
          <KpiCard
            label="Prob. fadiga severa"
            value={`${severeProb}%`}
            hint="próximas 2h"
            icon={Brain}
            variant={severeProb >= 70 ? "risk" : "warning"}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <ChartCard
            title="Evolução da fadiga no turno"
            subtitle={selected ? `${selected.name} — última jornada` : "Curva média da frota"}
            className="xl:col-span-2"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={shiftCurve}>
                <defs>
                  <linearGradient id="drvFad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.18 220)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="oklch(0.72 0.18 220)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.025 255)" />
                <XAxis dataKey="hora" stroke="oklch(0.7 0.02 255)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.02 255)" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine
                  y={70}
                  stroke="oklch(0.65 0.22 25)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Limite de alerta",
                    fill: "oklch(0.65 0.22 25)",
                    fontSize: 11,
                    position: "right",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="fadiga"
                  stroke="oklch(0.72 0.18 220)"
                  strokeWidth={2.5}
                  fill="url(#drvFad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="flex flex-col gap-4">
            <ChartCard
              title="Insights automáticos"
              subtitle="Análises geradas pela IA para o motorista selecionado"
            >
              <div className="space-y-2.5">
                {insights.map((ins, i) => {
                  const s = insightStyles[ins.level];
                  const Icon = ins.icon;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border p-3 flex gap-3 transition-all animate-in fade-in slide-in-from-bottom-1 duration-300",
                        s.ring,
                      )}
                    >
                      <div className={cn("mt-0.5 shrink-0", s.icon)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={cn(
                              "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold",
                              s.chip,
                            )}
                          >
                            {s.label}
                          </span>
                          <p className="text-sm font-medium text-foreground truncate">
                            {ins.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {ins.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            <ChartCard title="Ações rápidas" subtitle="Resposta operacional imediata">
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    label: "Solicitar pausa",
                    icon: CoffeeIcon,
                    cls: "border-risk-medium/50 bg-risk-medium/15 text-risk-medium hover:bg-risk-medium/25 hover:border-risk-medium/70",
                  },
                  {
                    label: "Notificar motorista",
                    icon: BellRing,
                    cls: "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60",
                  },
                  {
                    label: "Registrar ocorrência",
                    icon: FileText,
                    cls: "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      className={cn(
                        "group w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all active:scale-[0.98]",
                        a.cls,
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        {a.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
                        {selected ? selected.id : "frota"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        </div>

      </section>
    </div>
  );
}