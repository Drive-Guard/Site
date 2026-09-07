import { heatmapData } from "@/lib/mockData";

function colorFor(v: number) {
  if (v < 25) return "oklch(0.75 0.18 150)";
  if (v < 50) return "oklch(0.82 0.17 85)";
  if (v < 75) return "oklch(0.7 0.2 45)";
  return "oklch(0.6 0.24 20)";
}

export function Heatmap() {
  const cols = ["1d", "2d", "3d", "4d", "5d", "6d", "7d"];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 pl-14 text-[10px] text-muted-foreground">
        {cols.map((c) => (
          <div key={c} className="flex-1 text-center">{c}</div>
        ))}
      </div>
      {heatmapData.map((row) => (
        <div key={row.hora} className="flex items-center gap-1">
          <div className="w-12 text-xs text-muted-foreground font-mono">{row.hora}</div>
          {row.values.map((v, i) => (
            <div
              key={i}
              className="flex-1 aspect-[3/2] rounded-md flex items-center justify-center text-[10px] font-medium text-background/90 transition-transform hover:scale-110 cursor-pointer"
              style={{ background: colorFor(v) }}
              title={`${row.hora} • dia ${i + 1}: ${v}% risco`}
            >
              {v}
            </div>
          ))}
        </div>
      ))}
      <div className="flex items-center gap-2 pt-3 text-[10px] text-muted-foreground">
        <span>Baixo</span>
        <div className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(to right, oklch(0.75 0.18 150), oklch(0.82 0.17 85), oklch(0.7 0.2 45), oklch(0.6 0.24 20))" }} />
        <span>Crítico</span>
      </div>
    </div>
  );
}