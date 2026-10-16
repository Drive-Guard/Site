import { useState } from "react";
import { Building2, Calculator, Camera, Map, Route, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CamerasVeiculos } from "./CamerasVeiculos";
import { Motoristas } from "./Motoristas";
import { DadosEmpresa, ParametrosRoi } from "./ParametrosEmpresa";
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
  const Atual = SECOES.find((s) => s.id === ativa)!.componente;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SECOES.map((s) => (
          <button
            key={s.id}
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
    </div>
  );
}
