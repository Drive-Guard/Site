/** Peças comuns das telas de cadastro. */

import type { ReactNode } from "react";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensagemDeErro } from "@/lib/api";
import { cn } from "@/lib/utils";

export const entrada = "w-full bg-secondary/60 border border-border text-sm rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60";

export function Rotulo({ texto, children, className }: { texto: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs text-muted-foreground mb-1 block">{texto}</span>
      {children}
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
    <button {...p} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary/60 disabled:opacity-60", p.className)}>
      {children}
    </button>
  );
}

export function Formulario({
  titulo,
  aberto,
  aoFechar,
  aoSalvar,
  salvando,
  children,
  textoSalvar = "Salvar",
}: {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
  salvando: boolean;
  children: ReactNode;
  textoSalvar?: string;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
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
export function useSalvar<T>(fn: (dados: T) => Promise<unknown>, chaves: QueryKey[], mensagem: string, aoConcluir?: () => void) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(mensagem);
      for (const k of chaves) cliente.invalidateQueries({ queryKey: k });
      aoConcluir?.();
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

export const linha = "border-t border-border/60 align-middle";
export const celula = "py-2 pr-3";
