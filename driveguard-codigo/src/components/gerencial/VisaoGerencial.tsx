/**
 * Visão gerencial (admin e gestor): o resumo do período para quem decide.
 */

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Gauge, ShieldCheck, TrendingDown } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Filters } from "@/components/dashboard/Filters";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RiskRoutesList } from "@/components/dashboard/RiskRoutesList";
import { Conteudo } from "@/components/comum/Estado";
import { api } from "@/lib/api";
import { useFiltros } from "@/lib/filtros";
import { diaMes, num, variacao } from "@/lib/formato";
import { COR, ESTILO_TOOLTIP } from "@/lib/risco";
import type { EvolucaoFadiga, Kpis, RotaDesempenho } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { BasePrf } from "./BasePrf";
import { ImpactoRoi } from "./ImpactoRoi";
import { Insights, useInsights } from "./Insights";

export function useKpis() {
  const { query } = useFiltros();
  return useQuery({ queryKey: ["kpis", query], queryFn: () => api.get<Kpis>("/dashboard/kpis", query), refetchInterval: 30_000 });
}

export default function VisaoGerencial() {
  const { query, rotuloPeriodo } = useFiltros();
  const kpis = useKpis();
  const evolucao = useQuery({ queryKey: ["evolucao", query], queryFn: () => api.get<EvolucaoFadiga>("/dashboard/evolucao-fadiga", query) });
  const rotas = useQuery({ queryKey: ["rotas", query], queryFn: () => api.get<RotaDesempenho[]>("/dashboard/rotas", query) });
  const insights = useInsights();

  const k = kpis.data;
  const criticos = insights.data?.recomendacoes.filter((r) => r.severidade === "critical" || r.severidade === "high").length ?? 0;

  return (
    <>
      <Filters />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Motoristas em risco agora"
          value={k?.aoVivo.motoristasEmRisco ?? "—"}
          hint={k ? `de ${k.aoVivo.motoristasAtivos} dirigindo agora` : undefined}
          icon={AlertTriangle}
          variant="risk"
          carregando={kpis.isLoading}
        />
        <KpiCard
          label="Fadiga média"
          value={k ? num(k.periodo.fadigaMedia, 1) : "—"}
          hint={rotuloPeriodo.toLowerCase()}
          trend={k?.periodo.variacaoFadiga}
          icon={Gauge}
          variant="warning"
          carregando={kpis.isLoading}
        />
        <KpiCard
          label="Alertas nas últimas 24h"
          value={k?.alertas24h.total ?? "—"}
          hint="emitidos na cabine pelas câmeras"
          trend={k?.alertas24h.variacao}
          trendLabel="vs 24h anteriores"
          icon={ShieldCheck}
          variant="safe"
          carregando={kpis.isLoading}
        />
        <KpiCard
          label="Horário crítico"
          value={k?.horarioCritico ? `${k.horarioCritico.inicio} – ${k.horarioCritico.fim}` : "—"}
          hint={k?.horarioCritico ? `${k.horarioCritico.percentual}% dos alertas da frota` : "sem alertas no período"}
          icon={Clock}
          variant="risk"
          carregando={kpis.isLoading}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            {k && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-risk-high/10 border border-risk-high/30 text-risk-high text-xs font-medium mb-3">
                <AlertTriangle className="h-3 w-3" /> {k.aoVivo.motoristasEmRisco} motoristas com fadiga alta neste momento
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Fadiga média da frota: <span className="text-gradient">{k ? num(k.periodo.fadigaMedia, 1) : "—"}</span>
              <span className="text-base font-medium text-muted-foreground"> / 100</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              {k && (
                <>
                  {rotuloPeriodo}: {num(k.periodo.turnos)} turnos, {num(k.periodo.horasDirigidas)} h ao volante e {num(k.periodo.alertas)} alertas ({num(k.periodo.alertasGraves)} graves).{" "}
                  {k.periodo.variacaoFadiga !== null && Math.abs(k.periodo.variacaoFadiga) < 1 && <>A fadiga ficou estável em relação ao período anterior. </>}
                  {k.periodo.variacaoFadiga !== null && Math.abs(k.periodo.variacaoFadiga) >= 1 && (
                    <>
                      A fadiga {k.periodo.variacaoFadiga <= 0 ? "caiu" : "subiu"}{" "}
                      <span className={cn("font-semibold", k.periodo.variacaoFadiga <= 0 ? "text-risk-low" : "text-risk-high")}>{Math.abs(k.periodo.variacaoFadiga)}%</span> em relação ao período anterior.{" "}
                    </>
                  )}
                  {criticos > 0 && (criticos === 1 ? "1 recomendação de prioridade alta aguarda ação." : `${criticos} recomendações de prioridade alta aguardam ação.`)}
                </>
              )}
            </p>
            {insights.data?.resumo?.length ? (
              <ul className="mt-4 grid md:grid-cols-2 gap-2 text-xs text-foreground/90">
                {insights.data.resumo.slice(0, 4).map((f) => (
                  <li key={f} className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-2">
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <ImpactoRoi />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard
          title="Evolução da fadiga média"
          subtitle={evolucao.data ? `Score diário da frota • ${variacao(evolucao.data.variacao) ?? "sem base"} vs período anterior` : "Score diário da frota"}
          action={
            evolucao.data?.variacao !== null && evolucao.data?.variacao !== undefined ? (
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-full border",
                  evolucao.data.variacao > 0 ? "text-risk-high border-risk-high/30 bg-risk-high/10" : "text-risk-low border-risk-low/30 bg-risk-low/10",
                )}
              >
                {evolucao.data.variacao >= 0 ? "▲" : "▼"} {Math.abs(evolucao.data.variacao)}%
              </span>
            ) : null
          }
          className="xl:col-span-2"
        >
          <Conteudo q={evolucao} altura={300}>
            {(d) => (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={d.serie.map((p) => ({ ...p, rotulo: diaMes(p.dia) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} />
                  <XAxis dataKey="rotulo" stroke={COR.eixo} fontSize={11} interval={Math.max(0, Math.floor(d.serie.length / 10))} />
                  <YAxis stroke={COR.eixo} fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(v: number, n: string) => [n === "fadiga" ? num(v, 1) : v, n === "fadiga" ? "Fadiga média" : "Alertas"]} />
                  <ReferenceLine y={d.limiteAlerta} stroke={COR.risco} strokeDasharray="4 4" label={{ value: "Limite de alerta", fill: COR.risco, fontSize: 11, position: "right" }} />
                  <Line type="monotone" dataKey="fadiga" stroke={COR.primaria} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Conteudo>
        </ChartCard>

        <ChartCard title="Rotas com maior incidência" subtitle="Ordenadas pela fadiga média, com o histórico da PRF nas BRs">
          <Conteudo q={rotas} altura={300}>
            {(d) => <RiskRoutesList rotas={d} />}
          </Conteudo>
        </ChartCard>
      </section>

      <BasePrf />

      <section>
        <Insights />
      </section>

      <footer className="pt-2 pb-8 flex items-center gap-2 text-xs text-muted-foreground">
        <TrendingDown className="h-3.5 w-3.5 text-risk-low" />
        Dados da frota atualizados a cada 5 minutos (views Gold) • estado ao vivo a cada 30 s
      </footer>
    </>
  );
}
