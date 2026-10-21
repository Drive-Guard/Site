import { type ReactNode, useState } from "react";
import { Calendar, Download, Loader2, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";
import { Selecao } from "@/components/comum/Selecao";
import { SeletorIntervalo } from "@/components/comum/SeletorIntervalo";
import { baixarCsv, mensagemDeErro } from "@/lib/api";
import { type Periodo, ROTULO_PERIODO, useFiltros } from "@/lib/filtros";
import { diaIso } from "@/lib/formato";
import { Dica } from "@/components/comum/Dica";
import { DICAS } from "@/lib/dicas";

export const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
export const TIPOS_VEICULO = [
  { valor: "caminhao", rotulo: "Caminhão" },
  { valor: "onibus", rotulo: "Ônibus" },
  { valor: "van", rotulo: "Van" },
  { valor: "carro_app", rotulo: "Carro App" },
];

/**
 * Filtros globais. O período só aparece nas telas que olham para um intervalo
 * (Visão Gerencial); as telas do "agora" (Monitoramento, Motoristas) usam
 * janelas próprias em cada quadro e mostram o selo "Tempo real".
 */
export function Filters({
  ao_vivo = true,
  exportar = true,
  periodo = true,
  antes,
}: {
  ao_vivo?: boolean;
  exportar?: boolean;
  periodo?: boolean;
  /** Controles próprios da tela, no começo da barra (ex.: turnos da aba Motoristas). */
  antes?: ReactNode;
}) {
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
    <div className="glass-card rounded-xl p-4 flex flex-wrap items-center gap-3">
      {antes}
      {periodo && (
        <Selecao
          rotulo="Período"
          icone={Calendar}
          className="w-auto min-w-44"
          valor={filtros.periodo}
          aoMudar={(v) => definir({ periodo: v as Periodo })}
          opcoes={(Object.keys(ROTULO_PERIODO) as Periodo[]).map((p) => ({ valor: p, rotulo: ROTULO_PERIODO[p] }))}
        />
      )}
      {periodo && filtros.periodo === "personalizado" && (
        <SeletorIntervalo de={filtros.de} ate={filtros.ate} maxDias={400} aoMudar={(de, ate) => definir({ de, ate })} />
      )}
      <Selecao
        rotulo="Região"
        icone={MapPin}
        className="w-auto min-w-44"
        valor={filtros.regiao}
        aoMudar={(v) => definir({ regiao: v })}
        opcoes={[{ valor: "", rotulo: "Todas as regiões" }, ...REGIOES.map((r) => ({ valor: r, rotulo: r }))]}
      />
      <Selecao
        rotulo="Tipo de veículo"
        icone={Truck}
        className="w-auto min-w-44"
        valor={filtros.tipoVeiculo}
        aoMudar={(v) => definir({ tipoVeiculo: v })}
        opcoes={[{ valor: "", rotulo: "Todos os veículos" }, ...TIPOS_VEICULO.map((t) => ({ valor: t.valor, rotulo: t.rotulo }))]}
      />
      <div className="ml-auto flex items-center gap-2">
        {ao_vivo && (
          <div className="flex items-center gap-2 text-xs text-risk-low font-medium px-3 py-2 rounded-lg bg-risk-low/10 border border-risk-low/30">
            <span className="h-2 w-2 rounded-full bg-risk-low pulse-dot" />
            {periodo ? "Ao vivo • atualiza a cada 30 s" : "Tempo real • atualiza a cada 30 s"}
            {!periodo && <Dica texto={DICAS.telaAoVivo} />}
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
