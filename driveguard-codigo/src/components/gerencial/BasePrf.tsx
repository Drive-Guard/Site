/**
 * Base comparativa nacional (PRF): faixa horária, causas e mapa.
 *
 * Sempre identificada como fonte PRF: são acidentes em rodovias federais do
 * Brasil inteiro, não dados da frota. Por padrão só veículos pesados
 * (caminhão e ônibus), o recorte do DriveGuard.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { BrazilMap } from "@/components/dashboard/BrazilMap";
import { Conteudo, SeloFonte, Vazio } from "@/components/comum/Estado";
import { api } from "@/lib/api";
import { useFiltros } from "@/lib/filtros";
import { mesAno, num, pct } from "@/lib/formato";
import { COR, ESTILO_TOOLTIP } from "@/lib/risco";
import type { PrfCausas, PrfFaixa, PrfMapa, PrfResumo } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { DICAS } from "@/lib/dicas";
import { Dica } from "@/components/comum/Dica";

/** "Madrugada 0h–6h" em duas linhas: cabe no celular sem sobrepor. */
function RotuloDuasLinhas({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const [nome, ...resto] = String(payload?.value ?? "").split(" ");
  return (
    <text x={x} y={y} textAnchor="middle" fill={COR.eixo} fontSize={10}>
      <tspan x={x} dy={12}>{nome}</tspan>
      {resto.length > 0 && <tspan x={x} dy={12}>{resto.join(" ")}</tspan>}
    </text>
  );
}

const CORES_FAIXA: Record<string, string> = { madrugada: "var(--risk-critical)", manha: "var(--risk-low)", tarde: "var(--risk-medium)", noite: "var(--risk-high)" };

export function BasePrf() {
  const { query } = useFiltros();
  const [pesados, setPesados] = useState(true);
  // A PRF não tem empresa nem tipo de veículo da frota: só a região vale.
  const q = { regiao: query.regiao, pesados: String(pesados) };

  const resumo = useQuery({ queryKey: ["prf-resumo", q], queryFn: () => api.get<PrfResumo>("/dashboard/prf/resumo", q), staleTime: 10 * 60_000 });
  const faixa = useQuery({ queryKey: ["prf-faixa", q], queryFn: () => api.get<PrfFaixa>("/dashboard/prf/faixa-horaria", q), staleTime: 10 * 60_000 });
  const causas = useQuery({ queryKey: ["prf-causas", q], queryFn: () => api.get<PrfCausas>("/dashboard/prf/causas", q), staleTime: 10 * 60_000 });
  const mapa = useQuery({ queryKey: ["prf-mapa", q], queryFn: () => api.get<PrfMapa>("/dashboard/prf/mapa", q), staleTime: 10 * 60_000 });

  const r = resumo.data;
  const selo = r?.carregada ? `Fonte: PRF • 12 meses até ${mesAno(r.janela?.ate)}${pesados ? " • veículos pesados" : ""}` : "Fonte: PRF";

  if (r && !r.carregada) {
    return (
      <section className="glass-card rounded-xl p-6">
        <h3 className="text-base font-semibold">Base comparativa nacional (PRF)</h3>
        <Vazio>A base de acidentes da PRF ainda não foi carregada. Ela é baixada no deploy e atualizada toda semana.</Vazio>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-1.5">Base comparativa nacional <Dica texto={DICAS.basePrf} /></h2>
          <p className="text-xs text-muted-foreground">
            Acidentes em rodovias federais registrados pela Polícia Rodoviária Federal.{" "}
            {r?.carregada && (
              <>
                {num(r.acidentes)} acidentes, <span className="text-foreground font-medium">{num(r.acidentesSono)} ({pct(r.percentualSono, 1)}) com condutor dormindo</span>, {num(r.mortos)} mortes.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SeloFonte href={r?.url}>{selo}</SeloFonte>
          <div className="flex rounded-lg border border-border p-0.5 text-[11px]">
            {[
              { v: true, t: "Veículos pesados" },
              { v: false, t: "Todos" },
            ].map((o) => (
              <button key={String(o.v)} onClick={() => setPesados(o.v)} className={cn("px-2 py-0.5 rounded-md", pesados === o.v ? "bg-primary/20 text-primary" : "text-muted-foreground")}>
                {o.t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard title="Acidentes por sono por faixa horária" info={DICAS.prfFaixa} subtitle="Condutor dormindo, por horário do acidente" action={<SeloFonte>PRF</SeloFonte>}>
          <Conteudo q={faixa} altura={360}>
            {(d) => (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={d.faixas}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} />
                  <XAxis dataKey="rotulo" stroke={COR.eixo} fontSize={10} interval={0} height={36} tick={<RotuloDuasLinhas />} />
                  <YAxis stroke={COR.eixo} fontSize={12} />
                  <Tooltip
                    cursor={{ fill: COR.cursor }}
                    contentStyle={ESTILO_TOOLTIP}
                    formatter={(v: number, nome: string, item) => [`${num(v)} (${item.payload.percentualSono}% dos casos de sono)`, nome === "acidentesSono" ? "Por sono" : nome]}
                  />
                  <Bar dataKey="acidentesSono" radius={[8, 8, 0, 0]}>
                    {d.faixas.map((f) => (
                      <Cell key={f.faixa} fill={CORES_FAIXA[f.faixa]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Conteudo>
        </ChartCard>

        <ChartCard title="Principais causas de acidentes" info={DICAS.prfCausas} subtitle="Sono destacado entre as causas registradas" action={<SeloFonte>PRF</SeloFonte>}>
          <Conteudo q={causas} altura={260}>
            {(d) => (
              <ResponsiveContainer width="100%" height={Math.max(360, d.causas.length * 40)}>
                <BarChart data={d.causas} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} />
                  <XAxis type="number" stroke={COR.eixo} fontSize={11} />
                  <YAxis dataKey="causa" type="category" stroke={COR.eixo} fontSize={10} width={150} tickFormatter={(c: string) => (c.length > 26 ? `${c.slice(0, 25)}…` : c)} />
                  <Tooltip cursor={{ fill: COR.cursor }} contentStyle={ESTILO_TOOLTIP} formatter={(v: number) => [num(v), "Acidentes"]} />
                  <Bar dataKey="acidentes" radius={[0, 6, 6, 0]}>
                    {d.causas.map((c) => (
                      <Cell key={c.causa} fill={c.ligadaASono ? COR.risco : c.causa === "Outras causas" ? COR.grade : COR.primaria} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Conteudo>
        </ChartCard>

        <ChartCard title="Onde mais ocorrem acidentes por sono" info={DICAS.prfMapa} subtitle="Municípios com mais casos de condutor dormindo" action={<SeloFonte>PRF</SeloFonte>}>
          <Conteudo q={mapa} altura={320}>
            {(d) => (d.cidades.length ? <BrazilMap cidades={d.cidades} /> : <Vazio>Sem acidentes por sono no recorte.</Vazio>)}
          </Conteudo>
        </ChartCard>
      </div>
    </section>
  );
}
