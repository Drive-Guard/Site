/**
 * Configuração de ambiente, lida de /config.json quando a página abre.
 *
 * Em produção o arquivo é gerado pelo Terraform (URL da API e IDs do Cognito)
 * e copiado para a EC2 junto com o site; o build é o mesmo em qualquer
 * ambiente. Localmente, public/config.json aponta para o servidor de
 * desenvolvimento do Backend com login de desenvolvimento.
 */

export interface Config {
  ambiente: string;
  apiUrl: string;
  /** "dev": login sem Cognito, só contra o servidor de desenvolvimento do Backend. */
  auth?: "dev" | "cognito";
  cognito?: { regiao: string; userPoolId: string; clientId: string };
}

let atual: Config | null = null;

export async function carregarConfig(): Promise<Config> {
  const r = await fetch("/config.json", { cache: "no-store" });
  if (!r.ok) throw new Error(`Não foi possível ler /config.json (${r.status}).`);
  const c = (await r.json()) as Config;
  if (!c.apiUrl) throw new Error("config.json sem apiUrl.");
  atual = { ...c, apiUrl: c.apiUrl.replace(/\/$/, "") };
  return atual;
}

export function config(): Config {
  if (!atual) throw new Error("Configuração ainda não carregada.");
  return atual;
}

export const loginDeDesenvolvimento = () => config().auth === "dev" || !config().cognito;
