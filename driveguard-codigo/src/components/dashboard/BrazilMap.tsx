/**
 * Mapa do Brasil com as cidades da base da PRF.
 *
 * O contorno é uma simplificação da fronteira (lon/lat) na mesma projeção
 * equirretangular dos pontos, então cada cidade cai no lugar certo.
 */

import type { NivelRisco } from "@/lib/risco";
import { num } from "@/lib/formato";
import { cn } from "@/lib/utils";

const LIMITE = { oeste: -74.5, leste: -34, norte: 5.8, sul: -34.2 };
const x = (lon: number) => ((lon - LIMITE.oeste) / (LIMITE.leste - LIMITE.oeste)) * 100;
const y = (lat: number) => ((LIMITE.norte - lat) / (LIMITE.norte - LIMITE.sul)) * 100;

// Fronteira simplificada, sentido horário a partir do Oiapoque.
const CONTORNO: [number, number][] = [
  [-51.6, 4.2], [-50.4, 2.2], [-49.9, 0.9], [-48.5, -1.3], [-46.6, -0.9], [-44.3, -2.5], [-41.8, -2.9], [-38.5, -3.7],
  [-36.9, -4.8], [-35.2, -5.6], [-34.8, -7.1], [-35.0, -8.1], [-35.7, -9.6], [-37.0, -11.0], [-38.5, -13.0], [-39.0, -15.0],
  [-39.6, -18.0], [-40.3, -20.3], [-41.0, -22.0], [-43.2, -22.9], [-45.0, -23.6], [-46.3, -24.0], [-48.0, -25.3],
  [-48.6, -26.5], [-48.7, -28.2], [-49.7, -29.5], [-51.2, -31.0], [-52.1, -32.2], [-53.4, -33.7], [-53.5, -32.5],
  [-55.5, -30.9], [-57.6, -30.2], [-55.7, -27.4], [-53.7, -26.2], [-54.6, -25.6], [-54.3, -24.0], [-55.6, -22.6],
  [-57.9, -22.1], [-57.8, -19.0], [-58.2, -17.5], [-60.2, -16.3], [-60.1, -13.6], [-61.9, -13.0], [-65.3, -11.0],
  [-66.0, -9.8], [-69.6, -11.0], [-72.6, -9.5], [-73.9, -7.4], [-72.9, -5.0], [-70.0, -4.2], [-69.4, -1.2], [-70.0, 0.6],
  [-66.9, 1.2], [-64.6, 2.3], [-63.0, 3.9], [-60.7, 5.2], [-59.9, 2.5], [-58.0, 1.5], [-56.0, 2.0], [-54.0, 2.2], [-52.5, 2.3],
];
const CAMINHO = CONTORNO.map(([lon, lat], i) => `${i ? "L" : "M"}${x(lon).toFixed(1)} ${y(lat).toFixed(1)}`).join(" ") + " Z";

const COR: Record<string, string> = {
  critical: "bg-risk-critical",
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
  sem_dados: "bg-muted-foreground",
};

export interface CidadeMapa {
  cidade: string;
  uf: string;
  latitude: number;
  longitude: number;
  acidentesSono: number;
  acidentes: number;
  mortos: number;
  severidade: NivelRisco;
}

export function BrazilMap({ cidades }: { cidades: CidadeMapa[] }) {
  const maximo = Math.max(1, ...cidades.map((c) => c.acidentesSono));
  return (
    <div className="relative aspect-square rounded-xl bg-gradient-to-br from-secondary/40 to-background/60 border border-border overflow-hidden">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <path d={CAMINHO} fill="oklch(0.72 0.18 220 / 0.12)" stroke="oklch(0.72 0.18 220 / 0.6)" strokeWidth="0.4" strokeLinejoin="round" />
      </svg>
      {cidades.map((c) => {
        const tamanho = 8 + (c.acidentesSono / maximo) * 18;
        return (
          <div key={`${c.cidade}-${c.uf}`} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{ left: `${x(c.longitude)}%`, top: `${y(c.latitude)}%` }}>
            <div className={cn("rounded-full opacity-25 absolute pulse-dot", COR[c.severidade])} style={{ width: tamanho + 12, height: tamanho + 12, left: -6, top: -6 }} />
            <div className={cn("rounded-full ring-2 ring-background/80 cursor-pointer relative", COR[c.severidade])} style={{ width: tamanho, height: tamanho }} />
            <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute left-1/2 -translate-x-1/2 -top-16 z-10 whitespace-nowrap bg-popover border border-border text-popover-foreground text-xs rounded-lg px-2 py-1 shadow-lg">
              <div className="font-semibold">
                {c.cidade} / {c.uf}
              </div>
              <div className="text-muted-foreground">
                {num(c.acidentesSono)} por sono • {num(c.acidentes)} no total • {num(c.mortos)} mortes
              </div>
            </div>
          </div>
        );
      })}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] text-muted-foreground bg-background/60 backdrop-blur rounded-lg px-3 py-2 border border-border">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-risk-low" />Baixo</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-risk-medium" />Médio</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-risk-high" />Alto</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-risk-critical" />Crítico</span>
        </div>
        <span>{num(cidades.reduce((a, c) => a + c.acidentesSono, 0))} acidentes por sono</span>
      </div>
    </div>
  );
}
