import { useState } from "react";
import { Calendar, Download, Loader2, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";
import { SeletorIntervalo } from "@/components/comum/SeletorIntervalo";
import { baixarCsv, mensagemDeErro } from "@/lib/api";
import { type Periodo, ROTULO_PERIODO, useFiltros } from "@/lib/filtros";
import { diaIso } from "@/lib/formato";

const select =
  "bg-secondary/60 border border-border text-sm rounded-lg pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none";

export const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
export const TIPOS_VEICULO = [
  { valor: "caminhao", rotulo: "Caminhão" },
  { valor: "onibus", rotulo: "Ônibus" },
  { valor: "van", rotulo: "Van" },
  { valor: "carro_app", rotulo: "Carro App" },
];

export function Filters({ ao_vivo = true, exportar = true }: { ao_vivo?: boolean; exportar?: boolean }) {
  const { filtros, definir, query } = useFiltros();
  const [baixando, setBaixando] = useState(false);

  async function exportarCsv() {
    setBaixando(true);
    try {
      await baixarCsv("/dashboard/exportar", query, `driveguard-motoristas-${diaIso(new Date())}.csv`);
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
      <div className="relative">
        <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <select className={select} value={filtros.periodo} onChange={(e) => definir({ periodo: e.target.value as Periodo })}>
          {(Object.keys(ROTULO_PERIODO) as Periodo[]).map((p) => (
            <option key={p} value={p}>
              {ROTULO_PERIODO[p]}
            </option>
          ))}
        </select>
      </div>
      {filtros.periodo === "personalizado" && (
        <SeletorIntervalo de={filtros.de} ate={filtros.ate} maxDias={400} aoMudar={(de, ate) => definir({ de, ate })} />
      )}
      <div className="relative">
        <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <select className={select} value={filtros.regiao} onChange={(e) => definir({ regiao: e.target.value })}>
          <option value="">Todas as regiões</option>
          {REGIOES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="relative">
        <Truck className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <select className={select} value={filtros.tipoVeiculo} onChange={(e) => definir({ tipoVeiculo: e.target.value })}>
          <option value="">Todos os veículos</option>
          {TIPOS_VEICULO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {ao_vivo && (
          <div className="flex items-center gap-2 text-xs text-risk-low font-medium px-3 py-2 rounded-lg bg-risk-low/10 border border-risk-low/30">
            <span className="h-2 w-2 rounded-full bg-risk-low pulse-dot" />
            Ao vivo • atualiza a cada 30 s
          </div>
        )}
        {exportar && (
          <button
            onClick={exportarCsv}
            disabled={baixando}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition glow-primary disabled:opacity-60"
          >
            {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar
          </button>
        )}
      </div>
    </div>
  );
}
