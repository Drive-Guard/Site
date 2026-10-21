/**
 * Paginação curta para listas dentro de cards: o card fica do tamanho de uma
 * página, em vez de crescer com a lista inteira.
 */

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function usePaginacao<T>(itens: T[], porPagina: number) {
  const [pagina, setPagina] = useState(0);
  const total = Math.max(1, Math.ceil(itens.length / porPagina));
  // A lista encolheu (filtro, atualização ao vivo): volta para uma página que existe.
  useEffect(() => {
    if (pagina > total - 1) setPagina(total - 1);
  }, [pagina, total]);
  const atual = Math.min(pagina, total - 1);
  return {
    visiveis: itens.slice(atual * porPagina, (atual + 1) * porPagina),
    pagina: atual,
    total,
    quantidade: itens.length,
    porPagina,
    irPara: setPagina,
  };
}

export function Paginacao({ p, className }: { p: ReturnType<typeof usePaginacao<unknown>>; className?: string }) {
  if (p.total <= 1) return null;
  const de = p.pagina * p.porPagina + 1;
  const ate = Math.min(p.quantidade, de + p.porPagina - 1);
  const botao = "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition hover:border-primary/40 disabled:opacity-40 disabled:hover:border-border";
  return (
    <div className={cn("mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground", className)}>
      <span className="tabular-nums">
        {de}–{ate} de {p.quantidade}
      </span>
      <div className="flex items-center gap-1.5">
        <button type="button" className={botao} disabled={p.pagina === 0} onClick={() => p.irPara(p.pagina - 1)} aria-label="Página anterior">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="tabular-nums">
          {p.pagina + 1} / {p.total}
        </span>
        <button type="button" className={botao} disabled={p.pagina >= p.total - 1} onClick={() => p.irPara(p.pagina + 1)} aria-label="Próxima página">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
