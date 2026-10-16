/** Estados de carregamento, erro e vazio, e o selo de fonte dos dados. */

import { AlertCircle, Database, Inbox, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { mensagemDeErro } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Carregando({ altura = 200, className }: { altura?: number; className?: string }) {
  return <div className={cn("rounded-xl bg-secondary/40 animate-pulse", className)} style={{ height: altura }} />;
}

export function Erro({ erro, tentarDeNovo, compacto }: { erro: unknown; tentarDeNovo?: () => void; compacto?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 text-center text-sm text-risk-high", compacto ? "py-4" : "py-10")}>
      <AlertCircle className="h-5 w-5" />
      <p className="max-w-sm">{mensagemDeErro(erro)}</p>
      {tentarDeNovo && (
        <button onClick={tentarDeNovo} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <RefreshCw className="h-3 w-3" /> Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Vazio({ children, icone }: { children: ReactNode; icone?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
      {icone ?? <Inbox className="h-5 w-5" />}
      <div className="max-w-sm">{children}</div>
    </div>
  );
}

/** Deixa explícito de onde vem o número (frota x base nacional da PRF). */
export function SeloFonte({ children, href }: { children: ReactNode; href?: string }) {
  const corpo = (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Database className="h-3 w-3" /> {children}
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="hover:opacity-80">
      {corpo}
    </a>
  ) : (
    corpo
  );
}

/** Envolve um bloco que depende de uma query do react-query. */
export function Conteudo<T>({
  q,
  altura,
  children,
}: {
  q: { data?: T; error: unknown; isLoading: boolean; refetch: () => unknown };
  altura?: number;
  children: (dados: T) => ReactNode;
}) {
  if (q.isLoading) return <Carregando altura={altura} />;
  if (q.error) return <Erro erro={q.error} tentarDeNovo={() => q.refetch()} />;
  if (q.data === undefined) return <Carregando altura={altura} />;
  return <>{children(q.data)}</>;
}
