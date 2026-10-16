/**
 * Login com Amazon Cognito (fluxo USER_PASSWORD_AUTH chamado direto pela API
 * do Cognito, sem SDK) e sessão da dashboard.
 *
 * O ID token vai como Bearer para a API; o autorizador JWT do API Gateway o
 * valida. Dele saem nome, e-mail, empresa e papéis (grupos do Cognito).
 * No primeiro acesso o Cognito exige trocar a senha temporária
 * (NEW_PASSWORD_REQUIRED).
 *
 * Em modo de desenvolvimento (config.auth = "dev") a tela de login só pede o
 * papel, e o token é "dev:<papel>", aceito apenas pelo servidor local.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { config, loginDeDesenvolvimento } from "./config";

export type Papel = "admin" | "gestor" | "operador";
const PAPEIS: Papel[] = ["admin", "gestor", "operador"];

export interface UsuarioSessao {
  nome: string;
  email: string;
  empresaId: string;
  papeis: Papel[];
  papel: Papel;
}

interface SessaoGravada {
  idToken: string;
  refreshToken?: string;
  expiraEm: number;
  email: string;
}

const CHAVE = "driveguard.sessao";

export class ErroLogin extends Error {}

function decodificarJwt(token: string): Record<string, unknown> {
  const parte = token.split(".")[1] ?? "";
  const json = atob(parte.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parte.length / 4) * 4, "="));
  return JSON.parse(decodeURIComponent(escape(json)));
}

function papeisDe(valor: unknown): Papel[] {
  const itens = Array.isArray(valor) ? valor.map(String) : typeof valor === "string" ? valor.replace(/^\[|\]$/g, "").split(/[\s,]+/) : [];
  return PAPEIS.filter((p) => itens.includes(p));
}

function usuarioDoToken(token: string): UsuarioSessao {
  if (token.startsWith("dev:")) {
    const papel = token.slice(4) as Papel;
    return { nome: `${papel[0].toUpperCase()}${papel.slice(1)} (desenvolvimento)`, email: `${papel}@dev.local`, empresaId: "", papeis: [papel], papel };
  }
  const c = decodificarJwt(token);
  const papeis = papeisDe(c["cognito:groups"]);
  return {
    nome: String(c.name ?? c.email ?? "Usuário"),
    email: String(c.email ?? ""),
    empresaId: String(c["custom:empresa_id"] ?? ""),
    papeis,
    papel: PAPEIS.find((p) => papeis.includes(p)) ?? "operador",
  };
}

// ---------------------------------------------------------------------------
// API do Cognito
// ---------------------------------------------------------------------------

const MENSAGENS: Record<string, string> = {
  NotAuthorizedException: "E-mail ou senha incorretos.",
  UserNotFoundException: "E-mail ou senha incorretos.",
  UserNotConfirmedException: "Usuário ainda não confirmado.",
  PasswordResetRequiredException: "É preciso redefinir a senha. Fale com o administrador.",
  InvalidPasswordException: "A nova senha precisa ter ao menos 10 caracteres, com letra maiúscula, minúscula e número.",
  InvalidParameterException: "Dados inválidos.",
  TooManyRequestsException: "Muitas tentativas. Aguarde um pouco.",
  LimitExceededException: "Muitas tentativas. Aguarde um pouco.",
};

async function cognito<T>(acao: string, corpo: unknown): Promise<T> {
  const { cognito: c } = config();
  const r = await fetch(`https://cognito-idp.${c!.regiao}.amazonaws.com/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": `AWSCognitoIdentityProviderService.${acao}` },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const tipo = String(dados.__type ?? "").split("#").pop() ?? "";
    throw new ErroLogin(MENSAGENS[tipo] ?? dados.message ?? "Não foi possível entrar.");
  }
  return dados as T;
}

interface ResultadoAuth {
  AuthenticationResult?: { IdToken: string; RefreshToken?: string; ExpiresIn: number };
  ChallengeName?: string;
  Session?: string;
}

function gravar(r: ResultadoAuth, email: string, refreshAnterior?: string): SessaoGravada {
  const a = r.AuthenticationResult!;
  const s: SessaoGravada = { idToken: a.IdToken, refreshToken: a.RefreshToken ?? refreshAnterior, expiraEm: Date.now() + a.ExpiresIn * 1000, email };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(s));
  } catch {
    /* navegador sem armazenamento: a sessão dura só esta aba */
  }
  return s;
}

function lerGravada(): SessaoGravada | null {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as SessaoGravada | null;
    return s?.idToken ? s : null;
  } catch {
    return null;
  }
}

