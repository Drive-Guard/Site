/**
 * Navegação pela URL.
 *
 * A URL guarda a aba, os filtros globais (período, região, tipo de veículo) e
 * os parâmetros de cada aba (motorista selecionado, filtro da lista, janela
 * dos alertas...). Assim:
 *   - um clique numa métrica leva à tela certa já filtrada (`useIrPara`);
 *   - o voltar/avançar do navegador funciona;
 *   - o link copiado abre a mesma visão (o e-mail de relatório usa isso).
 *
 * Parâmetros por aba:
 *   motoristas    filtro=ativos|risco|alertas|ocorrencias|todos, ordem=media,
 *                 motorista=<id>, codigo=DRV-1000, rota=Cidade|Cidade
 *   monitoramento horas=6..720, gravidade=graves
 *   relatorios    faixa=madrugada|manha|tarde|noite, risco=critical|high|...
 */

import { useCallback, useSyncExternalStore } from "react";

const EVENTO = "dg:url";

/** Filtros globais: sobrevivem à troca de aba. */
const GLOBAIS = ["periodo", "de", "ate", "regiao", "tipo_veiculo"];

function assinar(aviso: () => void) {
  window.addEventListener("popstate", aviso);
  window.addEventListener(EVENTO, aviso);
  return () => {
    window.removeEventListener("popstate", aviso);
    window.removeEventListener(EVENTO, aviso);
  };
}

const ler = () => window.location.search;

/** Parâmetros atuais da URL (re-renderiza quando mudam). */
export function useParametros(): URLSearchParams {
  const busca = useSyncExternalStore(assinar, ler, ler);
  return new URLSearchParams(busca);
}

export function useParametro(nome: string): string | null {
  return useParametros().get(nome);
}

type Valores = Record<string, string | number | null | undefined>;

/**
 * Altera a URL. `historico` cria uma entrada (o voltar retorna); sem ele, só
 * substitui (troca de filtro, digitação).
 */
export function escreverParametros(valores: Valores, opcoes: { historico?: boolean; limpar?: boolean } = {}) {
  const url = new URL(window.location.href);
  if (opcoes.limpar) {
    for (const chave of [...url.searchParams.keys()]) {
      if (!GLOBAIS.includes(chave)) url.searchParams.delete(chave);
    }
  }
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor === null || valor === undefined || valor === "") url.searchParams.delete(chave);
    else url.searchParams.set(chave, String(valor));
  }
  if (url.search === window.location.search) return;
  if (opcoes.historico) window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(EVENTO));
}

/**
 * Vai para uma aba com parâmetros próprios (e, se quiser, outros filtros
 * globais). Os parâmetros da aba anterior são descartados; os filtros
 * globais ficam.
 */
export function useIrPara() {
  return useCallback((aba: string, parametros: Valores = {}) => {
    escreverParametros({ aba, ...parametros }, { historico: true, limpar: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
}

/** Faixa do dia (filtro dos relatórios) de uma hora "HH:MM". */
export function faixaDaHora(horaTexto: string | null | undefined): string | null {
  const h = Number(horaTexto?.slice(0, 2));
  if (Number.isNaN(h)) return null;
  if (h < 6) return "madrugada";
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
}
