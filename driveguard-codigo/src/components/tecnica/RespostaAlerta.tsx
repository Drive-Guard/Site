/**
 * Resposta da central a um alerta (aba Monitoramento).
 *
 * A central registra o que fez de verdade, e um alerta aceita várias
 * respostas em sequência (não atendeu -> pediu pausa -> falou com ele):
 *   - falar com o motorista: falei com ele / não consegui falar (o alerta
 *     segue aguardando), pelo telefone, rádio ou mensagem;
 *   - intervir agora: pausa (15 min, 30 min, 1 h...), troca de motorista,
 *     encerramento do turno;
 *   - sem intervenção: "vou acompanhar" ou falso alarme, com o motivo (o
 *     retorno para quem treina o modelo);
 *   - depois do turno: reciclagem ou advertência.
 * Contato, pausa, troca e encerramento contam como alerta grave atendido (o
 * indicador da Visão Gerencial, do ROI e dos relatórios). Observação livre em
 * qualquer resposta, aplicar aos outros alertas abertos do motorista de uma
 * vez, e desfazer nos primeiros 15 minutos.
 */

import { useState, type ComponentType } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BellOff,
  Check,
  ChevronDown,
  CoffeeIcon,
  Eye,
  FileWarning,
  GraduationCap,
  Loader2,
  Phone,
  PhoneMissed,
  Power,
  Repeat,
  Sparkles,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { api, mensagemDeErro } from "@/lib/api";
