/** Filtros globais da dashboard (período, região, tipo de veículo). */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Query } from "./api";
import { diaIso } from "./formato";
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

/**
 * O período global como janela de turnos da aba Motoristas (?turnos=), para
 * um número "do período" abrir a lista do mesmo período, e não a de agora.
 */
export function janelaDoPeriodo(f: Filtros): { turnos: string; tde: string | null; tate: string | null } {
  if (f.periodo === "7d" || f.periodo === "30d") return { turnos: f.periodo, tde: null, tate: null };
  const hoje = diaIso(new Date());
  if (f.periodo === "personalizado" && f.de) return { turnos: "intervalo", tde: f.de, tate: f.ate ?? f.de };
  if (f.periodo === "90d") return { turnos: "intervalo", tde: diaIso(new Date(Date.now() - 89 * 86_400_000)), tate: hoje };
  if (f.periodo === "ano") return { turnos: "intervalo", tde: `${hoje.slice(0, 4)}-01-01`, tate: hoje };
  return { turnos: "30d", tde: null, tate: null };
}

export function useFiltros() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useFiltros fora do FiltrosProvider");
  return c;
}
