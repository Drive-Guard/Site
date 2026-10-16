import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Vazio } from "@/components/comum/Estado";
import { num } from "@/lib/formato";
import { CHIP_RISCO, PONTO_RISCO, ROTULO_RISCO } from "@/lib/risco";
import type { RotaDesempenho } from "@/lib/tipos";
import { cn } from "@/lib/utils";

export function RiskRoutesList({ rotas }: { rotas: RotaDesempenho[] }) {
  if (rotas.length === 0) {
    return <Vazio>Nenhuma viagem casada com rota no período. Cadastre rotas e viagens em Cadastros.</Vazio>;
  }
  return (
    <ul className="flex flex-col gap-2 h-full max-h-[340px] overflow-auto pr-1">
      {rotas.map((r) => {
        const subiu = (r.tendencia ?? 0) >= 0;
        return (
          <li key={r.rotaId} className="rounded-xl border border-border p-3 hover:bg-secondary/40 transition">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("h-2 w-2 rounded-full shrink-0", PONTO_RISCO[r.risco])} />
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  <span className="truncate">{r.origemCidade}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{r.destinoCidade}</span>
                </p>
              </div>
              <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0", CHIP_RISCO[r.risco])}>
                {ROTULO_RISCO[r.risco]}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>
                  Fadiga <span className="font-semibold text-foreground">{num(r.fadiga, 1)}</span>
                </span>
                <span>
                  Alertas <span className="font-semibold text-foreground">{r.eventos}</span>
                </span>
              </div>
              {r.tendencia !== null && (
                <span className={cn("inline-flex items-center gap-1 font-medium", subiu ? "text-risk-high" : "text-risk-low")}>
                  {subiu ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {subiu ? "+" : ""}
                  {r.tendencia}%
                </span>
              )}
            </div>
            {r.prf && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                PRF (BR-{r.brs.join(", BR-")}): <span className="text-foreground font-medium">{num(r.prf.acidentesSono)}</span> acidentes por sono em 12 meses
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
