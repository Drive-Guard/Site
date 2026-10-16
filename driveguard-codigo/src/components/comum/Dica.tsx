/**
 * Dica explicativa (ícone "i"): abre ao passar o mouse e também ao tocar,
 * porque no celular não existe hover. Os textos ficam em lib/dicas.ts.
 */

import { Info } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DicaProps {
  texto: ReactNode;
  /** Elemento que dispara a dica; sem ele, um ícone "i". */
  children?: ReactNode;
  lado?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Dica({ texto, children, lado = "top", className }: DicaProps) {
  const [aberta, setAberta] = useState(false);
  return (
    <Tooltip open={aberta} onOpenChange={setAberta} delayDuration={150}>
      <TooltipTrigger asChild>
        {children ? (
          <span
            className={cn("inline-flex", className)}
            onClick={(e) => {
              e.stopPropagation();
              setAberta((v) => !v);
            }}
          >
            {children}
          </span>
        ) : (
          // span (e não button): a dica fica dentro de cartões que já são botões.
          <span
            role="button"
            tabIndex={0}
            aria-label="O que é isto?"
            onClick={(e) => {
              e.stopPropagation();
              setAberta((v) => !v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setAberta((v) => !v);
              }
            }}
            className={cn("inline-flex cursor-help text-muted-foreground/70 hover:text-foreground transition align-middle", className)}
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent
        side={lado}
        collisionPadding={12}
        className="max-w-[300px] bg-popover text-popover-foreground border border-border shadow-lg text-xs leading-relaxed font-normal normal-case tracking-normal"
      >
        {texto}
      </TooltipContent>
    </Tooltip>
  );
}
