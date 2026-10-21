/**
 * O que a central pode fazer quando um motorista mostra sinais de sono: o
 * mesmo vocabulário e o mesmo formulário na resposta a um alerta (aba
 * Monitoramento) e nas ações da central (painel do motorista).
 *
 * Os textos dizem o que acontece com o motorista, do ponto de vista de quem
 * está na central: "Mandar parar e descansar", e não "Pausa".
 */

import { useState, type ComponentType } from "react";
import {
  BellOff,
  Check,
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
import { hora } from "@/lib/formato";
import { cn } from "@/lib/utils";

export type Grupo = "falar" | "pedir" | "observar" | "depois";

export interface Acao {
  /** Texto do botão: o que a central fez ou manda fazer. */
  rotulo: string;
  /** Uma linha explicando o efeito. */
  ajuda: string;
  /** Como aparece depois de registrada. */
  feito: string;
  grupo: Grupo;
  icone: ComponentType<{ className?: string }>;
  /** Conta como alerta grave atendido (Visão Gerencial, ROI, relatórios). */
  atende?: boolean;
  /** Opções (vão no "detalhe"). */
  opcoes?: string[];
  rotuloOpcoes?: string;
}

const CANAIS = ["telefone", "rádio", "mensagem"];

export const ACOES: Record<string, Acao> = {
  contato_telefonico: {
    rotulo: "Consegui falar com ele",
    ajuda: "Ele respondeu e a central checou como está",
    feito: "Motorista contatado",
    grupo: "falar",
    icone: Phone,
    atende: true,
    opcoes: CANAIS,
    rotuloOpcoes: "Por onde?",
  },
  tentativa_contato: {
    rotulo: "Não consegui falar",
    ajuda: "Ele não atendeu; o alerta continua aguardando",
    feito: "Sem resposta do motorista",
    grupo: "falar",
    icone: PhoneMissed,
    opcoes: CANAIS,
    rotuloOpcoes: "Por onde?",
  },
  pausa_obrigatoria: {
    rotulo: "Mandar parar e descansar",
    ajuda: "Ele para no próximo local seguro e descansa",
    feito: "Parada para descanso",
    grupo: "pedir",
    icone: CoffeeIcon,
    atende: true,
    opcoes: ["15 min", "30 min", "1 h", "até o próximo posto"],
    rotuloOpcoes: "Por quanto tempo?",
  },
  troca_motorista: {
    rotulo: "Outro motorista assume",
    ajuda: "Ele sai do volante e outro segue com o veículo",
    feito: "Motorista substituído",
    grupo: "pedir",
    icone: Repeat,
    atende: true,
  },
  encerramento_turno: {
    rotulo: "Parar de dirigir hoje",
    ajuda: "Ele estaciona e encerra a jornada do dia",
    feito: "Jornada encerrada",
    grupo: "pedir",
    icone: Power,
    atende: true,
  },
  monitorando: {
    rotulo: "Só acompanhar por enquanto",
    ajuda: "Sem falar com ele agora; a central fica de olho no score",
    feito: "Em acompanhamento",
    grupo: "observar",
    icone: Eye,
  },
  falso_alarme: {
    rotulo: "O alerta não procede",
    ajuda: "Ele não estava com sono (falso alarme)",
    feito: "Falso alarme",
    grupo: "observar",
    icone: BellOff,
    rotuloOpcoes: "Por que o alerta errou?",
  },
  treinamento: {
    rotulo: "Indicar treinamento sobre sono",
    ajuda: "Curso sobre fadiga, pausas e sinais de cansaço",
    feito: "Treinamento indicado",
    grupo: "depois",
    icone: GraduationCap,
  },
  advertencia: {
    rotulo: "Advertir por descumprir regra",
    ajuda: "Ex.: não fez a parada obrigatória; fica no histórico",
    feito: "Advertência registrada",
    grupo: "depois",
    icone: FileWarning,
  },
};

export const GRUPOS: { id: Grupo; rotulo: string }[] = [
  { id: "falar", rotulo: "Falar com o motorista" },
  { id: "pedir", rotulo: "Pedir ao motorista" },
  { id: "observar", rotulo: "Sem ação agora" },
  { id: "depois", rotulo: "Depois da viagem" },
];

export const MOTIVOS_DESCARTE: Record<string, string> = {
  motorista_bem: "Ele estava bem",
  camera: "Câmera mal posicionada",
  oculos: "Óculos escuros ou boné",
  iluminacao: "Luz forte ou escuro demais",
  outro: "Outro motivo",
};

export interface Resposta {
  id: string | null;
  tipo: string;
  detalhe: string | null;
  observacao: string | null;
  em: string | null;
  por: string | null;
  podeDesfazer: boolean;
}

/** "Parada para descanso · 30 min" */
export function rotuloResposta(r: Pick<Resposta, "tipo" | "detalhe">) {
  const feito = ACOES[r.tipo]?.feito ?? "Visto pela central";
  const detalhe = r.tipo === "falso_alarme" ? (r.detalhe ? MOTIVOS_DESCARTE[r.detalhe] ?? r.detalhe : null) : r.detalhe;
  return detalhe ? `${feito} · ${detalhe}` : feito;
}

export interface EnvioAcao {
  tipo: string;
  detalhe: string | null;
  observacao: string;
  lote: boolean;
}

const CHIP = "rounded-full border px-2.5 py-1 text-[11px] transition";

/**
 * Escolher o que a central fez (etapa 1) e completar com a opção e a
 * observação (etapa 2).
 */
export function FormAcao({
  grupos = GRUPOS.map((g) => g.id),
  sugerida,
  outrosAbertos = 0,
  nome,
  pendente,
  aoEnviar,
  aoCancelar,
}: {
  grupos?: Grupo[];
  sugerida?: string | null;
  /** Outros alertas abertos do motorista: oferece aplicar a todos. */
  outrosAbertos?: number;
  nome: string;
  pendente: boolean;
  aoEnviar: (e: EnvioAcao) => void;
  aoCancelar?: () => void;
}) {
  const [tipo, setTipo] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [lote, setLote] = useState(false);
  const acao = tipo ? ACOES[tipo] : null;
  const opcoes = tipo === "falso_alarme" ? Object.keys(MOTIVOS_DESCARTE) : (acao?.opcoes ?? []);
  const falta = tipo === "falso_alarme" && !detalhe ? "Escolha o motivo" : null;
  const primeiro = nome.split(" ")[0];
  const enviar = () => tipo && !falta && aoEnviar({ tipo, detalhe, observacao: observacao.trim(), lote });

  if (!acao) {
    return (
      <div className="space-y-2.5">
        {GRUPOS.filter((g) => grupos.includes(g.id)).map((g) => (
          <div key={g.id}>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{g.rotulo}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(ACOES)
                .filter(([, a]) => a.grupo === g.id)
                .map(([t, a]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTipo(t);
                      setDetalhe(null);
                    }}
                    className="relative flex items-start gap-2 rounded-lg border border-border px-2.5 py-2 text-left transition hover:border-primary/40 hover:bg-secondary/50"
                  >
                    <a.icone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium leading-tight">{a.rotulo}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{a.ajuda}</span>
                    </span>
                    {sugerida === t && (
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
    );
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-primary/30 bg-secondary/30 p-2.5">
      <div className="flex items-start gap-2">
        <acao.icone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{acao.rotulo}</p>
          <p className="text-[11px] text-muted-foreground">
            {acao.ajuda}.{" "}
            <span className={acao.atende ? "text-risk-low" : ""}>{acao.atende ? "Conta como alerta atendido." : "Não conta como atendido."}</span>
          </p>
        </div>
        <button type="button" onClick={() => setTipo(null)} className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground">
          trocar
        </button>
      </div>
      {opcoes.length > 0 && (
        <div>
          {acao.rotuloOpcoes && <p className="mb-1 text-[11px] font-medium">{acao.rotuloOpcoes}</p>}
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={acao.rotuloOpcoes ?? "Opção"}>
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
        </div>
      )}
      <textarea
        value={observacao}
        onChange={(e) => setObservacao(e.target.value.slice(0, 500))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar();
        }}
        rows={2}
        placeholder="Observação (opcional): o que ele disse, onde parou..."
        className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
      />
      {outrosAbertos > 0 && (
        <label className="flex cursor-pointer items-center gap-2 text-[11px]">
          <input type="checkbox" checked={lote} onChange={(e) => setLote(e.target.checked)} className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
          Vale também para os outros {outrosAbertos} {outrosAbertos === 1 ? "alerta aberto" : "alertas abertos"} de {primeiro} nesta viagem
        </label>
      )}
      <div className="flex items-center justify-end gap-2">
        {falta && <span className="mr-auto text-[11px] text-risk-high">{falta}</span>}
        <button type="button" onClick={aoCancelar ?? (() => setTipo(null))} className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!!falta || pendente}
          onClick={enviar}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pendente ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Registrar
        </button>
      </div>
    </div>
  );
}

/** Linha do tempo das respostas, com desfazer nos primeiros 15 minutos. */
export function HistoricoRespostas({
  itens,
  desfazendo,
  aoDesfazer,
}: {
  /** `contexto`: uma linha a mais (ex.: a que alerta a ação respondeu). */
  itens: (Resposta & { contexto?: string | null })[];
  desfazendo: boolean;
  aoDesfazer: (id: string) => void;
}) {
  return (
    <ol className="space-y-1.5">
      {itens.map((h, i) => {
        const Icone = ACOES[h.tipo]?.icone ?? Check;
        return (
          <li key={h.id ?? i} className="flex items-start gap-2 text-xs">
            <Icone className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", ACOES[h.tipo]?.atende ? "text-risk-low" : "text-muted-foreground")} />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{rotuloResposta(h)}</span>
              <span className="text-muted-foreground"> · {[h.por, h.em ? hora(h.em) : null].filter(Boolean).join(" · ")}</span>
              {h.contexto && <span className="block text-[11px] text-muted-foreground">{h.contexto}</span>}
              {h.observacao && <span className="block italic text-muted-foreground">“{h.observacao}”</span>}
            </span>
            {h.podeDesfazer && h.id && (
              <button
                type="button"
                disabled={desfazendo}
                onClick={() => aoDesfazer(h.id!)}
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
  );
}
