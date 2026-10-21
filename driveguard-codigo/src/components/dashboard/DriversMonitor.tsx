/**
 * Aba Motoristas.
 *
 * "Turnos" (filtro geral da tela, no topo) escolhe o que a aba mostra:
 *   - Agora (padrão): lista ao vivo, painel do motorista ou da frota, curva do
 *     turno atual, insights e ações rápidas;
 *   - Hoje, Ontem, 7 dias, 30 dias ou datas: os turnos que começaram no
 *     intervalo, por motorista (pico e média de fadiga, horas, alertas), e no
 *     painel do motorista a lista de turnos com a curva de cada um.
 *
 * Não há "notificar motorista": o alerta sonoro acontece na cabine, em tempo
 * real, pelo próprio dispositivo. As ações aqui registram a resposta da
 * central (pausa solicitada, ocorrência).
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CalendarRange,
  Clock,
  CoffeeIcon,
  Eye,
  FileText,
  Gauge,
  History,
  Loader2,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { Selecao } from "@/components/comum/Selecao";
import { SeletorIntervalo } from "@/components/comum/SeletorIntervalo";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, mensagemDeErro, type Query } from "@/lib/api";
import { useFiltros } from "@/lib/filtros";
import { escreverParametros, useParametros } from "@/lib/navegacao";
import { dataHora, diaIso, num, relativo } from "@/lib/formato";
import { ANEL_RISCO, CHIP_RISCO, COR, CRITERIO_EM_RISCO, ESTILO_TOOLTIP, PONTO_RISCO, ROTULO_RISCO } from "@/lib/risco";
import type { CurvaTurno, InsightMotorista, MotoristaAoVivo, MotoristaDetalhe, MotoristaHistorico, TurnoResumo } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { Filters } from "./Filters";
import { KpiCard } from "./KpiCard";
import { DICAS } from "@/lib/dicas";
import { Dica } from "@/components/comum/Dica";

const ICONES: Record<string, typeof AlertTriangle> = {
  alerta: AlertTriangle,
  pausa: CoffeeIcon,
  tendencia: TrendingUp,
  olho: Eye,
  reincidencia: Zap,
  ok: ShieldCheck,
  frota: Users,
  ia: Bot,
};

const ESTILO_INSIGHT: Record<string, { ring: string; chip: string; icon: string }> = {
  low: { ring: "border-risk-low/40 bg-risk-low/5", chip: "bg-risk-low/20 text-risk-low", icon: "text-risk-low" },
  medium: { ring: "border-risk-medium/40 bg-risk-medium/5", chip: "bg-risk-medium/20 text-risk-medium", icon: "text-risk-medium" },
  high: { ring: "border-risk-high/40 bg-risk-high/5", chip: "bg-risk-high/20 text-risk-high", icon: "text-risk-high" },
  critical: { ring: "border-risk-critical/50 bg-risk-critical/10", chip: "bg-risk-critical/20 text-risk-critical", icon: "text-risk-critical" },
};

// ---------------------------------------------------------------------------
// Janela de turnos (filtro geral da tela)
// ---------------------------------------------------------------------------

type Janela = "agora" | "hoje" | "ontem" | "7d" | "30d" | "intervalo";

const JANELAS: { id: Exclude<Janela, "intervalo">; rotulo: string }[] = [
  { id: "agora", rotulo: "Agora" },
  { id: "hoje", rotulo: "Hoje" },
  { id: "ontem", rotulo: "Ontem" },
  { id: "7d", rotulo: "7 dias" },
  { id: "30d", rotulo: "30 dias" },
];

interface Intervalo {
  de: string;
  ate: string;
  rotulo: string;
}

const diaMenos = (dias: number) => diaIso(new Date(Date.now() - dias * 86_400_000));
const br = (dia: string) => dia.split("-").reverse().join("/");

function intervaloDa(janela: Janela, tde: string | null, tate: string | null): Intervalo | null {
  const hoje = diaIso(new Date());
  switch (janela) {
    case "hoje":
      return { de: hoje, ate: hoje, rotulo: "Turnos de hoje" };
    case "ontem":
      return { de: diaMenos(1), ate: diaMenos(1), rotulo: "Turnos de ontem" };
    case "7d":
      return { de: diaMenos(6), ate: hoje, rotulo: "Turnos dos últimos 7 dias" };
    case "30d":
      return { de: diaMenos(29), ate: hoje, rotulo: "Turnos dos últimos 30 dias" };
    case "intervalo":
      return tde ? { de: tde, ate: tate ?? tde, rotulo: `Turnos de ${br(tde)} a ${br(tate ?? tde)}` } : null;
    default:
      return null;
  }
}

function SeletorTurnos({ janela, tde, tate }: { janela: Janela; tde: string | null; tate: string | null }) {
  // Mudar a janela limpa a seleção (o motorista ou o turno podem não existir no
  // novo intervalo); rota, ordem e o filtro que existe nos dois modos ficam.
  const url = useParametros();
  const ir = (valores: Record<string, string | null>) => {
    const filtro = url.get("filtro");
    const destinoAoVivo = !valores.turnos;
    const manter = filtro && (destinoAoVivo ? FILTROS.some((f) => f.id === filtro) : FILTROS_HISTORICO.some((f) => f.id === filtro));
    escreverParametros({ ...valores, turno: null, motorista: null, codigo: null, filtro: manter ? filtro : null }, { historico: true });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <History className="h-4 w-4" /> Turnos
        <Dica texto={DICAS.janelaTurnos} />
      </span>
      <div role="radiogroup" aria-label="Turnos" className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-secondary/40 p-1">
        {JANELAS.map((j) => (
          <button
            key={j.id}
            type="button"
            role="radio"
            aria-checked={janela === j.id}
            onClick={() => ir({ turnos: j.id === "agora" ? null : j.id, tde: null, tate: null })}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              janela === j.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {j.id === "agora" && <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle", janela === "agora" ? "bg-risk-low pulse-dot" : "bg-muted-foreground/60")} />}
            {j.rotulo}
          </button>
        ))}
      </div>
      <SeletorIntervalo
        de={janela === "intervalo" ? (tde ?? undefined) : undefined}
        ate={janela === "intervalo" ? (tate ?? undefined) : undefined}
        maxDias={31}
        textoVazio="Escolher datas"
        className={cn("py-1.5 text-xs", janela === "intervalo" && "border-primary/50 text-primary")}
        aoMudar={(de, ate) => ir({ turnos: "intervalo", tde: de, tate: ate })}
      />
    </div>
  );
}

/**
 * Filtro, ordem, rota, janela de turnos e motorista selecionado vêm da URL
 * (lib/navegacao.tsx): as outras telas abrem esta já filtrada, e o voltar do
 * navegador funciona.
 */
