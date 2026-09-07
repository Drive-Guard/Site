import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Activity,
  Brain,
  Clock,
  Eye,
  Gauge,
  Lightbulb,
  ShieldCheck,
  TrendingDown,
  Truck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { RealtimeAlerts } from "@/components/dashboard/RealtimeAlerts";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { RiskRoutesList } from "@/components/dashboard/RiskRoutesList";
import { Filters } from "@/components/dashboard/Filters";
import { DriversMonitor } from "@/components/dashboard/DriversMonitor";
import { ReportsCenter } from "@/components/dashboard/ReportsCenter";
import {
  generateDrivers,
  hourBuckets,
  insights,
  kpis,
  shiftTrend,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DriveGuard — Dashboard de Sonolência ao Volante" },
      {
        name: "description",
        content:
          "Dashboard inteligente para monitoramento de fadiga e prevenção de acidentes por sonolência em frotas de transporte.",
      },
      { property: "og:title", content: "DriveGuard — Sonolência ao Volante" },
      {
        property: "og:description",
        content:
          "KPIs, alertas em tempo real e insights preditivos baseados em câmeras de detecção de fadiga.",
      },
    ],
  }),
  component: Dashboard,
});

const tooltipStyle = {
  background: "oklch(0.21 0.025 255)",
  border: "1px solid oklch(0.3 0.025 255)",
  borderRadius: 12,
  color: "oklch(0.97 0.01 250)",
  fontSize: 12,
};

const sevColor: Record<string, string> = {
  critical: "text-risk-critical bg-risk-critical/10 border-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 border-risk-high/30",
  medium: "text-risk-medium bg-risk-medium/10 border-risk-medium/30",
  low: "text-risk-low bg-risk-low/10 border-risk-low/30",
};

