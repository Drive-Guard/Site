/**
 * Heatmap horas de direção × dia. Colunas: os últimos 7 dias por padrão, ou
 * o intervalo escolhido no calendário (até 31 dias).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { SeletorIntervalo } from "@/components/comum/SeletorIntervalo";
import { api } from "@/lib/api";
import { useFiltros } from "@/lib/filtros";
import { diaMes, num } from "@/lib/formato";
import type { Heatmap as TipoHeatmap } from "@/lib/tipos";
import { ESCALA_RISCO } from "@/lib/risco";
import { cn } from "@/lib/utils";

/**
 * Cortes por medida: o score usa a escala de risco (40/70/90); o % de
 * leituras sonolentas é bem menor (na operação fica em poucos %), então os
 * cortes são 5/15/30% para a variação aparecer.
 */
const CORTES = { score: [40, 70, 90], probabilidade: [5, 15, 30] } as const;

function corPara(v: number, medida: keyof typeof CORTES) {
  const [a, b, c] = CORTES[medida];
  if (v < a) return ESCALA_RISCO[0];
  if (v < b) return ESCALA_RISCO[1];
  if (v < c) return ESCALA_RISCO[2];
  return ESCALA_RISCO[3];
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function Heatmap() {
  const { query } = useFiltros();
  const [intervalo, setIntervalo] = useState<{ de?: string; ate?: string }>({});
  const [medida, setMedida] = useState<"probabilidade" | "score">("probabilidade");
  const q = { regiao: query.regiao, tipo_veiculo: query.tipo_veiculo, de: intervalo.de, ate: intervalo.ate };
  const heatmap = useQuery({ queryKey: ["heatmap", q], queryFn: () => api.get<TipoHeatmap>("/dashboard/heatmap", q), refetchInterval: 60_000 });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SeletorIntervalo de={intervalo.de ?? heatmap.data?.de} ate={intervalo.ate ?? heatmap.data?.ate} maxDias={31} aoMudar={(de, ate) => setIntervalo({ de, ate })} className="text-xs py-1.5" />
        <div className="flex items-center gap-2">
          {intervalo.de && (
            <button onClick={() => setIntervalo({})} className="text-[11px] text-primary hover:underline">
              últimos 7 dias
            </button>
          )}
          <div className="flex rounded-lg border border-border p-0.5 text-[11px]">
            {(["probabilidade", "score"] as const).map((m) => (
              <button key={m} onClick={() => setMedida(m)} className={cn("px-2 py-0.5 rounded-md", medida === m ? "bg-primary/20 text-primary" : "text-muted-foreground")}>
                {m === "probabilidade" ? "% sonolento" : "score médio"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Conteudo q={heatmap} altura={240}>
        {(d) => {
          const temDados = d.detalhes.some((l) => l.some(Boolean));
          if (!temDados) return <Vazio>Sem leituras nesse intervalo.</Vazio>;
          const muitas = d.dias.length > 10;
          return (
            <div className="space-y-1.5 overflow-x-auto">
              <div className="flex items-center gap-1 pl-14 text-[10px] text-muted-foreground min-w-fit">
                {d.dias.map((dia) => (
                  <div key={dia} className={cn("text-center", muitas ? "w-7 shrink-0" : "flex-1")}>
                    {muitas ? dia.slice(8, 10) : `${DIAS_SEMANA[new Date(`${dia}T12:00:00`).getDay()]} ${diaMes(dia)}`}
                  </div>
                ))}
              </div>
              {d.faixas.map((faixa, i) => (
                <div key={faixa} className="flex items-center gap-1 min-w-fit">
                  <div className="w-12 shrink-0 text-xs text-muted-foreground font-mono">{faixa}</div>
                  {d.dias.map((dia, j) => {
                    const det = d.detalhes[i][j];
                    const v = medida === "probabilidade" ? d.valores[i][j] : (det?.fadiga ?? null);
                    return (
                      <div
                        key={dia}
                        className={cn(
                          "aspect-[3/2] rounded-md flex items-center justify-center text-[10px] font-medium transition-transform hover:scale-110",
                          muitas ? "w-7 shrink-0" : "flex-1",
                          v === null ? "bg-secondary/30 text-muted-foreground" : "text-background/90",
                        )}
                        style={v === null ? undefined : { background: corPara(v, medida) }}
                        title={
                          det
                            ? `${faixa} de direção • ${diaMes(dia)}: ${num(d.valores[i][j])}% sonolento, score médio ${num(det.fadiga, 1)}, ${det.alertas} alertas, ${det.leituras} leituras`
                            : `${faixa} • ${diaMes(dia)}: sem leituras`
                        }
                      >
                        {v === null ? "·" : num(v, 0)}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center gap-2 pt-3 text-[10px] text-muted-foreground">
                <span>Baixo</span>
                <div className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(to right, ${ESCALA_RISCO.join(", ")})` }} />
                <span>Crítico</span>
              </div>
            </div>
          );
        }}
      </Conteudo>
    </div>
  );
}
