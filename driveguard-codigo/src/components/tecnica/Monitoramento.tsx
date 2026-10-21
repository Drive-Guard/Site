/**
 * Monitoramento (visão técnica, todos os papéis): o que está acontecendo
 * agora e como a fadiga se comporta ao longo do turno.
 *
 * O alerta acontece na cabine, em tempo real, no dispositivo embarcado. Aqui a
 * central vê o registro e responde com o que fez (pausa, ligação, encerrar o
 * turno ou falso alarme), o que alimenta o indicador de alertas atendidos.
 */

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Brain, Eye, Gauge, Users, X } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Filters } from "@/components/dashboard/Filters";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RealtimeAlerts } from "@/components/dashboard/RealtimeAlerts";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { useKpis } from "@/components/gerencial/VisaoGerencial";
import { api } from "@/lib/api";
import { useFiltros } from "@/lib/filtros";
import { escreverParametros, useIrPara, useParametros } from "@/lib/navegacao";
import { dataHora, hora, num } from "@/lib/formato";
import { COR, CRITERIO_EM_RISCO, ESTILO_TOOLTIP } from "@/lib/risco";
import type { PontoFadigaTempo, TempoReal, TendenciaTurno } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { DICAS } from "@/lib/dicas";
import { RespostaAlerta, ResumoRespostas } from "./RespostaAlerta";

const ROTULO_GRAVIDADE: Record<string, string> = { critica: "Crítica", alta: "Alta", media: "Média", baixa: "Baixa" };

const COR_GRAVIDADE: Record<string, string> = {
  critica: "text-risk-critical",
  alta: "text-risk-high",
  media: "text-risk-medium",
  baixa: "text-risk-low",
};

