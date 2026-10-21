/**
 * Mesma regra do Backend (src/lib/identificadores.ts), do ETL e do cliente do
 * modelo: sem acento, e espaço, ponto ou outro símbolo viram hífen. Aqui só
 * serve para mostrar, enquanto a pessoa digita, como o ID vai ficar.
 */

export function normalizarId(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const normalizarDispositivo = (valor: string) => normalizarId(valor).toLowerCase();

/** Código sugerido a partir do nome ("João da Silva" -> "joao-da-silva"). */
export const codigoDoNome = (nome: string) => normalizarId(nome).toLowerCase().slice(0, 40).replace(/-+$/, "");