let sessaoEmMemoria: SessaoGravada | null = null;
let renovando: Promise<SessaoGravada | null> | null = null;
let aoExpirar: (() => void) | null = null;

/** Token para a API, renovado com o refresh token quando está para vencer. */
export async function tokenAtual(): Promise<string> {
  const s = sessaoEmMemoria;
  if (!s) throw new ErroLogin("Sessão expirada.");
  if (s.idToken.startsWith("dev:") || s.expiraEm - Date.now() > 60_000) return s.idToken;
  if (!s.refreshToken) {
    aoExpirar?.();
    throw new ErroLogin("Sessão expirada.");
  }
  renovando ??= cognito<ResultadoAuth>("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: config().cognito!.clientId,
    AuthParameters: { REFRESH_TOKEN: s.refreshToken },
  })
    .then((r) => (sessaoEmMemoria = gravar(r, s.email, s.refreshToken)))
    .catch(() => {
      aoExpirar?.();
      return null;
    })
    .finally(() => (renovando = null));
  const nova = await renovando;
  if (!nova) throw new ErroLogin("Sessão expirada.");
  return nova.idToken;
}

// ---------------------------------------------------------------------------
// Contexto React
// ---------------------------------------------------------------------------

export interface DesafioNovaSenha {
  email: string;
  session: string;
}

interface ContextoAuth {
  usuario: UsuarioSessao | null;
  desenvolvimento: boolean;
  entrar(email: string, senha: string): Promise<DesafioNovaSenha | null>;
  definirNovaSenha(desafio: DesafioNovaSenha, novaSenha: string): Promise<void>;
  entrarComoDev(papel: Papel): void;
  sair(): void;
  pode(...papeis: Papel[]): boolean;
}

const Contexto = createContext<ContextoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const desenvolvimento = loginDeDesenvolvimento();
  const [sessao, setSessao] = useState<SessaoGravada | null>(() => {
    const s = lerGravada();
    // Sessão de outro modo (dev x Cognito) não vale.
    if (!s || s.idToken.startsWith("dev:") !== desenvolvimento) return null;
    if (!s.idToken.startsWith("dev:") && !s.refreshToken && s.expiraEm < Date.now()) return null;
    return s;
  });

  useEffect(() => {
    sessaoEmMemoria = sessao;
  }, [sessao]);
  sessaoEmMemoria = sessao;

  const sair = useCallback(() => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* ignora */
    }
    sessaoEmMemoria = null;
    setSessao(null);
  }, []);

  useEffect(() => {
    aoExpirar = sair;
    return () => {
      aoExpirar = null;
    };
  }, [sair]);

  const valor = useMemo<ContextoAuth>(() => {
    const usuario = sessao ? usuarioDoToken(sessao.idToken) : null;
    return {
      usuario,
      desenvolvimento,
      async entrar(email, senha) {
        const r = await cognito<ResultadoAuth>("InitiateAuth", {
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: config().cognito!.clientId,
          AuthParameters: { USERNAME: email.trim().toLowerCase(), PASSWORD: senha },
        });
        if (r.ChallengeName === "NEW_PASSWORD_REQUIRED") return { email: email.trim().toLowerCase(), session: r.Session! };
        if (!r.AuthenticationResult) throw new ErroLogin(`Etapa de login não suportada: ${r.ChallengeName ?? "?"}`);
        setSessao(gravar(r, email));
        return null;
      },
      async definirNovaSenha(desafio, novaSenha) {
        const r = await cognito<ResultadoAuth>("RespondToAuthChallenge", {
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ClientId: config().cognito!.clientId,
          Session: desafio.session,
          ChallengeResponses: { USERNAME: desafio.email, NEW_PASSWORD: novaSenha },
        });
        setSessao(gravar(r, desafio.email));
      },
      entrarComoDev(papel) {
        const s = { idToken: `dev:${papel}`, expiraEm: Number.MAX_SAFE_INTEGER, email: `${papel}@dev.local` };
        try {
          localStorage.setItem(CHAVE, JSON.stringify(s));
        } catch {
          /* ignora */
        }
        setSessao(s);
      },
      sair,
      pode: (...papeis) => !!usuario && usuario.papeis.some((p) => papeis.includes(p)),
    };
  }, [sessao, desenvolvimento, sair]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ContextoAuth {
  const c = useContext(Contexto);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}

export const ROTULO_PAPEL: Record<Papel, string> = { admin: "Administrador", gestor: "Gestor", operador: "Operador" };
