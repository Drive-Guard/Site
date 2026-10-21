/** Peças comuns das telas de cadastro. */

import { type ReactNode, useState } from "react";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Archive, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, mensagemDeErro } from "@/lib/api";
import { normalizarId } from "@/lib/identificadores";
import type { ResultadoExclusao } from "@/lib/tipos";
import { cn } from "@/lib/utils";

export const entrada = "w-full bg-secondary/60 border border-border text-sm rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60";

export function Rotulo({ texto, children, className, ajuda }: { texto: string; children: ReactNode; className?: string; ajuda?: ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs text-muted-foreground mb-1 block">{texto}</span>
      {children}
      {ajuda && <span className="mt-1 block text-[11px] text-muted-foreground">{ajuda}</span>}
    </label>
  );
}

export function BotaoPrimario({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className={cn("inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-60", p.className)}>
      {children}
    </button>
  );
}

export function BotaoSecundario({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary/60 hover:border-primary/30 transition disabled:opacity-60", p.className)}
    >
      {children}
    </button>
  );
}

export function Formulario({
  titulo,
  descricao,
  aberto,
  aoFechar,
  aoSalvar,
  salvando,
  children,
  textoSalvar = "Salvar",
  largura = "max-w-xl",
}: {
  titulo: string;
  descricao?: ReactNode;
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
  salvando: boolean;
  children: ReactNode;
  textoSalvar?: string;
  largura?: string;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent className={cn(largura, "max-h-[90vh] overflow-auto")}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            aoSalvar();
          }}
        >
          {children}
          <DialogFooter className="pt-2">
            <BotaoSecundario type="button" onClick={aoFechar} className="px-3 py-2 text-sm">
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario type="submit" disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />} {textoSalvar}
            </BotaoPrimario>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Mutação que mostra o resultado e atualiza as listas afetadas. */
export function useSalvar<T, R = unknown>(fn: (dados: T) => Promise<R>, chaves: QueryKey[], mensagem: string | ((r: R) => string), aoConcluir?: (r: R) => void) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      toast.success(typeof mensagem === "function" ? mensagem(r) : mensagem);
      for (const k of chaves) cliente.invalidateQueries({ queryKey: k });
      aoConcluir?.(r);
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });
}

/** Número de um input (vazio vira null). */
export const numeroOuNulo = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="text-left">
            {cabecalho.map((c, i) => (
              <th key={i} className="py-2 pr-3 font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const linha = "border-t border-border/60 align-middle hover:bg-secondary/30 transition-colors";
export const celula = "py-2 pr-3";

/**
 * ID digitado (código do motorista, ID da câmera): mostra na hora como ele
 * fica gravado, sem acento e sem espaço. Nada é recusado: a dashboard
 * normaliza, e o dispositivo aplica a mesma regra.
 */
export function CampoId({
  valor,
  aoMudar,
  placeholder,
  minusculo = false,
  desabilitado,
  obrigatorio,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  minusculo?: boolean;
  desabilitado?: boolean;
  obrigatorio?: boolean;
}) {
  const final = minusculo ? normalizarId(valor).toLowerCase() : normalizarId(valor);
  return (
    <>
      <input className={cn(entrada, "font-mono")} value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={placeholder} disabled={desabilitado} required={obrigatorio} />
      {valor && final !== valor && (
        <span className="mt-1 block text-[11px] text-muted-foreground">
          Fica gravado como <span className="font-mono text-foreground">{final || "—"}</span>
        </span>
      )}
    </>
  );
}

/** Escolha entre poucas opções, em botões (ex.: "Câmera nova" / "Já está enviando"). */
export function Segmentos<T extends string>({ valor, aoMudar, opcoes }: { valor: T; aoMudar: (v: T) => void; opcoes: { valor: T; rotulo: string; desabilitada?: boolean }[] }) {
  return (
    <div role="radiogroup" className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-secondary/40 p-1">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          disabled={o.desabilitada}
          onClick={() => aoMudar(o.valor)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            valor === o.valor ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground",
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/**
 * Excluir com confirmação. Sem histórico apaga de vez; com histórico o
 * Backend arquiva (some das listas, relatórios e gráficos continuam com os
 * dados) e a confirmação já avisa qual dos dois vai acontecer.
 */
export function BotaoExcluir({
  caminho,
  nome,
  temHistorico,
  chaves,
  oQueSomeJunto,
  compacto = true,
}: {
  caminho: string;
  nome: string;
  temHistorico: boolean;
  chaves: QueryKey[];
  oQueSomeJunto?: string;
  compacto?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const excluir = useSalvar(
    () => api.del<ResultadoExclusao>(caminho),
    chaves,
    (r) => (r?.resultado === "arquivado" ? `${nome} arquivado: o histórico continua nos relatórios` : `${nome} excluído`),
    () => setAberto(false),
  );
  return (
    <>
      <BotaoSecundario type="button" onClick={() => setAberto(true)} title="Excluir" className="hover:text-risk-high hover:border-risk-high/40">
        <Trash2 className="h-3 w-3" />
        {!compacto && " Excluir"}
      </BotaoSecundario>
      <AlertDialog open={aberto} onOpenChange={setAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {nome}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {temHistorico ? (
                  <p className="flex gap-2">
                    <Archive className="h-4 w-4 shrink-0 mt-0.5 text-risk-medium" />
                    <span>
                      Tem histórico (turnos, leituras ou viagens). Ele vai ser <b>arquivado</b>: some das listas e dos cadastros, mas os dados antigos continuam
                      nos relatórios e gráficos. Se voltar a enviar dados, reaparece.
                    </span>
                  </p>
                ) : (
                  <p>Ainda não tem histórico, então vai ser apagado de vez.</p>
                )}
                {oQueSomeJunto && <p className="text-muted-foreground">{oQueSomeJunto}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                excluir.mutate(undefined);
              }}
              disabled={excluir.isPending}
              className="bg-risk-high text-white hover:bg-risk-high/90"
            >
              {excluir.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {temHistorico ? "Arquivar" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
