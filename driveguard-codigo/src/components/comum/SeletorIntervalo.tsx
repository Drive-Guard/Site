/** Escolha de intervalo de datas (calendário em popover). */

import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { diaIso } from "@/lib/formato";
import { cn } from "@/lib/utils";

const paraData = (dia?: string) => (dia ? new Date(`${dia}T12:00:00`) : undefined);
const rotulo = (dia?: string) => (dia ? dia.split("-").reverse().join("/") : "");

export function SeletorIntervalo({
  de,
  ate,
  aoMudar,
  maxDias,
  className,
  textoVazio = "Escolher datas",
}: {
  de?: string;
  ate?: string;
  aoMudar: (de: string, ate: string) => void;
  maxDias?: number;
  className?: string;
  textoVazio?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [intervalo, setIntervalo] = useState<DateRange | undefined>({ from: paraData(de), to: paraData(ate) });
  const hoje = new Date();

  function selecionar(r: DateRange | undefined) {
    setIntervalo(r);
    if (r?.from && r?.to) {
      let inicio = r.from;
      if (maxDias) {
        const limite = new Date(r.to);
        limite.setDate(limite.getDate() - (maxDias - 1));
        if (inicio < limite) inicio = limite;
      }
      aoMudar(diaIso(inicio), diaIso(r.to));
      setAberto(false);
    }
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 bg-secondary/60 border border-border text-sm rounded-lg px-3 py-2 text-foreground hover:border-primary/50",
            className,
          )}
        >
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          {de ? `${rotulo(de)} – ${rotulo(ate ?? de)}` : textoVazio}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          locale={ptBR}
          numberOfMonths={2}
          selected={intervalo}
          onSelect={selecionar}
          disabled={{ after: hoje }}
          defaultMonth={paraData(de) ?? new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)}
        />
        {maxDias && <p className="px-3 pb-3 text-[11px] text-muted-foreground">Máximo de {maxDias} dias.</p>}
      </PopoverContent>
    </Popover>
  );
}
