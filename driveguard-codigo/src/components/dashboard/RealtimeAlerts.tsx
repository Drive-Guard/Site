import { AlertTriangle, Clock, Eye, TrendingDown, TrendingUp } from "lucide-react";
import { Vazio } from "@/components/comum/Estado";
import { num, relativo } from "@/lib/formato";
import { CHIP_RISCO, PONTO_RISCO } from "@/lib/risco";
import type { MotoristaTempoReal } from "@/lib/tipos";
import { cn } from "@/lib/utils";

export function RealtimeAlerts({ motoristas, aoSelecionar }: { motoristas: MotoristaTempoReal[]; aoSelecionar?: (id: string) => void }) {
  if (motoristas.length === 0) {
    return <Vazio icone={<Eye className="h-5 w-5 text-risk-low" />}>Nenhum motorista sonolento (score ≥ 70) nos últimos 30 minutos.</Vazio>;
  }
  return (
    <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
      {motoristas.map((a) => (
        <button
          key={a.motoristaId}
          onClick={() => aoSelecionar?.(a.motoristaId)}
          title="Abrir o painel do motorista"
          className={cn("clicavel w-full text-left rounded-lg border p-3 flex items-center gap-3", CHIP_RISCO[a.risco])}
        >
          <div className={cn("h-2.5 w-2.5 rounded-full pulse-dot shrink-0", PONTO_RISCO[a.risco])} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm text-foreground truncate">{a.nome}</p>
              <span className="text-xs font-mono text-muted-foreground">{a.codigo}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
              {a.blinkRate !== null && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {num(a.blinkRate, 0)}/min
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {num(a.horasTurno, 1)} h de turno
              </span>
              <span>
                {a.veiculoCodigo ?? a.tipoVeiculo} • {a.regiao}
              </span>
              <span>{relativo(a.ultimaLeituraEm)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <span className="text-lg font-bold leading-none">{num(a.score, 0)}</span>
              {a.tendencia === "up" ? <TrendingUp className="h-3.5 w-3.5 text-risk-high" /> : a.tendencia === "down" ? <TrendingDown className="h-3.5 w-3.5 text-risk-low" /> : null}
            </div>
            <div className="text-[10px] uppercase tracking-wider opacity-80">fadiga</div>
          </div>
          {a.alertasHoje > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              {a.alertasHoje}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
