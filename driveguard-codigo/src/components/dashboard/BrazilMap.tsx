import { cityHotspots } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const sevColor: Record<string, string> = {
  critical: "bg-risk-critical",
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
};

export function BrazilMap() {
  return (
    <div className="relative aspect-[4/5] rounded-xl bg-gradient-to-br from-secondary/40 to-background/60 border border-border overflow-hidden">
      {/* Brazil silhouette - stylized */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-30">
        <path
          d="M30 18 Q40 14 55 16 Q72 18 80 26 Q86 34 84 44 Q88 54 82 64 Q78 76 70 84 Q60 92 48 90 Q36 88 30 80 Q22 72 24 60 Q18 50 22 40 Q24 28 30 18 Z"
          fill="oklch(0.72 0.18 220)"
          stroke="oklch(0.72 0.18 220)"
          strokeWidth="0.5"
        />
      </svg>
      {/* Hotspots */}
      {cityHotspots.map((c) => {
        const size = 8 + Math.min(28, c.cases / 12);
        return (
          <div
            key={c.city}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
          >
            <div
              className={cn("rounded-full opacity-30 absolute inset-0 -m-2 pulse-dot", sevColor[c.severity])}
              style={{ width: size + 16, height: size + 16 }}
            />
            <div
              className={cn("rounded-full ring-2 ring-background/80 cursor-pointer relative", sevColor[c.severity])}
              style={{ width: size, height: size }}
            />
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 -top-12 z-10 whitespace-nowrap bg-popover border border-border text-popover-foreground text-xs rounded-lg px-2 py-1 shadow-lg">
              <div className="font-semibold">{c.city} / {c.uf}</div>
              <div className="text-muted-foreground">{c.cases} casos</div>
            </div>
          </div>
        );
      })}
      {/* Legend */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] text-muted-foreground bg-background/60 backdrop-blur rounded-lg px-3 py-2 border border-border">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-risk-low" />Baixo</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-risk-medium" />Médio</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-risk-high" />Alto</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-risk-critical" />Crítico</span>
        </div>
        <span>{cityHotspots.reduce((a, c) => a + c.cases, 0)} casos mapeados</span>
      </div>
    </div>
  );
}