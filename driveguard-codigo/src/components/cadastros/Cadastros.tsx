/**
 * Cadastros. O caminho principal é o assistente "Colocar câmera em
 * operação" (câmera, veículo e motorista de uma vez); a caixa de pendentes
 * mostra o que já manda dados sem cadastro. As abas ficam para consultar,
 * editar e excluir cada tipo.
 */

import { useState } from "react";
import { Building2, Calculator, Camera, Map, Route, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Assistente, type InicioAssistente } from "./Assistente";
import { CamerasVeiculos } from "./CamerasVeiculos";
import { Motoristas } from "./Motoristas";
import { DadosEmpresa, ParametrosRoi } from "./ParametrosEmpresa";
import { Pendentes } from "./Pendentes";
import { Rotas, Viagens } from "./RotasViagens";

const SECOES = [
  { id: "cameras", titulo: "Câmeras e veículos", icone: Camera, componente: CamerasVeiculos },
  { id: "motoristas", titulo: "Motoristas", icone: Users, componente: Motoristas },
  { id: "rotas", titulo: "Rotas", icone: Map, componente: Rotas },
  { id: "viagens", titulo: "Viagens", icone: Route, componente: Viagens },
  { id: "roi", titulo: "Parâmetros do ROI", icone: Calculator, componente: ParametrosRoi },
  { id: "empresa", titulo: "Empresa", icone: Building2, componente: DadosEmpresa },
];

export default function Cadastros() {
  const [ativa, setAtiva] = useState("cameras");
  const [assistente, setAssistente] = useState<InicioAssistente | null>(null);
  const Atual = SECOES.find((s) => s.id === ativa)!.componente;
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Pôr uma cabine para funcionar</h2>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Câmera, veículo e motorista numa tela só, já vinculados. No fim, o assistente mostra o que gravar no dispositivo (DRIVEGUARD_DEVICE_ID e
            DRIVEGUARD_MOTORISTA_ID).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAssistente({})}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" /> Colocar câmera em operação
        </button>
      </div>

      <Pendentes aoColocarEmOperacao={setAssistente} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Cadastros">
        {SECOES.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={ativa === s.id}
            onClick={() => setAtiva(s.id)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition",
              ativa === s.id ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            <s.icone className="h-4 w-4" /> {s.titulo}
          </button>
        ))}
      </div>
      <Atual />
      {assistente && <Assistente inicio={assistente} aoFechar={() => setAssistente(null)} />}
    </div>
  );
}
