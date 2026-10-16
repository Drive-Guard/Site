/** Formatação pt-BR usada em toda a dashboard. */

export const num = (v: number | null | undefined, casas = 0) =>
  v === null || v === undefined || Number.isNaN(v) ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const numCompacto = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function reais(v: number | null | undefined, compacto = false) {
  if (v === null || v === undefined) return "—";
  if (compacto && Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (compacto && Math.abs(v) >= 10_000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export const pct = (v: number | null | undefined, casas = 0) => (v === null || v === undefined ? "—" : `${num(v, casas)}%`);

export function variacao(v: number | null | undefined) {
  if (v === null || v === undefined) return null;
  return `${v > 0 ? "+" : ""}${v}%`;
}

const fuso = { timeZone: "America/Sao_Paulo" } as const;

export const dataHora = (iso: string | Date | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { ...fuso, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export const hora = (iso: string | Date | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }) : "—";

export const dataCurta = (iso: string | Date | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { ...fuso, day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

/** '2026-10-16' -> '16/10'. */
export const diaMes = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/** '2025-12' -> 'dez/2025'. */
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const mesAno = (aaaaMm: string | null | undefined) => (aaaaMm ? `${MESES[Number(aaaaMm.slice(5, 7)) - 1]}/${aaaaMm.slice(0, 4)}` : "—");

export function relativo(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86_400)} d`;
}

/** Data local 'AAAA-MM-DD' de um Date (fuso de Brasília). */
export const diaIso = (d: Date) => d.toLocaleDateString("en-CA", fuso);

export const ROTULO_TIPO_VEICULO: Record<string, string> = { caminhao: "Caminhão", onibus: "Ônibus", van: "Van", carro_app: "Carro App" };
