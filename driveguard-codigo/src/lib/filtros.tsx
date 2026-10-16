/** Filtros globais da dashboard (período, região, tipo de veículo). */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Query } from "./api";
import { escreverParametros, useParametros } from "./navegacao";

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

const PERIODOS: Periodo[] = ["7d", "30d", "90d", "ano", "personalizado"];

/**
 * Os filtros moram na URL (?periodo=&de=&ate=&regiao=&tipo_veiculo=), para
 * os atalhos entre telas abrirem já filtrados e o voltar do navegador
 * funcionar (ver lib/navegacao.tsx).
 */
export function FiltrosProvider({ children }: { children: ReactNode }) {
  const url = useParametros();
  const periodoUrl = url.get("periodo") as Periodo | null;
  const de = url.get("de") ?? undefined;
  const ate = url.get("ate") ?? undefined;
  const filtros: Filtros = {
    periodo: de ? "personalizado" : periodoUrl && PERIODOS.includes(periodoUrl) ? periodoUrl : "30d",
    de,
    ate,
    regiao: url.get("regiao") ?? "",
    tipoVeiculo: url.get("tipo_veiculo") ?? "",
  };
  const chave = JSON.stringify(filtros);

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
    const definir = (p: Partial<Filtros>) => {
      const novo = { ...filtros, ...p };
      const personalizado = novo.periodo === "personalizado";
      escreverParametros({
        periodo: novo.periodo === "30d" ? null : novo.periodo,
        de: personalizado ? novo.de : null,
        ate: personalizado ? novo.ate : null,
        regiao: novo.regiao || null,
        tipo_veiculo: novo.tipoVeiculo || null,
      });
    };
    return { filtros, definir, query, rotuloPeriodo };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useFiltros() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useFiltros fora do FiltrosProvider");
  return c;
}
