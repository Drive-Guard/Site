/** Cliente da API do Backend. */

import { tokenAtual } from "./auth";
import { config } from "./config";

export class ErroApi extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    public readonly detalhes?: { campo: string; mensagem: string }[] | unknown,
  ) {
    super(mensagem);
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

function montarUrl(caminho: string, query?: Query): string {
  const url = new URL(config().apiUrl + caminho);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function requisitar<T>(metodo: string, caminho: string, query?: Query, corpo?: unknown): Promise<T> {
  const token = await tokenAtual();
  const r = await fetch(montarUrl(caminho, query), {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  if (r.status === 204) return undefined as T;
  const tipo = r.headers.get("content-type") ?? "";
  const dados = tipo.includes("json") ? await r.json().catch(() => null) : await r.text();
  if (!r.ok) {
    const d = (dados ?? {}) as { erro?: string; message?: string; detalhes?: unknown };
    const mensagem =
      r.status === 401 ? "Sessão expirada. Entre de novo." : r.status === 403 ? (d.erro ?? "Seu papel não permite esta ação.") : (d.erro ?? d.message ?? `Erro ${r.status}`);
    throw new ErroApi(r.status, mensagem, d.detalhes);
  }
  return dados as T;
}

export const api = {
  get: <T>(caminho: string, query?: Query) => requisitar<T>("GET", caminho, query),
  post: <T>(caminho: string, corpo?: unknown) => requisitar<T>("POST", caminho, undefined, corpo ?? {}),
  put: <T>(caminho: string, corpo: unknown) => requisitar<T>("PUT", caminho, undefined, corpo),
  patch: <T>(caminho: string, corpo: unknown) => requisitar<T>("PATCH", caminho, undefined, corpo),
  del: <T = void>(caminho: string) => requisitar<T>("DELETE", caminho),
};

/** Baixa um CSV da API e entrega como download no navegador. */
export async function baixarCsv(caminho: string, query: Query, nome: string) {
  const texto = await api.get<string>(caminho, query);
  baixarArquivo(new Blob([texto], { type: "text/csv;charset=utf-8" }), nome);
}

export function baixarArquivo(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre um link temporário (S3) em nova aba para baixar. */
export function abrirDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.click();
}

export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroApi) {
    const det = Array.isArray(e.detalhes) ? (e.detalhes as { campo: string; mensagem: string }[]) : [];
    return det.length ? `${e.message}: ${det.map((d) => (d.campo ? `${d.campo} — ${d.mensagem}` : d.mensagem)).join("; ")}` : e.message;
  }
  return e instanceof Error ? e.message : "Erro inesperado";
}