export default function DriversMonitor() {
  const url = useParametros();
  const janelaUrl = url.get("turnos") as Janela | null;
  const janela: Janela = janelaUrl && (janelaUrl === "intervalo" || JANELAS.some((j) => j.id === janelaUrl)) ? janelaUrl : "agora";
  const intervalo = intervaloDa(janela, url.get("tde"), url.get("tate"));

  return (
    <>
      <Filters exportar={false} periodo={false} ao_vivo={!intervalo} antes={<SeletorTurnos janela={intervalo ? janela : "agora"} tde={url.get("tde")} tate={url.get("tate")} />} />
      {intervalo ? <MotoristasHistorico intervalo={intervalo} /> : <MotoristasAoVivo />}
    </>
  );
}

// ===========================================================================
// Agora (ao vivo)
// ===========================================================================

type FiltroLista = "ativos" | "risco" | "alertas" | "ocorrencias" | "todos";

const FILTROS: { id: FiltroLista; rotulo: string; teste: (m: MotoristaAoVivo) => boolean }[] = [
  { id: "ativos", rotulo: "Ao vivo", teste: (m) => m.ativo },
  { id: "risco", rotulo: "Em risco", teste: (m) => m.ativo && (m.risco === "high" || m.risco === "critical") },
  { id: "alertas", rotulo: "Com alertas hoje", teste: (m) => m.alertasHoje > 0 },
  { id: "ocorrencias", rotulo: "Com ocorrência", teste: (m) => m.ocorrencias > 0 },
  { id: "todos", rotulo: "Todos", teste: () => true },
];

/** Mesmas cidades nos dois sentidos (ida e volta são a mesma rota). */
function mesmaRota(rotaMotorista: string | null, filtro: string) {
  if (!rotaMotorista) return false;
  const a = rotaMotorista.split("→").map((c) => c.trim().toLowerCase()).sort().join("|");
  const b = filtro.split("|").map((c) => c.trim().toLowerCase()).sort().join("|");
  return a === b;
}

/** Rota e ordem que vieram de um atalho, com o X para tirar. */
function FiltrosAplicados({ rota, ordem, nota }: { rota: string | null; ordem: string | null; nota?: string | null }) {
  if (!rota && !ordem && !nota) return null;
  const chip = "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/25";
  return (
    <div className="flex flex-wrap gap-1.5 mb-3 text-[11px]">
      {rota && (
        <button type="button" onClick={() => escreverParametros({ rota: null }, { historico: true })} className={chip} title="Tirar o filtro de rota">
          Rota {rota.split("|").join(" ↔ ")} <X className="h-3 w-3" />
        </button>
      )}
      {ordem && (
        <button type="button" onClick={() => escreverParametros({ ordem: null }, { historico: true })} className={chip} title="Voltar à ordem padrão">
          Ordem: {ordem} <X className="h-3 w-3" />
        </button>
      )}
      {nota && <span className="px-2 py-1 text-muted-foreground">{nota}</span>}
    </div>
  );
}

