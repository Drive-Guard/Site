/**
 * Tema claro/escuro.
 *
 * A preferência fica no localStorage ("claro", "escuro" ou "sistema") e vira a
 * classe .dark no <html>. O index.html aplica a mesma regra antes do React
 * carregar, para a página não piscar no tema errado.
 */

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "./utils";

export type PreferenciaTema = "claro" | "escuro" | "sistema";

const CHAVE = "dg-tema";

function lerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === "claro" || v === "escuro" || v === "sistema" ? v : "sistema";
  } catch {
    return "sistema";
  }
}

function sistemaEscuro() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function aplicar(p: PreferenciaTema) {
  const escuro = p === "escuro" || (p === "sistema" && sistemaEscuro());
  document.documentElement.classList.toggle("dark", escuro);
}

export function useTema() {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(lerPreferencia);

  useEffect(() => {
    aplicar(preferencia);
    try {
      localStorage.setItem(CHAVE, preferencia);
    } catch {
      /* navegador sem armazenamento: vale só nesta sessão */
    }
    if (preferencia !== "sistema") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const mudou = () => aplicar("sistema");
    mq.addEventListener("change", mudou);
    return () => mq.removeEventListener("change", mudou);
  }, [preferencia]);

  return { preferencia, definir: setPreferencia };
}

const OPCOES: { valor: PreferenciaTema; rotulo: string; icone: typeof Sun }[] = [
  { valor: "claro", rotulo: "Tema claro", icone: Sun },
  { valor: "escuro", rotulo: "Tema escuro", icone: Moon },
  { valor: "sistema", rotulo: "Seguir o sistema", icone: Monitor },
];

/** Seletor compacto (três botões) para o cabeçalho e a tela de login. */
export function SeletorTema({ className }: { className?: string }) {
  const { preferencia, definir } = useTema();
  return (
    <div role="radiogroup" aria-label="Tema" className={cn("inline-flex items-center rounded-lg border border-border bg-secondary/50 p-0.5", className)}>
      {OPCOES.map(({ valor, rotulo, icone: Icone }) => (
        <button
          key={valor}
          type="button"
          role="radio"
          aria-checked={preferencia === valor}
          title={rotulo}
          onClick={() => definir(valor)}
          className={cn(
            "p-1.5 rounded-md transition",
            preferencia === valor ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icone className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
