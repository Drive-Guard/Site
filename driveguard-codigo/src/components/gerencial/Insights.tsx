import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Conteudo } from "@/components/comum/Estado";
import { TextoComLinks } from "@/components/comum/TextoComLinks";
import { api, mensagemDeErro, type Query } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFiltros } from "@/lib/filtros";
import { relativo } from "@/lib/formato";
import { CHIP_RISCO, ROTULO_SEVERIDADE } from "@/lib/risco";
import type { Insights as TipoInsights } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { DICAS } from "@/lib/dicas";

/** Só o período do filtro: os insights cobrem a frota inteira, sem região nem tipo de veículo. */
function usePeriodoDosInsights(): Query {
  const { query } = useFiltros();
  return query.de ? { de: query.de, ate: query.ate } : { periodo: query.periodo };
}

export function useInsights() {
  const periodo = usePeriodoDosInsights();
  return useQuery({
    queryKey: ["insights", periodo],
    queryFn: () => api.get<TipoInsights>("/dashboard/insights", periodo),
    // Enquanto uma rodada está sendo gerada, confere de 5 em 5 segundos.
    refetchInterval: (q) => (q.state.data?.atualizando ? 5000 : 60_000),
  });
}

export function Insights() {
  const q = useInsights();
  const periodo = usePeriodoDosInsights();
  const { pode } = useAuth();
  const cliente = useQueryClient();
  const gerar = useMutation({
    mutationFn: () => api.post<{ execucaoId: string }>("/dashboard/insights/gerar", undefined, periodo),
    onSuccess: () => {
      toast.success("Nova análise pedida. Os insights aparecem em alguns segundos.");
      setTimeout(() => cliente.invalidateQueries({ queryKey: ["insights"] }), 1500);
    },
    onError: (e) => toast.error(mensagemDeErro(e)),
  });

  const d = q.data;
  const origem = d ? (d.origem === "ia" ? `IA (${d.modelo})` : "regras automáticas") : "";

  return (
    <ChartCard
      title="Insights & recomendações automáticas" info={DICAS.insights}
      subtitle={d ? `Geradas por ${origem} ${relativo(d.geradoEm)} • período: ${d.periodo.rotulo}${d.atualizando ? " • atualizando…" : ""}` : "Geradas com base nos padrões detectados"}
      action={
        <div className="flex items-center gap-2">
          {pode("admin", "gestor") && (
            <button
              onClick={() => gerar.mutate()}
              disabled={gerar.isPending || d?.atualizando}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary/60 disabled:opacity-60"
            >
              {gerar.isPending || d?.atualizando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Analisar agora
            </button>
          )}
          {d?.origem === "ia" ? <Bot className="h-4 w-4 text-primary" /> : <Lightbulb className="h-4 w-4 text-risk-medium" />}
        </div>
      }
    >
      <Conteudo q={q} altura={160}>
        {(dados) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dados.recomendacoes.map((ins) => (
              <div key={ins.id} className={cn("rounded-lg border p-4 transition", CHIP_RISCO[ins.severidade])}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-foreground">{ins.titulo}</h4>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/40 border border-current shrink-0">
                    {ROTULO_SEVERIDADE[ins.severidade] ?? ins.severidade}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  <TextoComLinks texto={ins.descricao} />
                </p>
                {ins.acao && <p className="mt-3 text-xs font-medium">{ins.acao} →</p>}
              </div>
            ))}
          </div>
        )}
      </Conteudo>
    </ChartCard>
  );
}
