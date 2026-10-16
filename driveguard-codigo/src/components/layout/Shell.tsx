/**
 * Casca da dashboard: cabeçalho, abas conforme o papel e o conteúdo.
 *
 * Duas visões principais, como pedido no TCC:
 *   - Visão gerencial (admin, gestor): KPIs do período, impacto estimado,
 *     rotas, base comparativa da PRF, insights;
 *   - Monitoramento (todos): tempo real, alertas, tendência no turno,
 *     heatmap e fadiga x tempo de direção.
 * A aba fica na URL (?aba=...), para links como o do e-mail de relatório.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, LogOut } from "lucide-react";
import { Carregando } from "@/components/comum/Estado";
import { api } from "@/lib/api";
import { type Papel, ROTULO_PAPEL, useAuth } from "@/lib/auth";
import type { Me } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const VisaoGerencial = lazy(() => import("@/components/gerencial/VisaoGerencial"));
const Monitoramento = lazy(() => import("@/components/tecnica/Monitoramento"));
const Motoristas = lazy(() => import("@/components/dashboard/DriversMonitor"));
const Relatorios = lazy(() => import("@/components/dashboard/ReportsCenter"));
const Cadastros = lazy(() => import("@/components/cadastros/Cadastros"));
const Usuarios = lazy(() => import("@/components/usuarios/Usuarios"));

interface Aba {
  id: string;
  titulo: string;
  papeis: Papel[];
  componente: React.LazyExoticComponent<() => React.JSX.Element>;
}

const ABAS: Aba[] = [
  { id: "gerencial", titulo: "Visão Gerencial", papeis: ["admin", "gestor"], componente: VisaoGerencial },
  { id: "monitoramento", titulo: "Monitoramento", papeis: ["admin", "gestor", "operador"], componente: Monitoramento },
  { id: "motoristas", titulo: "Motoristas", papeis: ["admin", "gestor", "operador"], componente: Motoristas },
  { id: "relatorios", titulo: "Relatórios", papeis: ["admin", "gestor"], componente: Relatorios },
  { id: "cadastros", titulo: "Cadastros", papeis: ["admin", "gestor"], componente: Cadastros },
  { id: "usuarios", titulo: "Usuários", papeis: ["admin"], componente: Usuarios },
];

function abaDaUrl(): string | null {
  return new URLSearchParams(window.location.search).get("aba");
}

export function Shell() {
  const { usuario, sair, pode } = useAuth();
  const abas = useMemo(() => ABAS.filter((a) => pode(...a.papeis)), [pode]);
  const [ativa, setAtiva] = useState(() => {
    const daUrl = abaDaUrl();
    return abas.find((a) => a.id === daUrl)?.id ?? abas[0]?.id;
  });

  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/me"), staleTime: 5 * 60_000 });

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("aba", ativa);
    window.history.replaceState(null, "", url);
  }, [ativa]);

  const Atual = abas.find((a) => a.id === ativa)?.componente;
  const iniciais = (usuario?.nome ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-30 bg-background/70">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.6_0.22_280)] flex items-center justify-center glow-primary">
              <Eye className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight">
                Drive<span className="text-gradient">Guard</span>
              </h1>
              <p className="text-xs text-muted-foreground">{me.data?.empresa.nome ?? "Detecção de fadiga & prevenção de acidentes"}</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 text-sm overflow-x-auto">
            {abas.map((a) => (
              <button
                key={a.id}
                onClick={() => setAtiva(a.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition whitespace-nowrap",
                  ativa === a.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                {a.titulo}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium leading-tight">{usuario?.nome}</p>
              <p className="text-xs text-muted-foreground">{usuario ? ROTULO_PAPEL[usuario.papel] : ""}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-[oklch(0.6_0.22_280)] flex items-center justify-center text-sm font-bold text-primary-foreground">
              {iniciais}
            </div>
            <button onClick={sair} title="Sair" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <Suspense fallback={<Carregando altura={400} />}>{Atual && <Atual />}</Suspense>
      </main>
    </div>
  );
}