function MotoristasAoVivo() {
  const { query, rotuloPeriodo } = useFiltros();
  const url = useParametros();
  const filtro = (FILTROS.find((f) => f.id === url.get("filtro"))?.id ?? "ativos") as FiltroLista;
  const ordemMedia = url.get("ordem") === "media";
  const rota = url.get("rota");
  const codigo = url.get("codigo");

  const lista = useQuery({ queryKey: ["motoristas-ao-vivo", query], queryFn: () => api.get<MotoristaAoVivo[]>("/motoristas/ao-vivo", query), refetchInterval: 30_000 });
  const todos = lista.data ?? [];
  // ?codigo=DRV-1013 (links dos insights) vira o id do motorista.
  const selecionado = url.get("motorista") ?? (codigo ? todos.find((m) => m.codigo === codigo)?.motoristaId ?? null : null);
  const selecionar = (id: string | null) => escreverParametros({ motorista: id, codigo: null }, { historico: true });

  const visiveis = useMemo(() => {
    const teste = FILTROS.find((f) => f.id === filtro)!.teste;
    const base = todos.filter((m) => teste(m) && (!rota || mesmaRota(m.rota, rota)));
    return ordemMedia ? [...base].sort((a, b) => (b.scoreMedio30d ?? -1) - (a.scoreMedio30d ?? -1)) : base;
  }, [todos, filtro, rota, ordemMedia]);
  const ativos = todos.filter((m) => m.ativo);
  const emRisco = ativos.filter((m) => m.risco === "high" || m.risco === "critical").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <aside className="lg:col-span-3">
        <div className="glass-card rounded-xl p-4 flex flex-col min-h-[600px] max-h-[calc(100vh-220px)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Motoristas
              </h3>
              <p className="text-xs text-muted-foreground">
                {ativos.length} dirigindo agora • {emRisco} em risco
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label="Filtrar motoristas">
            {FILTROS.map((f) => {
              const qtd = todos.filter(f.teste).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filtro === f.id}
                  onClick={() => escreverParametros({ filtro: f.id === "ativos" ? null : f.id }, { historico: true })}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-md border transition",
                    filtro === f.id ? "bg-accent text-accent-foreground border-transparent font-medium" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
                  )}
                >
                  {f.rotulo} <span className="tabular-nums opacity-70">{qtd}</span>
                </button>
              );
            })}
          </div>
          <FiltrosAplicados rota={rota} ordem={ordemMedia ? "fadiga média 30 dias" : null} nota={filtro === "ocorrencias" ? `ocorrências ${rotuloPeriodo.toLowerCase()}` : null} />
          <div className="space-y-2 overflow-auto pr-1 flex-1 min-h-0">
            <Conteudo q={lista} altura={400}>
              {() =>
                visiveis.length === 0 ? (
                  <Vazio>Nenhum motorista neste filtro. Escolha "Todos" para ver a frota inteira.</Vazio>
                ) : (
                  <>
                    {visiveis.map((d) => {
                      const ativo = d.motoristaId === selecionado;
                      return (
                        <button
                          key={d.motoristaId}
                          onClick={() => selecionar(ativo ? null : d.motoristaId)}
                          className={cn("w-full text-left rounded-lg border p-3 transition-all hover:border-primary/40", ANEL_RISCO[d.ativo ? d.risco : "sem_dados"], ativo && "ring-2 ring-primary/60")}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={cn("h-2.5 w-2.5 rounded-full", d.ativo && "pulse-dot", PONTO_RISCO[d.ativo ? d.risco : "sem_dados"])} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-foreground truncate">{d.nome}</p>
                                <span className="text-[10px] font-mono text-muted-foreground">{d.codigo ?? "sem código"}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" /> {d.veiculoCodigo ?? d.tipoVeiculo}
                                </span>
                                <span>•</span>
                                <span>{d.regiao}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">{d.ativo ? <><Clock className="h-3 w-3" /> {num(d.horasTurno, 1)}h</> : relativo(d.ultimaLeituraEm)}</span>
                                {d.ocorrencias > 0 && (
                                  <span className={cn("flex items-center gap-0.5 font-medium", d.ocorrenciasSono ? "text-risk-critical" : "text-muted-foreground")} title="Ocorrências no período">
                                    <ShieldAlert className="h-3 w-3" /> {d.ocorrencias}
                                  </span>
                                )}
                              </div>
                              {ordemMedia && <p className="mt-0.5 text-[11px] text-muted-foreground">média 30 dias: <span className="font-medium text-foreground">{num(d.scoreMedio30d, 1)}</span></p>}
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <span className="text-lg font-bold leading-none">{num(d.score, 0)}</span>
                                {d.ativo && (d.tendencia === "up" || d.tendencia === "down") && (
                                  <Dica
                                    lado="left"
                                    texto={
                                      <>
                                        <b>{d.tendencia === "up" ? "Fadiga subindo" : "Fadiga caindo"}</b>: a última leitura ({num(d.score, 0)}) está{" "}
                                        {d.tendencia === "up" ? "acima" : "abaixo"} da média das 5 leituras anteriores ({num(d.scoreAnterior, 1)}).
                                        <br />
                                        Laranja para cima = piorando; verde para baixo = melhorando. Variação de até 1 ponto não mostra seta.
                                      </>
                                    }
                                  >
                                    {d.tendencia === "up" ? <TrendingUp className="h-3.5 w-3.5 text-risk-high" /> : <TrendingDown className="h-3.5 w-3.5 text-risk-low" />}
                                  </Dica>
                                )}
                              </div>
                              <span className={cn("mt-1 inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border", CHIP_RISCO[d.ativo ? d.risco : "sem_dados"])}>
                                {d.ativo ? ROTULO_RISCO[d.risco] : "fora do turno"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )
              }
            </Conteudo>
          </div>
        </div>
      </aside>

      <section className="lg:col-span-7 space-y-6">{selecionado ? <PainelMotorista id={selecionado} aoLimpar={() => selecionar(null)} /> : <PainelFrota lista={ativos} aoSelecionar={selecionar} />}</section>
    </div>
  );
}

function PainelFrota({ lista, aoSelecionar }: { lista: MotoristaAoVivo[]; aoSelecionar: (id: string) => void }) {
  const media = lista.length ? lista.reduce((a, d) => a + d.score, 0) / lista.length : null;
  const horas = lista.length ? lista.reduce((a, d) => a + (d.horasTurno ?? 0), 0) / lista.length : null;
  const alertas = lista.reduce((a, d) => a + d.alertasHoje, 0);
  const criticos = lista.filter((d) => d.risco === "critical" || d.risco === "high");
  return (
    <>
      <div className="glass-card rounded-xl p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Visão da frota</p>
        <h2 className="text-xl font-bold">Todos os motoristas</h2>
        <p className="text-xs text-muted-foreground">{lista.length} dirigindo agora. Selecione um motorista para ver o turno, os insights e registrar ações.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Score médio" info={DICAS.fadigaMediaAgora} value={num(media, 0)} hint="motoristas dirigindo" icon={Gauge} variant={(media ?? 0) >= 70 ? "risk" : (media ?? 0) >= 50 ? "warning" : "safe"} />
        <KpiCard label="Tempo médio de turno" info={DICAS.tempoDirigindo} value={horas === null ? "—" : `${num(horas, 1)}h`} hint="turnos em andamento" icon={Clock} variant={(horas ?? 0) >= 8 ? "risk" : "default"} />
        <KpiCard label="Alertas hoje" info={DICAS.alertasHoje} value={alertas} hint="motoristas dirigindo" icon={AlertTriangle} variant="warning" />
        <KpiCard label="Em risco" info={DICAS.emRiscoAgora} value={criticos.length} hint={CRITERIO_EM_RISCO} icon={Zap} variant="risk" />
      </div>
      <ChartCard title="Quem precisa de atenção" subtitle="Motoristas com score alto ou turno longo">
        {criticos.length === 0 && lista.every((d) => (d.horasTurno ?? 0) < 6) ? (
          <Vazio icone={<ShieldCheck className="h-5 w-5 text-risk-low" />}>Ninguém em risco agora.</Vazio>
        ) : (
          <ul className="grid md:grid-cols-2 gap-2">
            {[...lista]
              .filter((d) => d.risco === "critical" || d.risco === "high" || (d.horasTurno ?? 0) >= 6)
              .sort((a, b) => b.score - a.score)
              .map((d) => (
                <li
                  key={d.motoristaId}
                  onClick={() => aoSelecionar(d.motoristaId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && aoSelecionar(d.motoristaId)}
                  title="Abrir o painel do motorista"
                  className={cn("clicavel rounded-lg border p-3 text-sm", CHIP_RISCO[d.risco])}
                >
                  <span className="font-medium text-foreground">{d.nome}</span> <span className="font-mono text-xs">{d.codigo}</span>
                  <p className="text-xs text-muted-foreground">
                    score {num(d.score, 0)} • {num(d.horasTurno, 1)}h de turno • {d.alertasHoje} alertas hoje
                  </p>
                </li>
              ))}
          </ul>
        )}
      </ChartCard>
    </>
  );
}

/** Curva de fadiga de um turno (ao vivo ou escolhido no histórico). */
function GraficoCurva({ curva }: { curva: CurvaTurno }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={curva.pontos}>
        <defs>
          <linearGradient id="drvFad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COR.primaria} stopOpacity={0.5} />
            <stop offset="95%" stopColor={COR.primaria} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} />
        <XAxis dataKey="hora" stroke={COR.eixo} fontSize={12} />
        <YAxis stroke={COR.eixo} fontSize={12} domain={[0, 100]} />
        <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(v: number, n: string) => [num(v, 1), n === "fadiga" ? "Motorista" : n === "mediaFrota" ? "Média da frota" : "Máximo"]} />
        <ReferenceLine y={curva.limiteAlerta} stroke={COR.risco} strokeDasharray="4 4" label={{ value: "Limite de alerta", fill: COR.risco, fontSize: 11, position: "right" }} />
        <Area type="monotone" dataKey="fadiga" stroke={COR.primaria} strokeWidth={2.5} fill="url(#drvFad)" connectNulls />
        <Line type="monotone" dataKey="mediaFrota" stroke={COR.neutro} strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CabecalhoMotorista({ d, rotulo, aoLimpar }: { d: MotoristaDetalhe | undefined; rotulo: string; aoLimpar: () => void }) {
  return (
    <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{rotulo}</p>
        <h2 className="text-xl font-bold truncate">{d?.nome ?? "…"}</h2>
        {d && (
          <p className="text-xs text-muted-foreground">
            {d.codigo} • {d.veiculo.codigo ?? d.veiculo.tipo}
            {d.veiculo.placa ? ` (${d.veiculo.placa})` : ""} • {d.regiao}
            {d.idade ? ` • ${d.idade} anos` : ""}
            {d.anosExperiencia !== null ? ` • ${d.anosExperiencia} anos de CNH` : ""}
          </p>
        )}
      </div>
      <button onClick={aoLimpar} className="shrink-0 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary/60">
        Limpar seleção
      </button>
    </div>
  );
}

function ListaOcorrencias({ ocorrencias }: { ocorrencias: MotoristaDetalhe["ocorrencias"] }) {
  return ocorrencias.length === 0 ? (
    <Vazio>Nenhuma ocorrência registrada.</Vazio>
  ) : (
    <ul className="divide-y divide-border">
      {ocorrencias.map((o) => (
        <li key={o.id} className="py-3 flex gap-3">
          <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", o.relacionadoSonolencia ? "text-risk-high" : "text-muted-foreground")} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {o.tipo ?? "Ocorrência"} • {dataHora(o.ocorridoEm)}
              {o.local ? ` • ${o.local}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {[o.relacionadoSonolencia ? "Ligada à sonolência" : "Sem relação com sonolência", o.gravidade ? ROTULO_GRAVIDADE_OCORRENCIA[o.gravidade] : "Sem acidente", o.causa]
                .filter(Boolean)
                .join(" • ")}
            </p>
            {o.descricao && <p className="text-xs text-muted-foreground mt-1 leading-snug">{o.descricao}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function PainelMotorista({ id, aoLimpar }: { id: string; aoLimpar: () => void }) {
  const detalhe = useQuery({ queryKey: ["motorista", id], queryFn: () => api.get<MotoristaDetalhe>(`/motoristas/${id}`), refetchInterval: 30_000 });
  const curva = useQuery({ queryKey: ["curva", id], queryFn: () => api.get<CurvaTurno>(`/motoristas/${id}/curva-turno`), refetchInterval: 60_000 });
  const insights = useQuery({ queryKey: ["insights-motorista", id], queryFn: () => api.get<InsightMotorista[]>(`/motoristas/${id}/insights`), refetchInterval: 60_000 });
  const d = detalhe.data;

  return (
    <>
      <CabecalhoMotorista d={d} rotulo="Motorista selecionado" aoLimpar={aoLimpar} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Score de fadiga" info={DICAS.scoreMotorista}
          value={d?.agora ? num(d.agora.score, 0) : "—"}
          hint={d?.agora ? `última leitura ${relativo(d.agora.ultimaLeituraEm)}` : "sem leitura"}
          icon={Gauge}
          variant={(d?.agora?.score ?? 0) >= 70 ? "risk" : (d?.agora?.score ?? 0) >= 50 ? "warning" : "safe"}
          carregando={detalhe.isLoading}
        />
        <KpiCard
          label="Tempo dirigindo" info={DICAS.tempoDirigindo}
          value={d?.agora?.horasTurno !== undefined && d?.agora?.horasTurno !== null ? `${num(d.agora.horasTurno, 1)}h` : "—"}
          hint={d?.agora?.turnoStatus === "em_andamento" ? "turno em andamento" : "último turno"}
          icon={Clock}
          variant={(d?.agora?.horasTurno ?? 0) >= 8 ? "risk" : "default"}
          carregando={detalhe.isLoading}
        />
        <KpiCard label="Alertas hoje" info={DICAS.alertasHoje} value={d?.agora?.alertasHoje ?? 0} hint={d ? `${d.ultimos30d.alertasGraves} graves em 30 dias` : undefined} icon={AlertTriangle} variant="warning" carregando={detalhe.isLoading} />
        <KpiCard
          label="Média de 30 dias" info={DICAS.media30d}
          value={d ? num(d.ultimos30d.scoreMedio, 1) : "—"}
          hint={d?.ultimos30d.mediaDaFrota !== null && d ? `frota: ${num(d.ultimos30d.mediaDaFrota, 1)} • ${d.ultimos30d.posicaoRisco}º em risco` : undefined}
          icon={Sparkles}
          variant={(d?.ultimos30d.scoreMedio ?? 0) > (d?.ultimos30d.mediaDaFrota ?? 100) ? "risk" : "default"}
          carregando={detalhe.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard
          title="Evolução da fadiga no turno" info={DICAS.curvaTurno}
          subtitle={
            curva.data?.turno
              ? `Turno iniciado ${dataHora(curva.data.turno.iniciadoEm)}${curva.data.turno.origem ? ` • ${curva.data.turno.origem} → ${curva.data.turno.destino}` : ""} • tracejado: média da frota`
              : "Último turno"
          }
          className="xl:col-span-2"
        >
          <Conteudo q={curva} altura={300}>
            {(c) => (!c.turno ? <Vazio>Sem turno com leituras.</Vazio> : <GraficoCurva curva={c} />)}
          </Conteudo>
        </ChartCard>

        <div className="flex flex-col gap-4">
          <ChartCard title="Insights do motorista" info={DICAS.insightsMotorista} subtitle="Regras sobre o estado atual e os últimos 30 dias">
            <Conteudo q={insights} altura={200}>
              {(lista) => (
                <div className="space-y-2.5">
                  {lista.map((ins, i) => {
                    const s = ESTILO_INSIGHT[ins.nivel];
                    const Icone = ICONES[ins.icone] ?? Sparkles;
                    return (
                      <div key={i} className={cn("rounded-xl border p-3 flex gap-3", s.ring)}>
                        <div className={cn("mt-0.5 shrink-0", s.icon)}>
                          <Icone className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold", s.chip)}>{ROTULO_RISCO[ins.nivel]}</span>
                            <p className="text-sm font-medium text-foreground truncate">{ins.titulo}</p>
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">{ins.descricao}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Conteudo>
          </ChartCard>
          {d && <AcoesRapidas motorista={d} />}
        </div>
      </div>

      <ChartCard title="Ocorrências do motorista" info={DICAS.ocorrenciasMotorista} subtitle="Acidentes e ocorrências da própria frota registrados para este motorista">
        {d ? <ListaOcorrencias ocorrencias={d.ocorrencias} /> : null}
      </ChartCard>
    </>
  );
}

const ROTULO_GRAVIDADE_OCORRENCIA: Record<string, string> = {
  sem_vitimas: "Sem vítimas",
  com_feridos: "Com feridos",
  com_fatais: "Com vítimas fatais",
};

function AcoesRapidas({ motorista }: { motorista: MotoristaDetalhe }) {
  const cliente = useQueryClient();
  const [ocorrencia, setOcorrencia] = useState(false);
  const acao = useMutation({
    mutationFn: (tipo: string) => api.post(`/motoristas/${motorista.motoristaId}/acoes`, { tipo, descricao: tipo === "pausa_obrigatoria" ? "Pausa solicitada pela central" : "Contato telefônico com o motorista" }),
    onSuccess: (_, tipo) => {
      toast.success(tipo === "pausa_obrigatoria" ? `Pausa registrada para ${motorista.nome}` : "Contato registrado");
      cliente.invalidateQueries({ queryKey: ["tempo-real"] });
      cliente.invalidateQueries({ queryKey: ["motorista", motorista.motoristaId] });
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });

  const botoes = [
    { tipo: "pausa_obrigatoria", rotulo: "Solicitar pausa", icone: CoffeeIcon, cls: "border-risk-medium/50 bg-risk-medium/15 text-risk-medium hover:bg-risk-medium/25" },
    { tipo: "contato_telefonico", rotulo: "Registrar contato", icone: Phone, cls: "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20" },
  ];

  return (
    <ChartCard title="Ações rápidas" info={DICAS.acoesRapidas} subtitle="O alerta sonoro já tocou na cabine; aqui fica a resposta da central">
      <div className="grid grid-cols-1 gap-2">
        {botoes.map((b) => (
          <button
            key={b.tipo}
            disabled={acao.isPending}
            onClick={() => acao.mutate(b.tipo)}
            className={cn("group w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-60", b.cls)}
          >
            <span className="flex items-center gap-2.5">
              {acao.isPending && acao.variables === b.tipo ? <Loader2 className="h-4 w-4 animate-spin" /> : <b.icone className="h-4 w-4" />}
              {b.rotulo}
            </span>
            <span className="text-[10px] uppercase tracking-wider opacity-60 group-hover:opacity-100">{motorista.codigo}</span>
          </button>
        ))}
        <button
          onClick={() => setOcorrencia(true)}
          className="group w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
        >
          <span className="flex items-center gap-2.5">
            <FileText className="h-4 w-4" /> Registrar ocorrência
          </span>
          <span className="text-[10px] uppercase tracking-wider opacity-60 group-hover:opacity-100">{motorista.codigo}</span>
        </button>
      </div>
      <DialogOcorrencia aberto={ocorrencia} aoFechar={() => setOcorrencia(false)} motorista={motorista} />
    </ChartCard>
  );
}

function DialogOcorrencia({ aberto, aoFechar, motorista }: { aberto: boolean; aoFechar: () => void; motorista: MotoristaDetalhe }) {
  const [descricao, setDescricao] = useState("");
  const [gravidade, setGravidade] = useState("");
  const [sono, setSono] = useState(false);
  const cliente = useQueryClient();
  const salvar = useMutation({
    mutationFn: () => api.post(`/motoristas/${motorista.motoristaId}/ocorrencias`, { descricao, gravidade: gravidade || undefined, relacionadoSonolencia: sono }),
    onSuccess: () => {
      toast.success("Ocorrência registrada");
      // A ocorrência aparece no card do motorista e pode virar insight.
      cliente.invalidateQueries({ queryKey: ["motorista", motorista.motoristaId] });
      cliente.invalidateQueries({ queryKey: ["insights-motorista", motorista.motoristaId] });
      setDescricao("");
      setGravidade("");
      setSono(false);
      aoFechar();
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });
  const campo = "w-full bg-secondary/60 border border-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50";
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar ocorrência — {motorista.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <textarea className={cn(campo, "min-h-24")} placeholder="O que aconteceu?" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <Selecao
            valor={gravidade}
            aoMudar={setGravidade}
            rotulo="Gravidade"
            opcoes={[
              { valor: "", rotulo: "Sem acidente", detalhe: "quase acidente ou ocorrência sem vítimas" },
              { valor: "sem_vitimas", rotulo: "Acidente sem vítimas" },
              { valor: "com_feridos", rotulo: "Acidente com feridos" },
              { valor: "com_fatais", rotulo: "Acidente com vítimas fatais" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sono} onChange={(e) => setSono(e.target.checked)} /> Relacionada a sonolência
          </label>
        </div>
        <DialogFooter>
          <button onClick={aoFechar} className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-secondary/60">
            Cancelar
          </button>
          <button
            onClick={() => salvar.mutate()}
            disabled={descricao.trim().length < 3 || salvar.isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {salvar.isPending ? "Salvando…" : "Registrar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Turnos anteriores (Hoje, Ontem, 7 dias, 30 dias, datas)
// ===========================================================================

type FiltroHistorico = "todos" | "risco" | "alertas" | "ocorrencias";

const FILTROS_HISTORICO: { id: FiltroHistorico; rotulo: string; teste: (m: MotoristaHistorico) => boolean }[] = [
  { id: "todos", rotulo: "Todos", teste: () => true },
  { id: "risco", rotulo: "Chegaram ao risco", teste: (m) => (m.scoreMaximo ?? 0) >= 70 },
  { id: "alertas", rotulo: "Com alertas", teste: (m) => m.alertas > 0 },
  { id: "ocorrencias", rotulo: "Com ocorrência", teste: (m) => m.ocorrencias > 0 },
];

/** Região e tipo de veículo do filtro global; o intervalo é o da janela de turnos. */
function useQueryIntervalo(intervalo: Intervalo): Query {
  const { query } = useFiltros();
  const { periodo: _p, de: _d, ate: _a, ...dimensoes } = query;
  return { ...dimensoes, de: intervalo.de, ate: intervalo.ate };
}

function MotoristasHistorico({ intervalo }: { intervalo: Intervalo }) {
  const url = useParametros();
  const q = useQueryIntervalo(intervalo);
  const filtro = (FILTROS_HISTORICO.find((f) => f.id === url.get("filtro"))?.id ?? "todos") as FiltroHistorico;
  const ordemMedia = url.get("ordem") === "media";
  const rota = url.get("rota");
  const lista = useQuery({ queryKey: ["motoristas-historico", q], queryFn: () => api.get<MotoristaHistorico[]>("/motoristas/historico", q) });
  // A rota (atalho da visão gerencial) vale para a lista e para as contagens dos filtros.
  const todos = useMemo(() => (lista.data ?? []).filter((m) => !rota || m.rotas.some((r) => mesmaRota(r, rota))), [lista.data, rota]);
  const visiveis = useMemo(() => {
    const base = todos.filter(FILTROS_HISTORICO.find((f) => f.id === filtro)!.teste);
    return ordemMedia ? [...base].sort((a, b) => (b.scoreMedio ?? -1) - (a.scoreMedio ?? -1)) : base;
  }, [todos, filtro, ordemMedia]);
  const selecionado = url.get("motorista");
  const selecionar = (id: string | null) => escreverParametros({ motorista: id, turno: null, codigo: null }, { historico: true });
  const horas = todos.reduce((a, m) => a + (m.horas ?? 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <aside className="lg:col-span-3">
        <div className="glass-card rounded-xl p-4 flex flex-col min-h-[600px] max-h-[calc(100vh-220px)]">
          <div className="mb-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" /> {intervalo.rotulo}
            </h3>
            <p className="text-xs text-muted-foreground">
              {todos.length} motoristas • {todos.reduce((a, m) => a + m.turnos, 0)} turnos • {num(horas, 0)} h ao volante
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label="Filtrar motoristas">
            {FILTROS_HISTORICO.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => escreverParametros({ filtro: f.id === "todos" ? null : f.id }, { historico: true })}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition",
                  filtro === f.id ? "bg-accent text-accent-foreground border-transparent font-medium" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
                )}
              >
                {f.rotulo} <span className="tabular-nums opacity-70">{todos.filter(f.teste).length}</span>
              </button>
            ))}
          </div>
          <FiltrosAplicados rota={rota} ordem={ordemMedia ? "fadiga média no intervalo" : null} />
          <div className="space-y-2 overflow-auto pr-1 flex-1 min-h-0">
            <Conteudo q={lista} altura={400}>
              {() =>
                visiveis.length === 0 ? (
                  <Vazio>Nenhum turno neste intervalo e filtro.</Vazio>
                ) : (
                  <>
                    {visiveis.map((m) => {
                      const ativo = m.motoristaId === selecionado;
                      return (
                        <button
                          key={m.motoristaId}
                          onClick={() => selecionar(ativo ? null : m.motoristaId)}
                          className={cn("w-full text-left rounded-lg border p-3 transition-all hover:border-primary/40", ANEL_RISCO[m.risco], ativo && "ring-2 ring-primary/60")}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={cn("h-2.5 w-2.5 rounded-full", PONTO_RISCO[m.risco])} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-foreground truncate">{m.nome}</p>
                                <span className="text-[10px] font-mono text-muted-foreground">{m.codigo ?? "sem código"}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" /> {m.veiculoCodigo ?? m.tipoVeiculo}
                                </span>
                                <span>•</span>
                                <span>
                                  {m.turnos} {m.turnos === 1 ? "turno" : "turnos"} • {num(m.horas, 1)}h
                                </span>
                                {m.alertas > 0 && (
                                  <span className={cn("flex items-center gap-0.5", m.alertasGraves ? "text-risk-high font-medium" : "")}>
                                    <AlertTriangle className="h-3 w-3" /> {m.alertas}
                                  </span>
                                )}
                                {m.ocorrencias > 0 && (
                                  <span className="flex items-center gap-0.5 font-medium text-risk-critical">
                                    <ShieldAlert className="h-3 w-3" /> {m.ocorrencias}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold leading-none" title="Pico de fadiga no intervalo">
                                {num(m.scoreMaximo, 0)}
                              </span>
                              <p className="text-[10px] text-muted-foreground">média {num(m.scoreMedio, 0)}</p>
                              <span className={cn("mt-0.5 inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border", CHIP_RISCO[m.risco])}>{ROTULO_RISCO[m.risco]}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )
              }
            </Conteudo>
          </div>
        </div>
      </aside>
      <section className="lg:col-span-7 space-y-6">
        {selecionado ? (
          <PainelHistoricoMotorista id={selecionado} intervalo={intervalo} resumo={todos.find((m) => m.motoristaId === selecionado)} aoLimpar={() => selecionar(null)} />
        ) : (
          <PainelHistoricoFrota lista={todos} intervalo={intervalo} carregando={lista.isLoading} aoSelecionar={selecionar} />
        )}
      </section>
    </div>
  );
}

function PainelHistoricoFrota({ lista, intervalo, carregando, aoSelecionar }: { lista: MotoristaHistorico[]; intervalo: Intervalo; carregando: boolean; aoSelecionar: (id: string) => void }) {
  const horas = lista.reduce((a, m) => a + (m.horas ?? 0), 0);
  const alertas = lista.reduce((a, m) => a + m.alertas, 0);
  const graves = lista.reduce((a, m) => a + m.alertasGraves, 0);
  const comMedia = lista.filter((m) => m.scoreMedio !== null && m.horas);
  const media = comMedia.length ? comMedia.reduce((a, m) => a + m.scoreMedio! * m.horas!, 0) / comMedia.reduce((a, m) => a + m.horas!, 0) : null;
  const emRisco = lista.filter((m) => (m.scoreMaximo ?? 0) >= 70);
  return (
    <>
      <div className="glass-card rounded-xl p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Visão da frota</p>
        <h2 className="text-xl font-bold">{intervalo.rotulo}</h2>
        <p className="text-xs text-muted-foreground">Selecione um motorista para ver os turnos dele e a curva de fadiga de cada um.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Score médio" info={DICAS.mediaPeriodo} value={num(media, 0)} hint="todas as leituras do intervalo" icon={Gauge} variant={(media ?? 0) >= 70 ? "risk" : (media ?? 0) >= 50 ? "warning" : "safe"} carregando={carregando} />
        <KpiCard label="Horas ao volante" info={DICAS.horasPeriodo} value={`${num(horas, 0)}h`} hint={`${lista.reduce((a, m) => a + m.turnos, 0)} turnos`} icon={Clock} carregando={carregando} />
        <KpiCard label="Alertas" info={DICAS.alertasPeriodo} value={num(alertas)} hint={`${num(graves)} graves`} icon={AlertTriangle} variant="warning" carregando={carregando} />
        <KpiCard label="Chegaram ao risco" info={DICAS.picoFadiga} value={emRisco.length} hint="pico de fadiga ≥ 70" icon={Zap} variant="risk" carregando={carregando} />
      </div>
      <ChartCard title="Maiores picos de fadiga" subtitle="Quem chegou mais perto do limite no intervalo">
        {emRisco.length === 0 ? (
          <Vazio icone={<ShieldCheck className="h-5 w-5 text-risk-low" />}>Ninguém chegou ao risco neste intervalo.</Vazio>
        ) : (
          <ul className="grid md:grid-cols-2 gap-2">
            {[...emRisco]
              .sort((a, b) => (b.scoreMaximo ?? 0) - (a.scoreMaximo ?? 0))
              .slice(0, 10)
              .map((m) => (
                <li
                  key={m.motoristaId}
                  onClick={() => aoSelecionar(m.motoristaId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && aoSelecionar(m.motoristaId)}
                  title="Ver os turnos do motorista"
                  className={cn("clicavel rounded-lg border p-3 text-sm", CHIP_RISCO[m.risco])}
                >
                  <span className="font-medium text-foreground">{m.nome}</span> <span className="font-mono text-xs">{m.codigo}</span>
                  <p className="text-xs text-muted-foreground">
                    pico {num(m.scoreMaximo, 0)} • média {num(m.scoreMedio, 0)} • {m.turnos} turnos • {m.alertas} alertas
                  </p>
                </li>
              ))}
          </ul>
        )}
      </ChartCard>
    </>
  );
}

function PainelHistoricoMotorista({ id, intervalo, resumo, aoLimpar }: { id: string; intervalo: Intervalo; resumo?: MotoristaHistorico; aoLimpar: () => void }) {
  const url = useParametros();
  const q = useQueryIntervalo(intervalo);
  const detalhe = useQuery({ queryKey: ["motorista", id], queryFn: () => api.get<MotoristaDetalhe>(`/motoristas/${id}`) });
  const turnos = useQuery({ queryKey: ["turnos-motorista", id, q.de, q.ate], queryFn: () => api.get<TurnoResumo[]>(`/motoristas/${id}/turnos`, { de: q.de, ate: q.ate }) });
  const lista = turnos.data ?? [];
  const turnoId = url.get("turno") ?? lista[0]?.turnoId ?? null;
  const turno = lista.find((t) => t.turnoId === turnoId);
  const curva = useQuery({
    queryKey: ["curva", id, turnoId],
    queryFn: () => api.get<CurvaTurno>(`/motoristas/${id}/curva-turno`, { turno_id: turnoId! }),
    enabled: !!turnoId,
  });
  const d = detalhe.data;
  const ocorrencias = (d?.ocorrencias ?? []).filter((o) => {
    const dia = diaIso(new Date(o.ocorridoEm));
    return dia >= intervalo.de && dia <= intervalo.ate;
  });
  const escolher = (t: string) => escreverParametros({ turno: t }, { historico: false });

  return (
    <>
      <CabecalhoMotorista d={d} rotulo={intervalo.rotulo} aoLimpar={aoLimpar} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Pico de fadiga" info={DICAS.picoFadiga} value={num(resumo?.scoreMaximo, 0)} hint={resumo ? ROTULO_RISCO[resumo.risco] : undefined} icon={Gauge} variant={(resumo?.scoreMaximo ?? 0) >= 70 ? "risk" : (resumo?.scoreMaximo ?? 0) >= 40 ? "warning" : "safe"} carregando={!resumo && turnos.isLoading} />
        <KpiCard label="Score médio" info={DICAS.mediaPeriodo} value={num(resumo?.scoreMedio, 1)} hint={d ? `30 dias: ${num(d.ultimos30d.scoreMedio, 1)}` : undefined} icon={Sparkles} carregando={!resumo && turnos.isLoading} />
        <KpiCard label="Horas ao volante" info={DICAS.horasPeriodo} value={resumo ? `${num(resumo.horas, 1)}h` : "—"} hint={resumo ? `${resumo.turnos} ${resumo.turnos === 1 ? "turno" : "turnos"}` : undefined} icon={Clock} carregando={!resumo && turnos.isLoading} />
        <KpiCard label="Alertas" info={DICAS.alertasPeriodo} value={resumo?.alertas ?? 0} hint={resumo ? `${resumo.alertasGraves} graves` : undefined} icon={AlertTriangle} variant="warning" carregando={!resumo && turnos.isLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <ChartCard title="Turnos" info={DICAS.turnosPeriodo} subtitle={`${lista.length} no intervalo`} className="xl:col-span-2">
          <Conteudo q={turnos} altura={300}>
            {() =>
              lista.length === 0 ? (
                <Vazio>Sem turnos neste intervalo.</Vazio>
              ) : (
                <ul className="space-y-1.5 max-h-[340px] overflow-auto pr-1" role="listbox" aria-label="Turnos do motorista">
                  {lista.map((t) => (
                    <li key={t.turnoId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={t.turnoId === turnoId}
                        onClick={() => escolher(t.turnoId)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left text-xs transition hover:border-primary/40",
                          t.turnoId === turnoId ? "border-primary/60 bg-primary/10" : "border-border",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground text-sm">{dataHora(t.iniciadoEm)}</span>
                          <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border", CHIP_RISCO[t.risco])}>pico {num(t.scoreMaximo, 0)}</span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground">
                          {num(t.horas, 1)}h{t.origem ? ` • ${t.origem} → ${t.destino}` : ""} • média {num(t.scoreMedio, 0)}
                          {t.alertas > 0 ? ` • ${t.alertas} alertas` : ""}
                          {t.status === "em_andamento" ? " • em andamento" : ""}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            }
          </Conteudo>
        </ChartCard>
        <ChartCard
          title="Evolução da fadiga no turno"
          info={DICAS.curvaTurno}
          subtitle={turno ? `Turno de ${dataHora(turno.iniciadoEm)}${turno.origem ? ` • ${turno.origem} → ${turno.destino}` : ""} • tracejado: média da frota` : "Escolha um turno"}
          className="xl:col-span-3"
        >
          {!turnoId ? (
            <Vazio>Sem turno para mostrar.</Vazio>
          ) : (
            <Conteudo q={curva} altura={300}>
              {(c) => (!c.turno ? <Vazio>Este turno não tem leituras.</Vazio> : <GraficoCurva curva={c} />)}
            </Conteudo>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Ocorrências no intervalo" info={DICAS.ocorrenciasMotorista} subtitle="Acidentes e ocorrências da própria frota registrados para este motorista">
        {d ? <ListaOcorrencias ocorrencias={ocorrencias} /> : null}
      </ChartCard>
    </>
  );
}