import { hora } from "@/lib/formato";
import type { EventoAlerta, RespostaDoAlerta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

type Grupo = "falar" | "intervir" | "observar" | "depois";

interface Acao {
  rotulo: string;
  /** Como aparece depois de registrada. */
  feito: string;
  grupo: Grupo;
  icone: ComponentType<{ className?: string }>;
  /** Conta como alerta grave atendido. */
  atende?: boolean;
  /** Opções da resposta (vão no "detalhe"). */
  opcoes?: string[];
  ajuda: string;
}

const CANAIS = ["telefone", "rádio", "mensagem"];

const ACOES: Record<string, Acao> = {
  contato_telefonico: { rotulo: "Falei com ele", feito: "Motorista contatado", grupo: "falar", icone: Phone, atende: true, opcoes: CANAIS, ajuda: "conversou e checou como ele está" },
  tentativa_contato: { rotulo: "Não consegui falar", feito: "Tentativa sem resposta", grupo: "falar", icone: PhoneMissed, opcoes: CANAIS, ajuda: "fica registrado; o alerta segue aguardando" },
  pausa_obrigatoria: { rotulo: "Pedi uma pausa", feito: "Pausa pedida", grupo: "intervir", icone: CoffeeIcon, atende: true, opcoes: ["15 min", "30 min", "1 h", "até o próximo ponto"], ajuda: "para no próximo ponto seguro" },
  troca_motorista: { rotulo: "Troquei o motorista", feito: "Motorista trocado", grupo: "intervir", icone: Repeat, atende: true, ajuda: "outro motorista assume o veículo" },
  encerramento_turno: { rotulo: "Encerrar o turno", feito: "Turno encerrado", grupo: "intervir", icone: Power, atende: true, ajuda: "ele não segue viagem hoje" },
  monitorando: { rotulo: "Vou acompanhar", feito: "Em acompanhamento", grupo: "observar", icone: Eye, ajuda: "viu e decidiu observar; não conta como atendido" },
  falso_alarme: { rotulo: "Falso alarme", feito: "Falso alarme", grupo: "observar", icone: BellOff, ajuda: "sai da conta dos graves; o motivo ajuda a calibrar o modelo" },
  treinamento: { rotulo: "Agendar reciclagem", feito: "Reciclagem agendada", grupo: "depois", icone: GraduationCap, ajuda: "treinamento sobre fadiga e pausas" },
  advertencia: { rotulo: "Registrar advertência", feito: "Advertência", grupo: "depois", icone: FileWarning, ajuda: "fica no histórico do motorista" },
};

const GRUPOS: { id: Grupo; rotulo: string }[] = [
  { id: "falar", rotulo: "Falar com o motorista" },
  { id: "intervir", rotulo: "Intervir agora" },
  { id: "observar", rotulo: "Sem intervenção" },
  { id: "depois", rotulo: "Depois do turno" },
];

export const MOTIVOS_DESCARTE: Record<string, string> = {
  motorista_bem: "Motorista estava bem",
  camera: "Câmera mal posicionada",
  oculos: "Óculos escuros ou boné",
  iluminacao: "Iluminação (sol, noite)",
  outro: "Outro motivo",
};

const VISTO = { feito: "Visto pela central" };

const GRAVE = new Set(["alta", "critica"]);
const ROTULO_GRAVIDADE: Record<string, string> = { critica: "crítica", alta: "alta", media: "média", baixa: "baixa" };

function minutosDesde(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

function espera(min: number) {
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  return `há ${Math.floor(min / 1440)} d`;
}

/** Rótulo de uma resposta já registrada: "Pausa pedida · 30 min". */
function rotuloResposta(r: RespostaDoAlerta) {
  const feito = ACOES[r.tipo]?.feito ?? VISTO.feito;
  const detalhe = r.tipo === "falso_alarme" ? (r.detalhe ? MOTIVOS_DESCARTE[r.detalhe] ?? r.detalhe : null) : r.detalhe;
  return detalhe ? `${feito} · ${detalhe}` : feito;
}

/** A resposta que o caso pede: crítica -> pausa; tentativa sem sucesso -> pausa (rádio); alta -> contato. */
function sugestao(evento: EventoAlerta): string | null {
  if (evento.status !== "aberto") return null;
  if (evento.gravidade === "critica" || evento.tentativas > 0) return "pausa_obrigatoria";
  if (evento.gravidade === "alta") return "contato_telefonico";
  return "monitorando";
}

const CHIP = "rounded-full border px-2 py-0.5 text-[11px] transition";

export function RespostaAlerta({ evento, outrosAbertos = 0 }: { evento: EventoAlerta; outrosAbertos?: number }) {
  const [aberto, setAberto] = useState(false);
  const grave = GRAVE.has(evento.gravidade);
  const min = minutosDesde(evento.disparadoEm);
  const aguardando = evento.status === "aberto";
  const r = evento.resposta;

  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <span className="inline-flex items-center justify-end gap-2">
        {aguardando && (
          <span
            className={cn("text-[11px] whitespace-nowrap", grave && min >= 5 ? "font-medium text-risk-high" : "text-muted-foreground")}
            title={grave ? "Alerta grave ainda sem resposta que resolva" : "Alerta leve: responder é opcional"}
          >
            {evento.tentativas > 0 ? `${evento.tentativas} ${evento.tentativas === 1 ? "tentativa" : "tentativas"} • ` : ""}
            {grave ? `aguardando ${espera(min)}` : "sem resposta"}
          </span>
        )}
        <Popover.Trigger asChild>
          {aguardando ? (
            <button
              type="button"
              className={cn(
                "group inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition",
                grave ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20" : "border-border hover:bg-secondary/60",
              )}
            >
              Responder
              <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          ) : (
            <button type="button" className="inline-flex flex-col items-end gap-0.5 text-right" title="Ver as respostas ou registrar outra">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium hover:brightness-110",
                  evento.atendido
                    ? "text-risk-low border-risk-low/40 bg-risk-low/10"
                    : r?.tipo === "falso_alarme" || !r || r.tipo === "monitorando"
                      ? "text-muted-foreground border-border bg-secondary/40"
                      : "text-primary border-primary/40 bg-primary/10",
                )}
              >
                {r ? rotuloResposta(r) : VISTO.feito}
                {evento.historico.length > 1 && <span className="ml-1 opacity-70">+{evento.historico.length - 1}</span>}
              </span>
              {(r?.por || r?.em) && <span className="text-[10px] text-muted-foreground">{[r.por, r.em ? hora(r.em) : null].filter(Boolean).join(" · ")}</span>}
            </button>
          )}
        </Popover.Trigger>
      </span>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-[60] w-[23rem] max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl shadow-black/15 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <PainelResposta evento={evento} outrosAbertos={outrosAbertos} aoConcluir={() => setAberto(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function PainelResposta({ evento, outrosAbertos, aoConcluir }: { evento: EventoAlerta; outrosAbertos: number; aoConcluir: () => void }) {
  const cliente = useQueryClient();
  const descartado = evento.status === "descartado";
  const sugerida = sugestao(evento);
  // Com resposta registrada, o painel abre no histórico; "Registrar outra" mostra as ações.
  const [registrando, setRegistrando] = useState(evento.historico.length === 0 && !descartado);
  const [tipo, setTipo] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [lote, setLote] = useState(false);

  const atualizar = () => {
    for (const k of [["tempo-real"], ["kpis"], ["motorista", evento.motoristaId], ["roi"]]) cliente.invalidateQueries({ queryKey: k });
  };

  const responder = useMutation({
    mutationFn: () =>
      api.post<{ aplicados: number }>(`/alertas/${evento.id}/respostas`, {
        tipo,
        ...(tipo === "falso_alarme" ? { motivo: detalhe } : detalhe ? { detalhe } : {}),
        ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
        outrosAbertos: lote,
      }),
    onSuccess: (r) => {
      const a = ACOES[tipo!];
      toast.success(`${a.feito}: registrado para ${evento.nome}${r.aplicados > 1 ? ` (${r.aplicados} alertas)` : ""}`);
      atualizar();
      aoConcluir();
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });

  const desfazer = useMutation({
    mutationFn: (id: string) => api.del(`/alertas/${evento.id}/respostas/${id}`),
    onSuccess: () => {
      toast.success("Resposta desfeita");
      atualizar();
      aoConcluir();
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });

  const escolher = (t: string) => {
    setTipo(t === tipo ? null : t);
    setDetalhe(null);
  };
  const acao = tipo ? ACOES[tipo] : null;
  const opcoes = tipo === "falso_alarme" ? Object.keys(MOTIVOS_DESCARTE) : (acao?.opcoes ?? []);
  const falta = tipo === "falso_alarme" && !detalhe ? "Escolha o motivo" : null;
  const primeiro = evento.nome.split(" ")[0];

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-semibold leading-tight">
          {evento.rotulo} <span className="font-normal text-muted-foreground">· {evento.nome}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          {hora(evento.disparadoEm)} ({espera(minutosDesde(evento.disparadoEm))}) • score {evento.score ?? "—"} • gravidade {ROTULO_GRAVIDADE[evento.gravidade] ?? evento.gravidade}
        </p>
      </div>

      {evento.historico.length > 0 && (
        <ol className="space-y-1.5 rounded-lg border border-border bg-secondary/30 p-2">
          {evento.historico.map((h, i) => {
            const Icone = ACOES[h.tipo]?.icone ?? Check;
            return (
              <li key={h.id ?? i} className="flex items-start gap-2 text-xs">
                <Icone className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", ACOES[h.tipo]?.atende ? "text-risk-low" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{rotuloResposta(h)}</span>
                  <span className="text-muted-foreground"> · {[h.por, h.em ? hora(h.em) : null].filter(Boolean).join(" · ")}</span>
                  {h.observacao && <span className="block italic text-muted-foreground">“{h.observacao}”</span>}
                </span>
                {h.podeDesfazer && h.id && (
                  <button
                    type="button"
                    disabled={desfazer.isPending}
                    onClick={() => desfazer.mutate(h.id!)}
                    className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                    title="Desfazer (até 15 min depois)"
                  >
                    <Undo2 className="h-3 w-3" /> desfazer
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!registrando ? (
        descartado ? (
          <p className="text-[11px] text-muted-foreground">Falso alarme: desfaça o descarte (até 15 min) para registrar uma ação.</p>
        ) : (
          <button
            type="button"
            onClick={() => setRegistrando(true)}
            className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            + Registrar outra resposta
          </button>
        )
      ) : (
        <>
          {/* Etapa 1: escolher a resposta. Etapa 2 (abaixo): opções e observação. */}
          {!acao && (
            <div className="space-y-2">
              {GRUPOS.map((g) => (
                <div key={g.id}>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{g.rotulo}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(ACOES)
                      .filter(([, a]) => a.grupo === g.id)
                      .map(([t, a]) => (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={tipo === t}
                          onClick={() => escolher(t)}
                          className={cn(
                            "relative flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition",
                            tipo === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:bg-secondary/50",
                          )}
                        >
                          <a.icone className={cn("h-4 w-4 shrink-0", tipo === t ? "text-primary" : "text-muted-foreground")} />
                          <span className="leading-tight">{a.rotulo}</span>
                          {sugerida === t && tipo !== t && (
                            <span className="absolute -top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 text-[9px] font-semibold text-primary-foreground">
                              <Sparkles className="h-2.5 w-2.5" /> sugerido
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {acao && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-secondary/30 p-2.5">
              <div className="flex items-center gap-2">
                <acao.icone className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 text-sm font-semibold">{acao.rotulo}</span>
                <button type="button" onClick={() => setTipo(null)} className="text-[11px] text-muted-foreground hover:text-foreground">
                  trocar
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {acao.ajuda}.{" "}
                <span className={acao.atende ? "text-risk-low" : ""}>{acao.atende ? "Conta como alerta atendido." : "Não conta como atendido."}</span>
              </p>
              {opcoes.length > 0 && (
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tipo === "falso_alarme" ? "Motivo" : "Detalhe"}>
                  {opcoes.map((o) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={detalhe === o}
                      onClick={() => setDetalhe(detalhe === o ? null : o)}
                      className={cn(CHIP, detalhe === o ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
                    >
                      {tipo === "falso_alarme" ? MOTIVOS_DESCARTE[o] : o}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value.slice(0, 500))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !falta) responder.mutate();
                }}
                rows={2}
                placeholder="Observação (opcional): o que ele disse, onde parou..."
                className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
              />
              {outrosAbertos > 0 && (
                <label className="flex cursor-pointer items-center gap-2 text-[11px]">
                  <input type="checkbox" checked={lote} onChange={(e) => setLote(e.target.checked)} className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
                  Aplicar também aos outros {outrosAbertos} {outrosAbertos === 1 ? "alerta aberto" : "alertas abertos"} de {primeiro} neste turno
                </label>
              )}
              <div className="flex items-center justify-end gap-2">
                {falta && <span className="mr-auto text-[11px] text-risk-high">{falta}</span>}
                <button type="button" onClick={aoConcluir} className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!!falta || responder.isPending}
                  onClick={() => responder.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {responder.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Registrar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Resumo no topo dos alertas: graves respondidos e os que ainda esperam. */
export function ResumoRespostas({ r }: { r?: { graves: number; atendidos: number; aguardando: number; descartados: number; aguardandoDesde: string | null } }) {
  // Sem o resumo (Backend ainda na versão anterior) ou sem graves: nada a mostrar.
  if (!r?.graves) return null;
  const validos = r.graves - r.descartados;
  const pct = validos > 0 ? Math.round((r.atendidos / validos) * 100) : null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-xs">
      <span>
        <b className="text-sm">{pct === null ? "—" : `${pct}%`}</b> dos alertas graves com resposta da central{" "}
        <span className="text-muted-foreground">
          ({r.atendidos} de {validos}
          {r.descartados ? `; ${r.descartados} falso${r.descartados > 1 ? "s" : ""} alarme${r.descartados > 1 ? "s" : ""} fora da conta` : ""})
        </span>
      </span>
      {r.aguardando > 0 ? (
        <span className="font-medium text-risk-high">
          {r.aguardando} grave{r.aguardando > 1 ? "s" : ""} aguardando resposta
          {r.aguardandoDesde ? ` • o mais antigo ${espera(minutosDesde(r.aguardandoDesde))}` : ""}
        </span>
      ) : (
        <span className="text-risk-low">nenhum grave esperando</span>
      )}
    </div>
  );
}
