/**
 * Aba Relatórios (admin e gestor): resumo do período com filtros próprios,
 * geração de relatórios (PDF, Excel, CSV), histórico e agendamentos.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Calendar,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Save,
  Trash2,
  Truck,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { REGIOES, TIPOS_VEICULO } from "@/components/dashboard/Filters";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { SeletorIntervalo } from "@/components/comum/SeletorIntervalo";
import { abrirDownload, api, mensagemDeErro, type Query } from "@/lib/api";
import { dataHora, num, reais } from "@/lib/formato";
import { COR, ESTILO_TOOLTIP } from "@/lib/risco";
import type { Agendamento, RelatorioGerado, ResumoRelatorio, VeiculoCadastro } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const selectClass =
  "bg-secondary/60 border border-border text-sm rounded-lg pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none w-full";

function Campo({ icone: Icone, children }: { icone: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      {children}
    </div>
  );
}

const TIPOS = [
  { tipo: "executivo", titulo: "Relatório Executivo", desc: "Resumo para gestores, com ROI e base da PRF.", icone: FileText, formato: "pdf", acento: "from-primary/30 to-primary/5 text-primary" },
  { tipo: "operacional", titulo: "Relatório Operacional", desc: "Dia a dia, turnos e alertas por tipo.", icone: FileSpreadsheet, formato: "xlsx", acento: "from-risk-low/30 to-risk-low/5 text-risk-low" },
  { tipo: "motoristas", titulo: "Relatório de Motoristas", desc: "Indicadores individuais (30 dias).", icone: Users, formato: "pdf", acento: "from-risk-medium/30 to-risk-medium/5 text-risk-medium" },
  { tipo: "frota", titulo: "Relatório da Frota", desc: "Veículos, câmeras e cobertura.", icone: Truck, formato: "pdf", acento: "from-primary/30 to-primary/5 text-primary" },
  { tipo: "alertas", titulo: "Histórico de Alertas", desc: "Todos os alertas do período.", icone: Activity, formato: "csv", acento: "from-risk-high/30 to-risk-high/5 text-risk-high" },
] as const;

const ROTULO_FORMATO: Record<string, string> = { pdf: "PDF", xlsx: "Excel", csv: "CSV" };
const ROTULO_TIPO: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.tipo, t.titulo]));
const CORES_BARRAS = [COR.risco, "oklch(0.72 0.18 40)", COR.primaria, COR.amarelo, COR.ciano, COR.roxo, COR.verde, COR.eixo];
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface FiltrosRelatorio {
  periodo: string;
  de?: string;
  ate?: string;
  regiao: string;
  risco: string;
  veiculo_id: string;
  tipo_veiculo: string;
  faixa_horaria: string;
}

function paraQuery(f: FiltrosRelatorio): Query {
  const q: Query = f.periodo === "personalizado" && f.de ? { de: f.de, ate: f.ate ?? f.de } : { periodo: f.periodo === "personalizado" ? "30d" : f.periodo };
  for (const k of ["regiao", "risco", "veiculo_id", "tipo_veiculo", "faixa_horaria"] as const) if (f[k]) q[k] = f[k];
  return q;
}

export default function ReportsCenter() {
  const [f, setF] = useState<FiltrosRelatorio>({ periodo: "30d", regiao: "", risco: "", veiculo_id: "", tipo_veiculo: "", faixa_horaria: "" });
  const definir = (p: Partial<FiltrosRelatorio>) => setF((x) => ({ ...x, ...p }));
  const query = useMemo(() => paraQuery(f), [f]);
  const cliente = useQueryClient();

  const resumo = useQuery({ queryKey: ["relatorio-resumo", query], queryFn: () => api.get<ResumoRelatorio>("/relatorios/resumo", query) });
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: () => api.get<VeiculoCadastro[]>("/cadastros/veiculos"), staleTime: 5 * 60_000 });

  const gerar = useMutation({
    mutationFn: (p: { tipo: string; formato: string; destinatarios?: string[] }) =>
      api.post<{ id: string; url: string; nomeArquivo: string; envio: string }>("/relatorios", { ...p, filtros: query }),
    onSuccess: (r) => {
      abrirDownload(r.url);
      toast.success(`${r.nomeArquivo} gerado`);
      cliente.invalidateQueries({ queryKey: ["relatorios"] });
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });

  // Link do e-mail: ?aba=relatorios&relatorio=<id> baixa o arquivo.
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("relatorio");
    if (!id) return;
    url.searchParams.delete("relatorio");
    window.history.replaceState(null, "", url);
    api
      .get<{ url: string }>(`/relatorios/${id}/download`)
      .then((r) => abrirDownload(r.url))
      .catch((e) => toast.error(mensagemDeErro(e)));
  }, []);

  const r = resumo.data;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Filtros do relatório</h2>
            {r && <span className="text-xs text-muted-foreground">• {r.filtros}</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Campo icone={Calendar}>
            <select className={selectClass} value={f.periodo} onChange={(e) => definir({ periodo: e.target.value })}>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="ano">Este ano</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </Campo>
          <Campo icone={MapPin}>
            <select className={selectClass} value={f.regiao} onChange={(e) => definir({ regiao: e.target.value })}>
              <option value="">Todas as regiões</option>
              {REGIOES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Campo>
          <Campo icone={User}>
            <select className={selectClass} value={f.risco} onChange={(e) => definir({ risco: e.target.value })}>
              <option value="">Todos os motoristas</option>
              <option value="critico">Risco crítico</option>
              <option value="alto">Risco alto</option>
              <option value="medio">Risco médio</option>
              <option value="baixo">Risco baixo</option>
            </select>
          </Campo>
          <Campo icone={Truck}>
            <select className={selectClass} value={f.veiculo_id} onChange={(e) => definir({ veiculo_id: e.target.value })}>
              <option value="">Todos os veículos</option>
              {(veiculos.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.cameraCodigo ?? "sem câmera"} • {v.placa}
                </option>
              ))}
            </select>
          </Campo>
          <Campo icone={Car}>
            <select className={selectClass} value={f.tipo_veiculo} onChange={(e) => definir({ tipo_veiculo: e.target.value })}>
              <option value="">Todas as categorias</option>
              {TIPOS_VEICULO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo icone={Clock}>
            <select className={selectClass} value={f.faixa_horaria} onChange={(e) => definir({ faixa_horaria: e.target.value })}>
              <option value="">Todos os horários</option>
              <option value="madrugada">Madrugada (0h–6h)</option>
              <option value="manha">Manhã (6h–12h)</option>
              <option value="tarde">Tarde (12h–18h)</option>
              <option value="noite">Noite (18h–0h)</option>
            </select>
          </Campo>
        </div>
        {f.periodo === "personalizado" && (
          <div className="mt-3">
            <SeletorIntervalo de={f.de} ate={f.ate} maxDias={400} aoMudar={(de, ate) => definir({ de, ate })} />
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Alertas registrados" value={r ? num(r.kpis.eventos) : "—"} hint={r ? `${num(r.kpis.alertasGraves)} graves • ${num(r.kpis.alertasAtendidos)} atendidos` : undefined} trend={r?.kpis.variacaoEventos} icon={Activity} variant="risk" carregando={resumo.isLoading} />
        <KpiCard label="Motoristas analisados" value={r ? num(r.kpis.motoristasAnalisados) : "—"} hint={r ? `${num(r.kpis.turnos)} turnos` : undefined} icon={Users} carregando={resumo.isLoading} />
        <KpiCard label="Veículos analisados" value={r ? num(r.kpis.veiculosAnalisados) : "—"} hint={r ? `${num(r.kpis.horasDirigidas)} h dirigidas` : undefined} icon={Truck} variant="warning" carregando={resumo.isLoading} />
        <KpiCard
          label="Economia estimada"
          value={r ? (r.kpis.economiaDisponivel ? reais(r.kpis.economiaEstimada, true) : "—") : "—"}
          hint={r?.kpis.economiaDisponivel ? "cenário conservador, no período" : "informe os dados do ROI em Cadastros"}
          icon={DollarSign}
          variant="safe"
          carregando={resumo.isLoading}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard title="Evolução da fadiga" subtitle="Score médio diário no período filtrado" className="xl:col-span-2">
          <Conteudo q={resumo} altura={300}>
            {(d) => (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={d.serieFadiga}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} />
                  <XAxis dataKey="rotulo" stroke={COR.eixo} fontSize={11} interval={Math.max(0, Math.floor(d.serieFadiga.length / 10))} />
                  <YAxis stroke={COR.eixo} fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(v: number) => [num(v, 1), "Fadiga média"]} />
                  <ReferenceLine y={70} stroke={COR.risco} strokeDasharray="4 4" label={{ value: "Limite", fill: COR.risco, fontSize: 11, position: "right" }} />
                  <Line type="monotone" dataKey="fadiga" stroke={COR.primaria} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Conteudo>
        </ChartCard>
        <ChartCard title="Distribuição dos alertas" subtitle="Alertas por sinal detectado">
          <Conteudo q={resumo} altura={300}>
            {(d) =>
              d.distribuicaoAlertas.length === 0 ? (
                <Vazio>Nenhum alerta com esses filtros.</Vazio>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={d.distribuicaoAlertas} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} />
                    <XAxis type="number" stroke={COR.eixo} fontSize={11} />
                    <YAxis dataKey="rotulo" type="category" stroke={COR.eixo} fontSize={11} width={140} />
                    <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(v: number) => [v, "Alertas"]} />
                    <Bar dataKey="eventos" radius={[0, 6, 6, 0]}>
                      {d.distribuicaoAlertas.map((_, i) => (
                        <Cell key={i} fill={CORES_BARRAS[i % CORES_BARRAS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Conteudo>
        </ChartCard>
      </section>

      <section className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 text-primary flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Resumo inteligente</h2>
              <p className="text-xs text-muted-foreground">
                {r?.resumoInteligente.origem === "ia" ? "Gerado pela IA para o período dos filtros" : "Gerado automaticamente com base nos filtros aplicados"}
              </p>
            </div>
          </div>
          <Conteudo q={resumo} altura={120}>
            {(d) => (
              <ul className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
                {d.resumoInteligente.frases.map((t) => (
                  <li key={t} className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-risk-low shrink-0" />
                    <span className="text-foreground/90">{t}</span>
                  </li>
                ))}
              </ul>
            )}
          </Conteudo>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Download className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">Exportar relatórios (com os filtros acima)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {TIPOS.map((t) => (
            <div key={t.tipo} className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/40 transition relative overflow-hidden">
              <div className={cn("absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br opacity-60 blur-2xl", t.acento)} />
              <div className={cn("relative p-2.5 rounded-xl bg-gradient-to-br w-fit", t.acento)}>
                <t.icone className="h-5 w-5" />
              </div>
              <div className="relative">
                <h3 className="text-sm font-semibold">{t.titulo}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
              </div>
              <div className="relative mt-auto flex gap-1.5">
                {(["pdf", "xlsx", "csv"] as const).map((formato) => {
                  const ocupado = gerar.isPending && gerar.variables?.tipo === t.tipo && gerar.variables?.formato === formato;
                  return (
                    <button
                      key={formato}
                      disabled={gerar.isPending}
                      onClick={() => gerar.mutate({ tipo: t.tipo, formato })}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg border text-xs font-medium transition disabled:opacity-60",
                        formato === t.formato ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20" : "border-border hover:bg-secondary/60",
                      )}
                    >
                      {ocupado ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {ROTULO_FORMATO[formato]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Historico />
      <Agendamentos filtros={query} />
    </div>
  );
}

function Historico() {
  const q = useQuery({ queryKey: ["relatorios"], queryFn: () => api.get<RelatorioGerado[]>("/relatorios"), refetchInterval: 15_000 });
  const baixar = useMutation({
    mutationFn: (id: string) => api.get<{ url: string }>(`/relatorios/${id}/download`),
    onSuccess: (r) => abrirDownload(r.url),
    onError: (e) => toast.error(mensagemDeErro(e)),
  });
  return (
    <section className="glass-card rounded-2xl p-6">
      <h2 className="text-base font-semibold tracking-tight mb-3">Relatórios gerados</h2>
      <Conteudo q={q} altura={120}>
        {(lista) =>
          lista.length === 0 ? (
            <Vazio>Nenhum relatório gerado ainda.</Vazio>
          ) : (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-2 pr-2 font-medium">Quando</th>
                    <th className="py-2 pr-2 font-medium">Relatório</th>
                    <th className="py-2 pr-2 font-medium">Origem</th>
                    <th className="py-2 pr-2 font-medium">E-mail</th>
                    <th className="py-2 font-medium text-right" />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="py-2 pr-2 text-xs whitespace-nowrap">{dataHora(r.criado_em)}</td>
                      <td className="py-2 pr-2">
                        {ROTULO_TIPO[r.tipo] ?? r.tipo} <span className="text-xs text-muted-foreground">({ROTULO_FORMATO[r.formato]})</span>
                      </td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">{r.agendamento_id ? "agendamento" : (r.solicitado_por ?? "—")}</td>
                      <td className="py-2 pr-2 text-xs">
                        {r.envio === "nao_solicitado" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : r.envio === "enviado" ? (
                          <span className="text-risk-low">enviado</span>
                        ) : r.envio === "pendente" ? (
                          <span className="text-muted-foreground">enviando…</span>
                        ) : (
                          <span className="text-risk-medium" title={r.envio_erro ?? ""}>
                            não enviado (disponível aqui)
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {r.status === "pronto" ? (
                          <button onClick={() => baixar.mutate(r.id)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:bg-secondary/60">
                            <Download className="h-3 w-3" /> Baixar
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground" title={r.erro ?? ""}>
                            {r.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Conteudo>
    </section>
  );
}

function Agendamentos({ filtros }: { filtros: Query }) {
  const cliente = useQueryClient();
  const q = useQuery({ queryKey: ["agendamentos"], queryFn: () => api.get<Agendamento[]>("/relatorios/agendamentos") });
  const [tipo, setTipo] = useState("executivo");
  const [formato, setFormato] = useState("pdf");
  const [frequencia, setFrequencia] = useState<"diaria" | "semanal" | "mensal">("semanal");
  const [horario, setHorario] = useState("08:00");
  const [diaSemana, setDiaSemana] = useState(1);
  const [diaMes, setDiaMes] = useState(1);
  const [destinatarios, setDestinatarios] = useState("");

  const salvar = useMutation({
    mutationFn: () => {
      // O período do agendamento acompanha a frequência (ontem, últimos 7 ou 30 dias).
      const { periodo: _p, de: _d, ate: _a, ...resto } = filtros;
      return api.post("/relatorios/agendamentos", {
        tipo,
        formato,
        frequencia,
        horario,
        diaSemana: frequencia === "semanal" ? diaSemana : undefined,
        diaMes: frequencia === "mensal" ? diaMes : undefined,
        destinatarios: destinatarios.split(/[,;\s]+/).filter(Boolean),
        filtros: resto,
      });
    },
    onSuccess: () => {
      toast.success("Agendamento salvo");
      cliente.invalidateQueries({ queryKey: ["agendamentos"] });
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });
  const alternar = useMutation({
    mutationFn: (a: Agendamento) =>
      api.put(`/relatorios/agendamentos/${a.id}`, {
        tipo: a.tipo,
        formato: a.formato,
        frequencia: a.frequencia,
        horario: a.horario,
        diaSemana: a.diaSemana ?? undefined,
        diaMes: a.diaMes ?? undefined,
        destinatarios: a.destinatarios,
        filtros: a.filtros,
        ativo: !a.ativo,
      }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["agendamentos"] }),
    onError: (e) => toast.error(mensagemDeErro(e)),
  });
  const remover = useMutation({
    mutationFn: (id: string) => api.del(`/relatorios/agendamentos/${id}`),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["agendamentos"] }),
    onError: (e) => toast.error(mensagemDeErro(e)),
  });

  const input = "bg-secondary/60 border border-border text-sm rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-full";
  const descricao = (a: Agendamento) =>
    a.frequencia === "diaria" ? `todo dia às ${a.horario}` : a.frequencia === "semanal" ? `toda ${DIAS_SEMANA[a.diaSemana ?? 1].toLowerCase()} às ${a.horario}` : `todo dia ${a.diaMes} às ${a.horario}`;

  return (
    <section className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-base font-semibold tracking-tight">Agendamento de envio</h2>
          <p className="text-xs text-muted-foreground">O relatório é gerado no horário e enviado por e-mail; se o envio falhar, ele fica disponível nesta tela.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Relatório</label>
          <select className={input} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t.tipo} value={t.tipo}>
                {t.titulo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Formato</label>
          <select className={input} value={formato} onChange={(e) => setFormato(e.target.value)}>
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Frequência</label>
          <select className={input} value={frequencia} onChange={(e) => setFrequencia(e.target.value as typeof frequencia)}>
            <option value="diaria">Diária</option>
            <option value="semanal">Semanal</option>
            <option value="mensal">Mensal</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{frequencia === "semanal" ? "Dia da semana" : frequencia === "mensal" ? "Dia do mês" : "Dia"}</label>
          {frequencia === "semanal" ? (
            <select className={input} value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))}>
              {DIAS_SEMANA.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          ) : frequencia === "mensal" ? (
            <select className={input} value={diaMes} onChange={(e) => setDiaMes(Number(e.target.value))}>
              {Array.from({ length: 28 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          ) : (
            <input className={input} value="Todos" disabled />
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Horário</label>
          <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className={input} />
        </div>
        <div className="md:col-span-6">
          <label className="text-xs text-muted-foreground mb-1 block">Destinatários</label>
          <div className="relative">
            <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={destinatarios} onChange={(e) => setDestinatarios(e.target.value)} placeholder="gestor@empresa.com, diretoria@empresa.com" className={cn(input, "pl-9")} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending || !destinatarios.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition glow-primary disabled:opacity-60"
        >
          {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar agendamento
        </button>
      </div>

      <Conteudo q={q} altura={80}>
        {(lista) =>
          lista.length === 0 ? null : (
            <ul className="mt-5 space-y-2">
              {lista.map((a) => (
                <li key={a.id} className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm", !a.ativo && "opacity-60")}>
                  <div>
                    <p className="font-medium">
                      {ROTULO_TIPO[a.tipo]} ({ROTULO_FORMATO[a.formato]}) — {descricao(a)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      para {a.destinatarios.join(", ")} • próximo: {a.ativo ? dataHora(a.proximaExecucao) : "pausado"}
                      {a.ultimaExecucao ? ` • último: ${dataHora(a.ultimaExecucao)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => alternar.mutate(a)} className="text-xs px-2 py-1 rounded-md border border-border hover:bg-secondary/60">
                      {a.ativo ? "Pausar" : "Retomar"}
                    </button>
                    <button onClick={() => remover.mutate(a.id)} className="text-xs p-1.5 rounded-md border border-border hover:bg-risk-high/10 hover:text-risk-high" title="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </Conteudo>
    </section>
  );
}
