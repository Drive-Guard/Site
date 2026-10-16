import { ReactNode } from "react";
import { Dica } from "@/components/comum/Dica";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Explicação do gráfico (ícone "i" ao lado do título). */
  info?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, action, info, children, className }: ChartCardProps) {
  return (
    <div className={cn("glass-card rounded-xl p-5 flex flex-col h-full", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4 shrink-0">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
            {title}
            {info && <Dica texto={info} />}
          </h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}