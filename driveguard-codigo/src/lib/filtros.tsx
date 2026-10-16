/** Filtros globais da dashboard (período, região, tipo de veículo). */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Query } from "./api";

export type Periodo = "7d" | "30d" | "90d" | "ano" | "personalizado";

export interface Filtros {
  periodo: Periodo;
  de?: string;
  ate?: string;
  regiao: string;
  tipoVeiculo: string;
}

interface ContextoFiltros {
  filtros: Filtros;
  definir(parcial: Partial<Filtros>): void;
  /** Query string para a API (período, região e tipo de veículo). */
  query: Query;
  rotuloPeriodo: string;
}

const Contexto = createContext<ContextoFiltros | null>(null);

export const ROTULO_PERIODO: Record<Periodo, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  ano: "Este ano",
  personalizado: "Personalizado",
};

export function FiltrosProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltros] = useState<Filtros>({ periodo: "30d", regiao: "", tipoVeiculo: "" });

  const valor = useMemo<ContextoFiltros>(() => {
    const query: Query =
      filtros.periodo === "personalizado" && filtros.de
        ? { de: filtros.de, ate: filtros.ate ?? filtros.de }
        : { periodo: filtros.periodo === "personalizado" ? "30d" : filtros.periodo };
    if (filtros.regiao) query.regiao = filtros.regiao;
    if (filtros.tipoVeiculo) query.tipo_veiculo = filtros.tipoVeiculo;
    const rotuloPeriodo =
      filtros.periodo === "personalizado" && filtros.de
        ? `${filtros.de.split("-").reverse().join("/")} a ${(filtros.ate ?? filtros.de).split("-").reverse().join("/")}`
        : ROTULO_PERIODO[filtros.periodo];
    return { filtros, definir: (p) => setFiltros((f) => ({ ...f, ...p })), query, rotuloPeriodo };
  }, [filtros]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useFiltros() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useFiltros fora do FiltrosProvider");
  return c;
}
