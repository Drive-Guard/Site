/**
 * Resposta da central a um alerta (aba Monitoramento).
 *
 * A central registra o que fez de verdade, e um alerta aceita várias
 * respostas em sequência (não conseguiu falar -> mandou parar -> falou com
 * ele). As opções, os textos e o formulário são os de AcoesCentral.tsx, os
 * mesmos do painel do motorista. Falar com ele, mandar parar, outro motorista
 * assumir e parar de dirigir hoje contam como alerta grave atendido (o
 * indicador da Visão Gerencial, do ROI e dos relatórios). Observação livre,
 * valer para os outros alertas abertos do motorista e desfazer nos primeiros
 * 15 minutos.
 */

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api, mensagemDeErro } from "@/lib/api";
import { hora } from "@/lib/formato";
import type { EventoAlerta } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { ACOES, FormAcao, HistoricoRespostas, rotuloResposta, type EnvioAcao } from "./AcoesCentral";

const GRAVE = new Set(["alta", "critica"]);
const ROTULO_GRAVIDADE: Record<string, string> = { critica: "crítica", alta: "alta", media: "média", baixa: "baixa" };

export function minutosDesde(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

export function espera(min: number) {
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  return `há ${Math.floor(min / 1440)} d`;
}

/** A resposta que o caso pede: crítico ou sem resposta ao contato -> mandar parar; alto -> falar com ele. */
export function sugestao(gravidade: string, tentativas = 0): string {
  if (gravidade === "critica" || tentativas > 0) return "pausa_obrigatoria";
  if (gravidade === "alta") return "contato_telefonico";
  return "monitorando";
}

/** Corpo do POST /alertas/{id}/respostas. */
export function corpoResposta(e: EnvioAcao) {
  return {
    tipo: e.tipo,
    ...(e.tipo === "falso_alarme" ? { motivo: e.detalhe } : e.detalhe ? { detalhe: e.detalhe } : {}),
    ...(e.observacao ? { observacao: e.observacao } : {}),
    outrosAbertos: e.lote,
  };
}

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
            title={grave ? "Alerta grave ainda sem uma resposta que resolva" : "Alerta leve: responder é opcional"}
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
                    : !r || r.tipo === "falso_alarme" || r.tipo === "monitorando"
                      ? "text-muted-foreground border-border bg-secondary/40"
                      : "text-primary border-primary/40 bg-primary/10",
                )}
              >
                {r ? rotuloResposta(r) : "Visto pela central"}
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
          className="z-[60] w-[24rem] max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl shadow-black/15 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
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
  // Com resposta registrada, o painel abre no histórico; "Registrar outra" mostra as opções.
  const [registrando, setRegistrando] = useState(evento.historico.length === 0 && !descartado);

  const atualizar = () => {
    for (const k of [["tempo-real"], ["kpis"], ["motorista", evento.motoristaId], ["roi"]]) cliente.invalidateQueries({ queryKey: k });
  };

  const responder = useMutation({
    mutationFn: (e: EnvioAcao) => api.post<{ aplicados: number }>(`/alertas/${evento.id}/respostas`, corpoResposta(e)),
    onSuccess: (r, e) => {
      toast.success(`${ACOES[e.tipo].feito}: registrado para ${evento.nome}${r.aplicados > 1 ? ` (${r.aplicados} alertas)` : ""}`);
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
        <div className="rounded-lg border border-border bg-secondary/30 p-2">
          <HistoricoRespostas itens={evento.historico} desfazendo={desfazer.isPending} aoDesfazer={(id) => desfazer.mutate(id)} />
        </div>
      )}

      {!registrando ? (
        descartado ? (
          <p className="text-[11px] text-muted-foreground">Marcado como falso alarme. Para registrar uma ação, desfaça o falso alarme (até 15 min depois).</p>
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
        <FormAcao
          nome={evento.nome}
          sugerida={evento.status === "aberto" ? sugestao(evento.gravidade, evento.tentativas) : null}
          outrosAbertos={outrosAbertos}
          pendente={responder.isPending}
          aoEnviar={(e) => responder.mutate(e)}
          aoCancelar={aoConcluir}
        />
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
