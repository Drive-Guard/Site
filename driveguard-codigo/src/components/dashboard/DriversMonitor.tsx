/**
 * Aba Motoristas: lista ao vivo, painel do motorista selecionado (ou da frota),
 * curva do turno, insights e ações rápidas.
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
  Clock,
  CoffeeIcon,
  Eye,
  FileText,
  Gauge,
  Loader2,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, mensagemDeErro } from "@/lib/api";
import { useFiltros } from "@/lib/filtros";
import { dataHora, num, relativo } from "@/lib/formato";
import { ANEL_RISCO, CHIP_RISCO, COR, ESTILO_TOOLTIP, PONTO_RISCO, ROTULO_RISCO } from "@/lib/risco";
import type { CurvaTurno, InsightMotorista, MotoristaAoVivo, MotoristaDetalhe } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { Filters } from "./Filters";
import { KpiCard } from "./KpiCard";

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

export default function DriversMonitor() {
  const { query } = useFiltros();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [somenteAtivos, setSomenteAtivos] = useState(true);

  const lista = useQuery({ queryKey: ["motoristas-ao-vivo", query], queryFn: () => api.get<MotoristaAoVivo[]>("/motoristas/ao-vivo", query), refetchInterval: 30_000 });
  const visiveis = useMemo(() => (lista.data ?? []).filter((m) => !somenteAtivos || m.ativo), [lista.data, somenteAtivos]);
  const ativos = (lista.data ?? []).filter((m) => m.ativo);
  const emRisco = ativos.filter((m) => m.risco === "high" || m.risco === "critical").length;

  return (
    <>
      <Filters exportar={false} />
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <aside className="lg:col-span-3">
          <div className="glass-card rounded-2xl p-4 flex flex-col min-h-[600px] max-h-[calc(100vh-220px)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Motoristas
                </h3>
                <p className="text-xs text-muted-foreground">
                  {ativos.length} dirigindo agora • {emRisco} em risco
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={somenteAtivos} onChange={(e) => setSomenteAtivos(e.target.checked)} className="accent-[oklch(0.72_0.18_220)]" />
                só ao vivo
              </label>
            </div>
            <div className="space-y-2 overflow-auto pr-1 flex-1 min-h-0">
              <Conteudo q={lista} altura={400}>
                {() =>
                  visiveis.length === 0 ? (
                    <Vazio>Nenhum motorista dirigindo agora. Desmarque "só ao vivo" para ver todos.</Vazio>
                  ) : (
                    <>
                      {visiveis.map((d) => {
                        const ativo = d.motoristaId === selecionado;
                        return (
                          <button
                            key={d.motoristaId}
                            onClick={() => setSelecionado(ativo ? null : d.motoristaId)}
                            className={cn("w-full text-left rounded-xl border p-3 transition-all", ANEL_RISCO[d.ativo ? d.risco : "sem_dados"], ativo && "ring-2 ring-primary/60", d.risco === "critical" && d.ativo && "glow-primary")}
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
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  <span className="text-lg font-bold leading-none">{num(d.score, 0)}</span>
                                  {d.ativo && (d.tendencia === "up" ? <TrendingUp className="h-3.5 w-3.5 text-risk-high" /> : d.tendencia === "down" ? <TrendingDown className="h-3.5 w-3.5 text-risk-low" /> : null)}
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

        <section className="lg:col-span-7 space-y-6">{selecionado ? <PainelMotorista id={selecionado} aoLimpar={() => setSelecionado(null)} /> : <PainelFrota lista={ativos} />}</section>
      </div>
    </>
  );
}

function PainelFrota({ lista }: { lista: MotoristaAoVivo[] }) {
  const media = lista.length ? lista.reduce((a, d) => a + d.score, 0) / lista.length : null;
  const horas = lista.length ? lista.reduce((a, d) => a + (d.horasTurno ?? 0), 0) / lista.length : null;
  const alertas = lista.reduce((a, d) => a + d.alertasHoje, 0);
  const criticos = lista.filter((d) => d.risco === "critical" || d.risco === "high");
  return (
    <>
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Visão da frota</p>
        <h2 className="text-xl font-bold">Todos os motoristas</h2>
        <p className="text-xs text-muted-foreground">{lista.length} dirigindo agora. Selecione um motorista para ver o turno, os insights e registrar ações.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Score médio" value={num(media, 0)} hint="motoristas dirigindo" icon={Gauge} variant={(media ?? 0) >= 70 ? "risk" : (media ?? 0) >= 50 ? "warning" : "safe"} />
        <KpiCard label="Tempo médio de turno" value={horas === null ? "—" : `${num(horas, 1)}h`} hint="turnos em andamento" icon={Clock} variant={(horas ?? 0) >= 8 ? "risk" : "default"} />
        <KpiCard label="Alertas hoje" value={alertas} hint="motoristas dirigindo" icon={AlertTriangle} variant="warning" />
        <KpiCard label="Em risco" value={criticos.length} hint="score ≥ 60" icon={Zap} variant="risk" />
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
                <li key={d.motoristaId} className={cn("rounded-xl border p-3 text-sm", CHIP_RISCO[d.risco])}>
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

function PainelMotorista({ id, aoLimpar }: { id: string; aoLimpar: () => void }) {
  const detalhe = useQuery({ queryKey: ["motorista", id], queryFn: () => api.get<MotoristaDetalhe>(`/motoristas/${id}`), refetchInterval: 30_000 });
  const curva = useQuery({ queryKey: ["curva", id], queryFn: () => api.get<CurvaTurno>(`/motoristas/${id}/curva-turno`), refetchInterval: 60_000 });
  const insights = useQuery({ queryKey: ["insights-motorista", id], queryFn: () => api.get<InsightMotorista[]>(`/motoristas/${id}/insights`), refetchInterval: 60_000 });
  const d = detalhe.data;

  return (
    <>
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Motorista selecionado</p>
          <h2 className="text-xl font-bold">{d?.nome ?? "…"}</h2>
          {d && (
            <p className="text-xs text-muted-foreground">
              {d.codigo} • {d.veiculo.codigo ?? d.veiculo.tipo}
              {d.veiculo.placa ? ` (${d.veiculo.placa})` : ""} • {d.regiao}
              {d.idade ? ` • ${d.idade} anos` : ""}
              {d.anosExperiencia !== null ? ` • ${d.anosExperiencia} anos de CNH` : ""}
            </p>
          )}
        </div>
        <button onClick={aoLimpar} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary/60">
          Limpar seleção
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Score de fadiga"
          value={d?.agora ? num(d.agora.score, 0) : "—"}
          hint={d?.agora ? `última leitura ${relativo(d.agora.ultimaLeituraEm)}` : "sem leitura"}
          icon={Gauge}
          variant={(d?.agora?.score ?? 0) >= 70 ? "risk" : (d?.agora?.score ?? 0) >= 50 ? "warning" : "safe"}
          carregando={detalhe.isLoading}
        />
        <KpiCard
          label="Tempo dirigindo"
          value={d?.agora?.horasTurno !== undefined && d?.agora?.horasTurno !== null ? `${num(d.agora.horasTurno, 1)}h` : "—"}
          hint={d?.agora?.turnoStatus === "em_andamento" ? "turno em andamento" : "último turno"}
          icon={Clock}
          variant={(d?.agora?.horasTurno ?? 0) >= 8 ? "risk" : "default"}
          carregando={detalhe.isLoading}
        />
        <KpiCard label="Alertas hoje" value={d?.agora?.alertasHoje ?? 0} hint={d ? `${d.ultimos30d.alertasGraves} graves em 30 dias` : undefined} icon={AlertTriangle} variant="warning" carregando={detalhe.isLoading} />
        <KpiCard
          label="Média de 30 dias"
          value={d ? num(d.ultimos30d.scoreMedio, 1) : "—"}
          hint={d?.ultimos30d.mediaDaFrota !== null && d ? `frota: ${num(d.ultimos30d.mediaDaFrota, 1)} • ${d.ultimos30d.posicaoRisco}º em risco` : undefined}
          icon={Sparkles}
          variant={(d?.ultimos30d.scoreMedio ?? 0) > (d?.ultimos30d.mediaDaFrota ?? 100) ? "risk" : "default"}
          carregando={detalhe.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard
          title="Evolução da fadiga no turno"
          subtitle={
            curva.data?.turno
              ? `Turno iniciado ${dataHora(curva.data.turno.iniciadoEm)}${curva.data.turno.origem ? ` • ${curva.data.turno.origem} → ${curva.data.turno.destino}` : ""} • tracejado: média da frota`
              : "Último turno"
          }
          className="xl:col-span-2"
        >
          <Conteudo q={curva} altura={300}>
            {(c) =>
              !c.turno ? (
                <Vazio>Sem turno com leituras.</Vazio>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={c.pontos}>
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
                    <ReferenceLine y={c.limiteAlerta} stroke={COR.risco} strokeDasharray="4 4" label={{ value: "Limite de alerta", fill: COR.risco, fontSize: 11, position: "right" }} />
                    <Area type="monotone" dataKey="fadiga" stroke={COR.primaria} strokeWidth={2.5} fill="url(#drvFad)" connectNulls />
                    <Line type="monotone" dataKey="mediaFrota" stroke="oklch(0.85 0.02 255)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              )
            }
          </Conteudo>
        </ChartCard>

        <div className="flex flex-col gap-4">
          <ChartCard title="Insights do motorista" subtitle="Regras sobre o estado atual e os últimos 30 dias">
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
    </>
  );
}

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
    <ChartCard title="Ações rápidas" subtitle="O alerta sonoro já tocou na cabine; aqui fica a resposta da central">
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
  const salvar = useMutation({
    mutationFn: () => api.post(`/motoristas/${motorista.motoristaId}/ocorrencias`, { descricao, gravidade: gravidade || undefined, relacionadoSonolencia: sono }),
    onSuccess: () => {
      toast.success("Ocorrência registrada");
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
          <select className={campo} value={gravidade} onChange={(e) => setGravidade(e.target.value)}>
            <option value="">Gravidade (se houve acidente)</option>
            <option value="sem_vitimas">Sem vítimas</option>
            <option value="com_feridos">Com feridos</option>
            <option value="com_fatais">Com vítimas fatais</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sono} onChange={(e) => setSono(e.target.checked)} /> Relacionada a sonolência
          </label>
        </div>
        <DialogFooter>
          <button onClick={aoFechar} className="px-3 py-2 text-sm rounded-lg border border-border">
            Cancelar
          </button>
          <button
            onClick={() => salvar.mutate()}
            disabled={descricao.trim().length < 3 || salvar.isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-60"
          >
            {salvar.isPending ? "Salvando…" : "Registrar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