function Dashboard() {
  const [period, setPeriod] = useState("Últimos 30 dias");
  const [region, setRegion] = useState("Todas as regiões");
  const [vehicle, setVehicle] = useState("Todos os veículos");
  const [drivers, setDrivers] = useState(() => generateDrivers(16));
  const [activeTab, setActiveTab] = useState("Visão Geral");

  // Simula dados em tempo real
  useEffect(() => {
    const id = setInterval(() => setDrivers(generateDrivers(16)), 6000);
    return () => clearInterval(id);
  }, []);

  const onExport = () => {
    const csv =
      "Motorista,Veiculo,Regiao,Turno(h),Fadiga,Risco\n" +
      drivers
        .map((d) => `${d.name},${d.vehicle},${d.region},${d.shiftHours},${d.fatigueScore},${d.risk}`)
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleetguard-relatorio-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const avgFatigue = useMemo(
    () => Math.round(drivers.reduce((a, d) => a + d.fatigueScore, 0) / drivers.length),
    [drivers],
  );
  const criticalCount = drivers.filter((d) => d.risk === "critical" || d.risk === "high").length;

  const fatigue30d = useMemo(() => {
    const days = 30;
    const data: { day: string; fadiga: number }[] = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const base = 45 + Math.sin((days - i) / 4) * 10 + (days - i) * 0.4;
      const noise = (rand() - 0.5) * 12;
      data.push({
        day: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        fadiga: Math.max(20, Math.min(95, Math.round(base + noise))),
      });
    }
    return data;
  }, []);

  const fatigue30dDelta = useMemo(() => {
    const half = Math.floor(fatigue30d.length / 2);
    const prev = fatigue30d.slice(0, half);
    const curr = fatigue30d.slice(half);
    const avg = (arr: typeof fatigue30d) => arr.reduce((a, b) => a + b.fadiga, 0) / arr.length;
    const prevAvg = avg(prev);
    return Math.round(((avg(curr) - prevAvg) / prevAvg) * 100);
  }, [fatigue30d]);

  const fatigueByHours = [
    { horas: 1, fadiga: 35, eventos: 42 },
    { horas: 3, fadiga: 48, eventos: 67 },
    { horas: 5, fadiga: 60, eventos: 89 },
    { horas: 7, fadiga: 72, eventos: 112 },
    { horas: 9, fadiga: 85, eventos: 138 },
    { horas: 11, fadiga: 92, eventos: 64 },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-30 bg-background/70">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.6_0.22_280)] flex items-center justify-center glow-primary">
              <Eye className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Drive<span className="text-gradient">Guard</span></h1>
              <p className="text-xs text-muted-foreground">Detecção de fadiga & prevenção de acidentes</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {["Visão Geral", "Motoristas", "Relatórios"].map((item) => (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition",
                  activeTab === item
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Operações Brasil</p>
              <p className="text-sm font-medium">Centro de Comando</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-[oklch(0.6_0.22_280)] flex items-center justify-center text-sm font-bold text-primary-foreground">
              MA
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {activeTab === "Motoristas" ? (
          <DriversMonitor drivers={drivers} />
        ) : activeTab === "Relatórios" ? (
          <ReportsCenter />
        ) : (
        <>
        {/* Filtros + KPIs principais — visão imediata */}
        <Filters
          period={period}
          setPeriod={setPeriod}
          region={region}
          setRegion={setRegion}
          vehicle={vehicle}
          setVehicle={setVehicle}
          onExport={onExport}
        />
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Motoristas em risco" value={criticalCount} hint={`de ${drivers.length} ativos`} icon={AlertTriangle} variant="risk" />
          <KpiCard label="Fadiga média" value={`${avgFatigue}%`} hint="score da frota" icon={Gauge} variant="warning" />
          <KpiCard label="Alertas nas últimas 24h" value={kpis.activeAlerts} hint="câmeras em tempo real" icon={ShieldCheck} variant="safe" trend={-12} />
          <KpiCard label="Horário crítico" value="03:00 – 05:00" hint="madrugada concentra 35%" icon={Clock} variant="risk" />
        </section>

        {/* Realtime alerts — prioridade máxima */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <ChartCard
            title="Alertas de risco em tempo real"
            subtitle="Score de fadiga calculado por visão computacional"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-risk-low">
                <span className="h-2 w-2 rounded-full bg-risk-low pulse-dot" />
                streaming
              </span>
            }
            className="xl:col-span-1"
          >
            <RealtimeAlerts drivers={drivers} />
          </ChartCard>

          <ChartCard
            title="Tendência de sonolência ao longo do turno"
            subtitle="Score médio agregado da frota (0–100)"
            className="xl:col-span-2"
          >
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={shiftTrend}>
                <defs>
                  <linearGradient id="fadgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.025 255)" />
                <XAxis dataKey="hora" stroke="oklch(0.7 0.02 255)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.02 255)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={70} stroke="oklch(0.65 0.22 25)" strokeDasharray="4 4" label={{ value: "Limite de alerta", fill: "oklch(0.65 0.22 25)", fontSize: 11, position: "right" }} />
                <Area type="monotone" dataKey="fadiga" stroke="oklch(0.65 0.22 25)" strokeWidth={2.5} fill="url(#fadgrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Brain className="h-3 w-3" /> Predição IA</p>
                <p className="mt-1 text-sm font-semibold">Risco severo em 2h</p>
                <p className="text-xs text-risk-high">3 motoristas afetados</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Sinais detectados</p>
                <p className="mt-1 text-sm font-semibold">Piscadas + cabeça</p>
                <p className="text-xs text-muted-foreground">14 eventos/h</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" /> Score médio</p>
                <p className="mt-1 text-sm font-semibold">{avgFatigue}/100</p>
                <p className="text-xs text-risk-medium">+5 vs ontem</p>
              </div>
            </div>
          </ChartCard>
        </section>

        {/* Hero summary — resumo executivo */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-risk-high/10 border border-risk-high/30 text-risk-high text-xs font-medium mb-3">
                <AlertTriangle className="h-3 w-3" /> {criticalCount} motoristas em estado de risco elevado
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Sua frota está com fadiga média de <span className="text-gradient">{avgFatigue}%</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                A IA processou {drivers.length} streams de câmera nas últimas horas. Aplicando as recomendações,
                estimamos uma redução de <span className="text-risk-low font-semibold">{kpis.potentialReduction}%</span> em acidentes por sonolência este trimestre.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition glow-primary">
                  Ver motoristas críticos
                </button>
                <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary/60 transition">
                  Aplicar política preventiva
                </button>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -bottom-16 -right-16 w-60 h-60 rounded-full bg-risk-low/15 blur-3xl" />
            <div className="relative">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Impacto estimado</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-risk-low">{kpis.potentialReduction}%</span>
                <span className="text-sm text-muted-foreground">menos acidentes</span>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Vidas potencialmente salvas/ano", value: "~ 84" },
                  { label: "Custo evitado", value: "R$ 12,4 mi" },
                  { label: "Horas de inatividade evitadas", value: "3.210h" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Charts row 2 */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <ChartCard
            title="Evolução da fadiga média (30 dias)"
            subtitle={`Score diário da frota • ${fatigue30dDelta >= 0 ? "+" : ""}${fatigue30dDelta}% vs período anterior`}
            action={
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-full border",
                  fatigue30dDelta > 0
                    ? "text-risk-high border-risk-high/30 bg-risk-high/10"
                    : "text-risk-low border-risk-low/30 bg-risk-low/10",
                )}
              >
                {fatigue30dDelta >= 0 ? "▲" : "▼"} {Math.abs(fatigue30dDelta)}%
              </span>
            }
            className="xl:col-span-2"
          >
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <LineChart data={fatigue30d}>
                <defs>
                  <linearGradient id="fad30grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.025 255)" />
                <XAxis dataKey="day" stroke="oklch(0.7 0.02 255)" fontSize={11} interval={4} />
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
                <Line
                  type="monotone"
                  dataKey="fadiga"
                  stroke="oklch(0.72 0.18 220)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Rotas com maior incidência"
            subtitle="Ordenadas por risco de sonolência"
          >
            <RiskRoutesList />
          </ChartCard>
        </section>

        {/* Charts row 3 */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <ChartCard title="Acidentes por faixa horária" subtitle="Madrugada concentra a maioria dos casos">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.025 255)" />
                <XAxis dataKey="faixa" stroke="oklch(0.7 0.02 255)" fontSize={11} interval={0} />
                <YAxis stroke="oklch(0.7 0.02 255)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="acidentes" radius={[8, 8, 0, 0]}>
                  {hourBuckets.map((b, i) => (
                    <Cell key={i} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Heatmap: tempo de direção × risco" subtitle="Probabilidade de sonolência (%)">
            <Heatmap />
          </ChartCard>

          <ChartCard
            title="Fadiga vs tempo de direção"
            subtitle="Score médio da frota por faixa de horas ao volante"
          >
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.025 255)" />
                <XAxis
                  type="number"
                  dataKey="horas"
                  name="Horas de direção"
                  domain={[0, 12]}
                  ticks={[0, 2, 4, 6, 8, 10, 12]}
                  stroke="oklch(0.7 0.02 255)"
                  fontSize={12}
                  unit="h"
                />
                <YAxis
                  type="number"
                  dataKey="fadiga"
                  name="Score de fadiga"
                  domain={[0, 100]}
                  stroke="oklch(0.7 0.02 255)"
                  fontSize={12}
                />
                <ZAxis type="number" dataKey="eventos" range={[60, 220]} name="Eventos" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "oklch(0.5 0.02 255)" }}
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => {
                    if (name === "Horas de direção") return [`${value}h`, name];
                    if (name === "Score de fadiga") return [`${value}/100`, name];
                    return [value, name];
                  }}
                />
                <ReferenceArea
                  y1={70}
                  y2={100}
                  fill="oklch(0.65 0.22 25)"
                  fillOpacity={0.08}
                  stroke="oklch(0.65 0.22 25)"
                  strokeOpacity={0.25}
                  strokeDasharray="3 3"
                  label={{
                    value: "Zona crítica",
                    fill: "oklch(0.65 0.22 25)",
                    fontSize: 11,
                    position: "insideTopRight",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="fadiga"
                  data={fatigueByHours}
                  stroke="oklch(0.72 0.18 220)"
                  strokeWidth={2.5}
                  dot={false}
                  legendType="none"
                  isAnimationActive={false}
                />
                <Scatter
                  name="Faixa de horas"
                  data={fatigueByHours}
                  fill="oklch(0.72 0.18 220)"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        {/* Insights & recommendations */}
        <section className="grid grid-cols-1 gap-6">
          <ChartCard
            title="Insights & recomendações automáticas"
            subtitle="Geradas pela IA com base nos padrões detectados"
            action={<Lightbulb className="h-4 w-4 text-risk-medium" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((ins) => (
                <div
                  key={ins.title}
                  className={cn(
                    "rounded-xl border p-4 transition hover:scale-[1.01]",
                    sevColor[ins.severity],
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-foreground">{ins.title}</h4>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/40 border border-current">
                      {ins.severity === "critical" ? "crítico" : ins.severity === "high" ? "alto" : ins.severity === "medium" ? "médio" : "baixo"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{ins.desc}</p>
                  <button className="mt-3 text-xs font-medium underline-offset-4 hover:underline">
                    {ins.action} →
                  </button>
                </div>
              ))}
            </div>
          </ChartCard>
        </section>

        <footer className="pt-6 pb-10 flex items-center justify-between text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-risk-low" />
            Dados atualizados a cada 6s • Modelo de fadiga v3.2
          </p>
          <p>© DriveGuard — protótipo com dados simulados</p>
        </footer>
        </>
        )}
      </main>
    </div>
  );
}