export default function Monitoramento() {
  const { query } = useFiltros();
  const kpis = useKpis();
  const irPara = useIrPara();
  // Janela dos alertas: 6 h por padrão; os atalhos pedem 24 h ou 30 dias (só graves).
  const url = useParametros();
  const horas = Number(url.get("horas")) || 6;
  const soGraves = url.get("gravidade") === "graves";
  const consultaTempoReal = { regiao: query.regiao, tipo_veiculo: query.tipo_veiculo, horas, gravidade: soGraves ? "graves" : undefined };
  const rotuloJanela = horas >= 48 ? `Últimos ${Math.round(horas / 24)} dias` : `Últimas ${horas} horas`;

  const tempoReal = useQuery({
    queryKey: ["tempo-real", consultaTempoReal],
    queryFn: () => api.get<TempoReal>("/dashboard/alertas-tempo-real", consultaTempoReal),
    refetchInterval: 5_000,
  });
  // Tela do "agora": cada gráfico tem a própria janela (sem o período global).
  const dimensoes = { regiao: query.regiao, tipo_veiculo: query.tipo_veiculo };
  const q7 = { ...dimensoes, periodo: "7d" };
  const q30 = { ...dimensoes, periodo: "30d" };
  const tendencia = useQuery({ queryKey: ["tendencia", q7], queryFn: () => api.get<TendenciaTurno>("/dashboard/tendencia-turno", q7) });
  const tempoDirecao = useQuery({ queryKey: ["fadiga-tempo", q30], queryFn: () => api.get<PontoFadigaTempo[]>("/dashboard/fadiga-tempo-direcao", q30) });

  const k = kpis.data;
  const t = tendencia.data;

  return (
    <>
      <Filters periodo={false} />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Dirigindo agora" info={DICAS.dirigindoAgora}
          value={k?.aoVivo.motoristasAtivos ?? "—"}
          hint={k ? `de ${k.aoVivo.motoristasMonitorados} monitorados` : undefined}
          icon={Users}
          carregando={kpis.isLoading}
          aoClicar={() => irPara("motoristas", { filtro: "ativos" })}
          destino="Ver quem está dirigindo agora"
        />
        <KpiCard
          label="Em risco agora" info={DICAS.emRiscoAgora}
          value={k?.aoVivo.motoristasEmRisco ?? "—"}
          hint={`${CRITERIO_EM_RISCO} na última leitura`}
          icon={AlertTriangle}
          variant="risk"
          carregando={kpis.isLoading}
          aoClicar={() => irPara("motoristas", { filtro: "risco" })}
          destino="Ver os motoristas em risco agora"
        />
        <KpiCard
          label="Fadiga média agora" info={DICAS.fadigaMediaAgora}
          value={k ? num(k.aoVivo.fadigaMedia, 1) : "—"}
          hint="motoristas dirigindo"
          icon={Gauge}
          variant="warning"
          carregando={kpis.isLoading}
          aoClicar={() => irPara("motoristas", { filtro: "ativos" })}
          destino="Ver os motoristas dirigindo, do maior para o menor score"
        />
        <KpiCard
          label="Alertas nas últimas 24h" info={DICAS.alertas24h}
          value={k?.alertas24h.total ?? "—"}
          trend={k?.alertas24h.variacao}
          trendLabel="vs 24h anteriores"
          icon={Activity}
          variant="safe"
          carregando={kpis.isLoading}
          aoClicar={() => {
            escreverParametros({ horas: 24, gravidade: null }, { historico: true });
            document.getElementById("alertas-recentes")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          destino="Mostrar os alertas das últimas 24 horas"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard
          title="Motoristas em risco agora" info={DICAS.motoristasRisco}
          subtitle="Agora (últimos 30 min) • score calculado pela câmera na cabine"
          action={
            <span className="inline-flex items-center gap-1.5 text-xs text-risk-low">
              <span className="h-2 w-2 rounded-full bg-risk-low pulse-dot" />
              ao vivo
            </span>
          }
        >
          <Conteudo q={tempoReal} altura={300}>
            {(d) => <RealtimeAlerts motoristas={d.motoristas} aoSelecionar={(id) => irPara("motoristas", { motorista: id, filtro: "todos" })} />}
          </Conteudo>
        </ChartCard>

        <ChartCard
          title="Alertas recentes" info={DICAS.alertasRecentes}
          subtitle={`${rotuloJanela}${soGraves ? " • só graves" : ""} • responda com o que a central fez`}
          className="xl:col-span-2 scroll-mt-24"
          action={
            <div id="alertas-recentes" className="flex items-center gap-1 text-xs">
              {[6, 24, 720].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => escreverParametros({ horas: h === 6 ? null : h }, { historico: true })}
                  className={cn("px-2 py-1 rounded-md border", horas === h ? "bg-accent text-accent-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground")}
                >
                  {h === 720 ? "30 dias" : `${h} h`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => escreverParametros({ gravidade: soGraves ? null : "graves" }, { historico: true })}
                className={cn("px-2 py-1 rounded-md border inline-flex items-center gap-1", soGraves ? "bg-risk-high/10 text-risk-high border-risk-high/30" : "border-border text-muted-foreground hover:text-foreground")}
              >
                só graves {soGraves && <X className="h-3 w-3" />}
              </button>
            </div>
          }
        >
          <Conteudo q={tempoReal} altura={300}>
            {(d) =>
              d.eventos.length === 0 ? (
                <Vazio>Nenhum alerta {soGraves ? "grave " : ""}na janela ({rotuloJanela.toLowerCase()}).</Vazio>
              ) : (
                <>
                <ResumoRespostas r={d.respostas} />
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground sticky top-0 bg-card">
                      <tr className="text-left">
                        <th className="py-2 pr-2 font-medium">Hora</th>
                        <th className="py-2 pr-2 font-medium">Motorista</th>
                        <th className="py-2 pr-2 font-medium">Sinal</th>
                        <th className="py-2 pr-2 font-medium">Gravidade</th>
                        <th className="py-2 pr-2 font-medium text-right">Score</th>
                        <th className="py-2 font-medium text-right">Resposta da central</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.eventos.map((e) => (
                        <tr key={e.id} className={cn("border-t border-border", e.status === "aberto" && (e.gravidade === "alta" || e.gravidade === "critica") && "bg-risk-high/5")}>
                          <td className="py-2 pr-2 font-mono text-xs whitespace-nowrap">{horas > 24 ? dataHora(e.disparadoEm) : hora(e.disparadoEm)}</td>
                          <td className="py-2 pr-2">
                            <button
                              type="button"
                              onClick={() => irPara("motoristas", { motorista: e.motoristaId, filtro: "todos" })}
                              className="text-left hover:text-primary"
                              title="Abrir o painel do motorista"
                            >
                              <span className="font-medium">{e.nome}</span> <span className="text-xs text-muted-foreground font-mono">{e.codigo}</span>
                            </button>
                          </td>
                          <td className="py-2 pr-2">{e.rotulo}</td>
                          <td className={cn("py-2 pr-2 font-medium", COR_GRAVIDADE[e.gravidade])}>{ROTULO_GRAVIDADE[e.gravidade] ?? e.gravidade}</td>
                          <td className="py-2 pr-2 text-right">{num(e.score, 0)}</td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <RespostaAlerta evento={e} outrosAbertos={d.eventos.filter((o) => o.motoristaId === e.motoristaId && o.id !== e.id && o.status === "aberto").length} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )
            }
          </Conteudo>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard title="Tendência de sonolência ao longo do turno" info={DICAS.tendenciaTurno} subtitle="Últimos 7 dias • score médio da frota por hora de direção (0–100)" className="xl:col-span-2">
          <Conteudo q={tendencia} altura={320}>
            {(d) => (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={d.pontos}>
                    <defs>
                      <linearGradient id="fadgrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COR.risco} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={COR.risco} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} />
                    <XAxis dataKey="hora" stroke={COR.eixo} fontSize={12} />
                    <YAxis stroke={COR.eixo} fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(v: number) => [num(v, 1), "Fadiga média"]} labelFormatter={(l) => `${l} de direção`} />
                    <ReferenceLine y={d.limiteAlerta} stroke={COR.risco} strokeDasharray="4 4" label={{ value: "Limite de alerta", fill: COR.risco, fontSize: 11, position: "right" }} />
                    <Area type="monotone" dataKey="fadiga" stroke={COR.risco} strokeWidth={2.5} fill="url(#fadgrad)" connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Brain className="h-3 w-3" /> Ponto de atenção
                    </p>
                    <p className="mt-1 text-sm font-semibold">{t?.resumo.primeiraHoraAcimaDoLimite ? `Passa do limite na ${t.resumo.primeiraHoraAcimaDoLimite}` : "Abaixo do limite"}</p>
                    <p className="text-xs text-risk-high">{t?.resumo.pico ? `pico de ${num(t.resumo.pico.fadiga, 1)} na ${t.resumo.pico.hora}` : "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Sinais detectados
                    </p>
                    <p className="mt-1 text-sm font-semibold truncate">{t?.resumo.sinais.length ? t.resumo.sinais.slice(0, 2).map((s) => s.rotulo).join(" + ") : "—"}</p>
                    <p className="text-xs text-muted-foreground">{num(t?.resumo.eventosPorHora, 1)} alertas/h (24 h)</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> Score médio agora
                    </p>
                    <p className="mt-1 text-sm font-semibold">{num(t?.resumo.scoreAtual, 1)}/100</p>
                    <p className={cn("text-xs", (t?.resumo.variacaoVsOntem ?? 0) > 0 ? "text-risk-high" : "text-risk-low")}>
                      {t?.resumo.variacaoVsOntem !== null && t?.resumo.variacaoVsOntem !== undefined
                        ? `${t.resumo.variacaoVsOntem > 0 ? "+" : ""}${num(t.resumo.variacaoVsOntem, 1)} vs média de ontem`
                        : "sem base de ontem"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </Conteudo>
        </ChartCard>

        <ChartCard title="Heatmap: tempo de direção × dia" info={DICAS.heatmap} subtitle="Calendário próprio • % de leituras sonolentas ou score médio">
          <Heatmap />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1">
        <ChartCard title="Fadiga vs tempo de direção" info={DICAS.fadigaTempo} subtitle="Últimos 30 dias • score médio por faixa de horas ao volante • tamanho do ponto = alertas emitidos">
          <Conteudo q={tempoDirecao} altura={280}>
            {(d) => (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={d.filter((p) => p.fadiga !== null)} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} />
                  <XAxis type="number" dataKey="horas" name="Horas de direção" domain={[0, 12]} ticks={[0, 2, 4, 6, 8, 10, 12]} stroke={COR.eixo} fontSize={12} unit="h" />
                  <YAxis type="number" dataKey="fadiga" name="Score de fadiga" domain={[0, 100]} stroke={COR.eixo} fontSize={12} />
                  <ZAxis type="number" dataKey="eventos" range={[60, 400]} name="Alertas" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3", stroke: COR.neutro }}
                    contentStyle={ESTILO_TOOLTIP}
                    formatter={(valor: number, nome: string) => (nome === "Horas de direção" ? [`${valor}h`, "Meio da faixa"] : nome === "Score de fadiga" ? [`${num(valor, 1)}/100`, nome] : [valor, nome])}
                  />
                  <ReferenceArea y1={70} y2={100} fill={COR.risco} fillOpacity={0.08} stroke={COR.risco} strokeOpacity={0.25} strokeDasharray="3 3" label={{ value: "Zona crítica", fill: COR.risco, fontSize: 11, position: "insideTopRight" }} />
                  <Line type="monotone" dataKey="fadiga" stroke={COR.primaria} strokeWidth={2.5} dot={false} legendType="none" isAnimationActive={false} />
                  <Scatter name="Faixa de horas" dataKey="fadiga" fill={COR.primaria} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Conteudo>
        </ChartCard>
      </section>
    </>
  );
}
