/** Parâmetros do ROI (com a fonte de cada um) e dados da empresa. */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil, RotateCcw } from "lucide-react";
import { Conteudo } from "@/components/comum/Estado";
import { api } from "@/lib/api";
import type { Empresa, ParametroRoi, Uf } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { BotaoPrimario, BotaoSecundario, celula, entrada, Formulario, linha, numeroOuNulo, Rotulo, Tabela, useSalvar } from "./comum";

function exibir(p: ParametroRoi) {
  if (p.valor === null) return <span className="text-risk-medium">não informado</span>;
  if (p.unidade === "R$") return p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (p.unidade === "fração") return `${(p.valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  return `${p.valor.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ${p.unidade === "fator" ? "" : p.unidade}`;
}

export function ParametrosRoi() {
  const q = useQuery({ queryKey: ["parametros-roi"], queryFn: () => api.get<ParametroRoi[]>("/cadastros/parametros-roi") });
  const [editar, setEditar] = useState<ParametroRoi | null>(null);
  const restaurar = useSalvar((chave: string) => api.del(`/cadastros/parametros-roi/${chave}`), [["parametros-roi"], ["roi"]], "Valor padrão restaurado");

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold">Parâmetros do ROI</h3>
        <p className="text-xs text-muted-foreground">
          Os valores padrão vêm da literatura e da base da PRF, cada um com a fonte. Troque pelos números da sua operação quando tiver; os dois primeiros só a empresa sabe.
        </p>
      </div>
      <Conteudo q={q} altura={300}>
        {(lista) => (
          <Tabela cabecalho={["Parâmetro", "Valor", "Fonte", ""]}>
            {[...lista]
              .sort((a, b) => Number(b.valor === null) - Number(a.valor === null) || Number(b.editavel) - Number(a.editavel))
              .map((p) => (
                <tr key={p.chave} className={cn(linha, "align-top")}>
                  <td className={cn(celula, "max-w-md")}>
                    <p className="font-medium text-sm">{p.descricao.split(".")[0]}</p>
                    <p className="text-[11px] text-muted-foreground">{p.descricao.split(".").slice(1).join(".").trim()}</p>
                  </td>
                  <td className={cn(celula, "whitespace-nowrap font-medium")}>
                    {exibir(p)}
                    {p.personalizado && <span className="ml-1 text-[10px] text-primary">(empresa)</span>}
                  </td>
                  <td className={cn(celula, "text-xs text-muted-foreground max-w-xs")}>
                    {p.urlFonte ? (
                      <a href={p.urlFonte} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                        {p.fonte} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      p.fonte
                    )}
                    {p.referencia && ` (${p.referencia})`}
                  </td>
                  <td className={cn(celula, "text-right whitespace-nowrap space-x-1")}>
                    {p.editavel ? (
                      <>
                        <BotaoSecundario onClick={() => setEditar(p)}>
                          <Pencil className="h-3 w-3" /> Alterar
                        </BotaoSecundario>
                        {p.personalizado && (
                          <BotaoSecundario onClick={() => restaurar.mutate(p.chave)} title="Voltar ao padrão">
                            <RotateCcw className="h-3 w-3" />
                          </BotaoSecundario>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">calculado</span>
                    )}
                  </td>
                </tr>
              ))}
          </Tabela>
        )}
      </Conteudo>
      {editar && <FormParametro parametro={editar} aoFechar={() => setEditar(null)} />}
    </div>
  );
}

function FormParametro({ parametro, aoFechar }: { parametro: ParametroRoi; aoFechar: () => void }) {
  const fracao = parametro.unidade === "fração";
  const [valor, setValor] = useState(parametro.valor === null ? "" : String(fracao ? parametro.valor * 100 : parametro.valor));
  const [fonte, setFonte] = useState(parametro.personalizado ? (parametro.fonte ?? "") : "");
  const salvar = useSalvar(
    () => {
      const n = numeroOuNulo(valor);
      return api.put(`/cadastros/parametros-roi/${parametro.chave}`, { valor: fracao && n !== null ? n / 100 : n, fonte: fonte || null });
    },
    [["parametros-roi"], ["roi"]],
    "Parâmetro atualizado",
    aoFechar,
  );
  return (
    <Formulario titulo={parametro.descricao.split(".")[0]} aberto aoFechar={aoFechar} aoSalvar={() => salvar.mutate(undefined)} salvando={salvar.isPending}>
      <p className="text-xs text-muted-foreground">{parametro.descricao}</p>
      <Rotulo texto={`Valor${fracao ? " (%)" : parametro.unidade === "R$" ? " (R$)" : ` (${parametro.unidade})`}`}>
        <input className={entrada} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required />
      </Rotulo>
      {parametro.valorPadrao !== null && (
        <p className="text-[11px] text-muted-foreground">
          Padrão: {fracao ? `${parametro.valorPadrao * 100}%` : parametro.valorPadrao} ({parametro.fonte})
        </p>
      )}
      <Rotulo texto="De onde vem esse número?">
        <input className={entrada} value={fonte} onChange={(e) => setFonte(e.target.value)} placeholder="Ex.: sinistros da empresa em 2025" />
      </Rotulo>
    </Formulario>
  );
}

export function DadosEmpresa() {
  const q = useQuery({ queryKey: ["empresa"], queryFn: () => api.get<Empresa>("/cadastros/empresa") });
  const ufs = useQuery({ queryKey: ["ufs"], queryFn: () => api.get<Uf[]>("/cadastros/ufs"), staleTime: Infinity });
  return (
    <div className="glass-card rounded-2xl p-5 max-w-2xl">
      <h3 className="text-base font-semibold mb-1">Empresa</h3>
      <p className="text-xs text-muted-foreground mb-4">O tamanho total da frota define a cobertura das câmeras no ROI.</p>
      <Conteudo q={q} altura={200}>
        {(e) => <FormEmpresa empresa={e} ufs={ufs.data ?? []} />}
      </Conteudo>
    </div>
  );
}

function FormEmpresa({ empresa, ufs }: { empresa: Empresa; ufs: Uf[] }) {
  const [nome, setNome] = useState(empresa.nomeFantasia ?? "");
  const [frota, setFrota] = useState(empresa.frotaTotal ? String(empresa.frotaTotal) : "");
  const [uf, setUf] = useState(empresa.uf ?? "");
  const [cidade, setCidade] = useState(empresa.cidade ?? "");
  const salvar = useSalvar(
    () => api.put("/cadastros/empresa", { nomeFantasia: nome || null, frotaTotal: numeroOuNulo(frota), uf: uf || null, cidade: cidade || null }),
    [["empresa"], ["roi"], ["me"]],
    "Empresa atualizada",
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        salvar.mutate(undefined);
      }}
    >
      <p className="text-sm">
        <span className="text-muted-foreground">Razão social:</span> {empresa.razaoSocial}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Rotulo texto="Nome fantasia" className="col-span-2">
          <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Rotulo>
        <Rotulo texto={`Tamanho da frota (${empresa.veiculosCadastrados} cadastrados)`}>
          <input className={entrada} inputMode="numeric" value={frota} onChange={(e) => setFrota(e.target.value)} />
        </Rotulo>
        <Rotulo texto="UF da sede">
          <select className={entrada} value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="">—</option>
            {ufs.map((u) => (
              <option key={u.uf} value={u.uf}>
                {u.uf}
              </option>
            ))}
          </select>
        </Rotulo>
        <Rotulo texto="Cidade" className="col-span-2">
          <input className={entrada} value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </Rotulo>
      </div>
      <BotaoPrimario type="submit" disabled={salvar.isPending}>
        Salvar
      </BotaoPrimario>
    </form>
  );
}
