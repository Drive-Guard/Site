/**
 * Resposta da central a um alerta (aba Monitoramento).
 *
 * No lugar do antigo "Reconhecer / Resolver", a central diz o que fez de
 * verdade: pediu pausa, ligou, mandou encerrar o turno, ou marcou falso
 * alarme. As três primeiras ficam registradas no histórico do motorista e
 * contam como alerta grave atendido (o indicador da Visão Gerencial e dos
 * relatórios); falso alarme não conta.
 */

import * as Menu from "@radix-ui/react-dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellOff, ChevronDown, CoffeeIcon, Loader2, Phone, Power } from "lucide-react";
import { toast } from "sonner";
import { api, mensagemDeErro } from "@/lib/api";
import { hora } from "@/lib/formato";
import type { EventoAlerta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const OPCOES = [
  { tipo: "pausa_obrigatoria", rotulo: "Pedi uma pausa", detalhe: "o motorista para no próximo ponto seguro", icone: CoffeeIcon },
  { tipo: "contato_telefonico", rotulo: "Liguei para o motorista", detalhe: "conversa para checar como ele está", icone: Phone },
  { tipo: "encerramento_turno", rotulo: "Mandei encerrar o turno", detalhe: "ele não segue viagem hoje", icone: Power },
] as const;

const FEITO: Record<string, { rotulo: string; cor: string }> = {
  pausa_obrigatoria: { rotulo: "Pausa pedida", cor: "text-risk-low border-risk-low/40 bg-risk-low/10" },
  contato_telefonico: { rotulo: "Motorista contatado", cor: "text-risk-low border-risk-low/40 bg-risk-low/10" },
  encerramento_turno: { rotulo: "Turno encerrado", cor: "text-risk-low border-risk-low/40 bg-risk-low/10" },
  troca_motorista: { rotulo: "Motorista trocado", cor: "text-risk-low border-risk-low/40 bg-risk-low/10" },
  treinamento: { rotulo: "Treinamento marcado", cor: "text-primary border-primary/40 bg-primary/10" },
  advertencia: { rotulo: "Advertência", cor: "text-primary border-primary/40 bg-primary/10" },
  falso_alarme: { rotulo: "Falso alarme", cor: "text-muted-foreground border-border bg-secondary/40" },
  visto: { rotulo: "Visto pela central", cor: "text-muted-foreground border-border bg-secondary/40" },
};

const GRAVE = new Set(["alta", "critica"]);

function minutosDesde(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

function espera(min: number) {
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  return `há ${Math.floor(min / 1440)} d`;
}

export function RespostaAlerta({ evento }: { evento: EventoAlerta }) {
  const cliente = useQueryClient();
  const responder = useMutation({
    mutationFn: (tipo: string) =>
      tipo === "falso_alarme"
        ? api.patch(`/alertas/${evento.id}`, { status: "descartado" })
        : api.post(`/motoristas/${evento.motoristaId}/acoes`, { tipo, alertaId: evento.id, descricao: `Resposta ao alerta de ${evento.rotulo.toLowerCase()}` }),
    onSuccess: (_, tipo) => {
      toast.success(tipo === "falso_alarme" ? "Marcado como falso alarme" : `${FEITO[tipo].rotulo}: registrado para ${evento.nome}`);
      for (const k of [["tempo-real"], ["kpis"], ["motorista", evento.motoristaId], ["roi"]]) cliente.invalidateQueries({ queryKey: k });
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });

  if (evento.resposta) {
    const f = FEITO[evento.resposta.tipo] ?? FEITO.visto;
    return (
      <span className="inline-flex flex-col items-end gap-0.5">
        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", f.cor)}>{f.rotulo}</span>
        {(evento.resposta.por || evento.resposta.em) && (
          <span className="text-[10px] text-muted-foreground">
            {[evento.resposta.por, evento.resposta.em ? hora(evento.resposta.em) : null].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
    );
  }

  const grave = GRAVE.has(evento.gravidade);
  const min = minutosDesde(evento.disparadoEm);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn("text-[11px] whitespace-nowrap", grave && min >= 5 ? "font-medium text-risk-high" : "text-muted-foreground")}
        title={grave ? "Alerta grave ainda sem resposta da central" : "Alerta leve: responder é opcional"}
      >
        {grave ? `aguardando ${espera(min)}` : "sem resposta"}
      </span>
      <Menu.Root>
        <Menu.Trigger
          disabled={responder.isPending}
          className={cn(
            "group inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition disabled:opacity-60",
            grave ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20" : "border-border hover:bg-secondary/60",
          )}
        >
          {responder.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Responder
          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={6}
            collisionPadding={12}
            className="z-[60] w-72 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/15 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <Menu.Label className="px-2.5 pb-1.5 pt-1 text-[11px] text-muted-foreground">
              O que a central fez com o alerta de {evento.nome.split(" ")[0]}?
            </Menu.Label>
            {OPCOES.map((o) => (
              <Menu.Item
                key={o.tipo}
                onSelect={() => responder.mutate(o.tipo)}
                className="flex cursor-pointer select-none items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              >
                <o.icone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium">{o.rotulo}</span>
                  <span className="block text-[11px] text-muted-foreground">{o.detalhe}</span>
                </span>
              </Menu.Item>
            ))}
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item
              onSelect={() => responder.mutate("falso_alarme")}
              className="flex cursor-pointer select-none items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
            >
              <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="block font-medium">Falso alarme</span>
                <span className="block text-[11px] text-muted-foreground">o motorista estava bem; não conta como atendido</span>
              </span>
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </span>
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
