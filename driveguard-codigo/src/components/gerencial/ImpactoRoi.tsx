/**
 * Impacto estimado (ROI), com a fórmula e a fonte de cada número à vista.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Info } from "lucide-react";
import { Conteudo } from "@/components/comum/Estado";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { num, pct, reais } from "@/lib/formato";
import { useIrPara } from "@/lib/navegacao";
import type { Roi } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Dica } from "@/components/comum/Dica";
import { DICAS } from "@/lib/dicas";

function valorParametro(valor: number | null, unidade: string) {
  if (valor === null) return "não informado";
  if (unidade === "R$") return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (unidade === "fração") return `${(valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ${unidade === "fator" ? "" : unidade}`;
}

export function ImpactoRoi() {
  const irPara = useIrPara();
  const q = useQuery({ queryKey: ["roi"], queryFn: () => api.get<Roi>("/dashboard/roi"), staleTime: 5 * 60_000 });
  const [cenario, setCenario] = useState<"conservador" | "realista">("conservador");

  return (
    <div className="glass-card rounded-xl p-6 relative overflow-hidden h-full">
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">Impacto estimado por ano <Dica texto={DICAS.roi} /></p>
          <div className="flex rounded-lg border border-border p-0.5 text-[11px]">
            {(["conservador", "realista"] as const).map((c) => (
              <button key={c} onClick={() => setCenario(c)} className={cn("px-2 py-0.5 rounded-md capitalize", cenario === c ? "bg-primary/20 text-primary" : "text-muted-foreground")}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <Conteudo q={q} altura={180}>
          {(roi) =>
            !roi.disponivel ? (
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium">Faltam dados para estimar o impacto:</p>
                <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
                  {roi.pendencias.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-risk-low">{pct(roi.reducaoAcidentesSonoPercentual)}</span>
                  <span className="text-sm text-muted-foreground">menos acidentes por sono</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  eficácia do alerta × cobertura de {pct(roi.cobertura.fracao * 100)} da frota ({roi.cobertura.veiculosComCamera} de {roi.cobertura.frotaTotal} veículos)
                </p>
                <div className="mt-4 space-y-2">
                  {[
                    { rotulo: "Acidentes evitados", valor: num(roi.cenarios[cenario].acidentesEvitados, 2) },
                    { rotulo: "Vidas preservadas", valor: num(roi.cenarios[cenario].vidasPreservadas, 3) },
                    { rotulo: "Custo evitado", valor: reais(roi.cenarios[cenario].custoEvitado, true) },
                    { rotulo: "Horas de parada evitadas", valor: roi.cenarios[cenario].horasParadaEvitadas === null ? "—" : `${num(roi.cenarios[cenario].horasParadaEvitadas, 1)} h` },
                    { rotulo: "Custo do atraso evitado", valor: reais(roi.cenarios[cenario].custoAtrasoEvitado) },
                  ].map((s) => (
                    <div key={s.rotulo} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{s.rotulo}</span>
                      <span className="font-semibold">{s.valor}</span>
                    </div>
                  ))}
                </div>
                {roi.alertasAtendidos30d.percentual !== null && (
                  <button
                    type="button"
                    // O ROI é da empresa inteira: abre sem região e tipo, para os números baterem.
                    onClick={() => irPara("monitoramento", { horas: 720, gravidade: "graves", regiao: null, tipo_veiculo: null })}
                    title="Ver os alertas graves dos últimos 30 dias"
                    className="clicavel mt-3 w-full text-left rounded-lg border border-border px-3 py-2 text-[11px] text-muted-foreground"
                  >
                    Alertas graves atendidos (30 dias) <Dica texto={DICAS.atendidos} />:{" "}
                    <span className="text-foreground font-semibold text-xs">{pct(roi.alertasAtendidos30d.percentual)}</span>
                    <span className="block">
                      {num(roi.alertasAtendidos30d.atendidos)} de {num(roi.alertasAtendidos30d.graves)} com pausa, contato, troca ou encerramento registrado
                    </span>
                  </button>
                )}
                <Fontes roi={roi} />
              </>
            )
          }
        </Conteudo>
      </div>
    </div>
  );
}

function Fontes({ roi }: { roi: Roi }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Info className="h-3.5 w-3.5" /> Como é calculado e de onde vêm os números
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Impacto estimado: fórmula e fontes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-secondary/40 p-3 font-mono text-[11px] leading-relaxed">
            acidentes por sono = acidentes da frota no ano × fração de sono
            <br />
            evitados = acidentes por sono × eficácia do alerta × cobertura
            <br />
            custo evitado = evitados × custo médio por acidente ({reais(roi.custoMedioPorAcidente)})
            <br />
            vidas = evitados × mortos por acidente ({num(roi.mortosPorAcidente, 4)})
            <br />
            horas de parada = evitados × horas paradas por acidente; atraso = horas × valor/hora das viagens
            {roi.valorHoraViagens !== null && ` (${reais(roi.valorHoraViagens)}/h)`}
          </div>
          <p className="text-xs text-muted-foreground">{roi.nota}</p>
          <p className="text-xs">
            Gravidade usada no custo médio: {pct(roi.proporcoesGravidade.fatal * 100, 1)} com morte, {pct(roi.proporcoesGravidade.feridos * 100, 1)} com feridos e{" "}
            {pct(roi.proporcoesGravidade.semVitimas * 100, 1)} sem vítimas — {roi.proporcoesGravidade.fonte}.
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-1.5 pr-2">Parâmetro</th>
                <th className="py-1.5 pr-2">Valor</th>
                <th className="py-1.5">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {roi.parametros
                .filter((p) => !(p.chave.endsWith("_padrao") && roi.proporcoesGravidade.fonte.startsWith("PRF")))
                .map((p) => (
                  <tr key={p.chave} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-2">{p.descricao.split(".")[0]}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap font-medium">
                      {valorParametro(p.valor, p.unidade)}
                      {p.personalizado && <span className="ml-1 text-[10px] text-primary">(empresa)</span>}
                    </td>
                    <td className="py-1.5 text-muted-foreground">
                      {p.urlFonte ? (
                        <a href={p.urlFonte} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                          {p.fonte} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        p.fonte
                      )}
                      {p.referencia && ` (${p.referencia})`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground">Os parâmetros editáveis podem ser trocados em Cadastros → Parâmetros do ROI.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
