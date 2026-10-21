/**
 * Lista de escolha estilizada, no lugar do <select> nativo (cuja caixa que
 * desce é do sistema operacional: quadrada e sem o tema da dashboard).
 *
 * Vazio ("") vale como opção: o Radix não aceita value vazio, então ele vira
 * um marcador interno e volta como "" no aoMudar.
 */

import type { ComponentType, ReactNode } from "react";
import * as S from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const VAZIO = "__vazio__";

export interface OpcaoSelecao {
  valor: string;
  rotulo: ReactNode;
  /** Linha menor abaixo do rótulo, só na lista (não aparece no campo). */
  detalhe?: ReactNode;
  desabilitada?: boolean;
}

export function Selecao({
  valor,
  aoMudar,
  opcoes,
  placeholder = "Escolha…",
  icone: Icone,
  rotulo,
  tamanho = "md",
  desabilitado,
  className,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: OpcaoSelecao[];
  placeholder?: string;
  icone?: ComponentType<{ className?: string }>;
  /** Nome acessível do campo (aria-label). */
  rotulo?: string;
  tamanho?: "sm" | "md";
  desabilitado?: boolean;
  className?: string;
}) {
  const atual = valor === "" ? (opcoes.some((o) => o.valor === "") ? VAZIO : undefined) : valor;
  return (
    <S.Root value={atual} onValueChange={(v) => aoMudar(v === VAZIO ? "" : v)} disabled={desabilitado}>
      <S.Trigger
        aria-label={rotulo}
        className={cn(
          "group inline-flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/60 text-left text-foreground transition",
          "hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "data-[state=open]:border-primary/50 data-[state=open]:ring-2 data-[state=open]:ring-primary/15",
          "data-[placeholder]:text-muted-foreground disabled:opacity-60",
          tamanho === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm",
          className,
        )}
      >
        {Icone && <Icone className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate">
          <S.Value placeholder={placeholder} />
        </span>
        <S.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            "z-[60] min-w-[var(--radix-select-trigger-width)] max-w-[min(28rem,calc(100vw-24px))] overflow-hidden",
            "max-h-[min(var(--radix-select-content-available-height),22rem)]",
            "rounded-xl border border-border bg-popover text-popover-foreground shadow-xl shadow-black/15",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          <S.ScrollUpButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronUp className="h-4 w-4" />
          </S.ScrollUpButton>
          <S.Viewport className="p-1.5">
            {opcoes.map((o) => (
              <S.Item
                key={o.valor || VAZIO}
                value={o.valor === "" ? VAZIO : o.valor}
                disabled={o.desabilitada}
                className={cn(
                  "relative flex cursor-pointer select-none items-start gap-2 rounded-lg py-2 pl-8 pr-3 text-sm outline-none transition-colors",
                  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                  "data-[state=checked]:font-medium data-[disabled]:opacity-50",
                )}
              >
                <S.ItemIndicator className="absolute left-2.5 top-2.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </S.ItemIndicator>
                <div className="min-w-0">
                  <S.ItemText>{o.rotulo}</S.ItemText>
                  {o.detalhe && <div className="mt-0.5 text-[11px] font-normal text-muted-foreground">{o.detalhe}</div>}
                </div>
              </S.Item>
            ))}
          </S.Viewport>
          <S.ScrollDownButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
          </S.ScrollDownButton>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
