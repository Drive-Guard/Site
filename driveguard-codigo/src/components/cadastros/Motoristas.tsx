/**
 * Motoristas. O código é o mesmo ID gravado no dispositivo da cabine: quando a
 * telemetria de um código novo chega antes do cadastro, o motorista aparece
 * como "não cadastrado" e o cadastro só completa o registro (o histórico fica).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, UserPlus } from "lucide-react";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { api } from "@/lib/api";
import { relativo } from "@/lib/formato";
import type { MotoristaCadastro, Uf } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { BotaoPrimario, BotaoSecundario, celula, entrada, Formulario, linha, numeroOuNulo, Rotulo, Tabela, useSalvar } from "./comum";

const STATUS: Record<string, string> = { ativo: "Ativo", inativo: "Inativo", afastado: "Afastado", ferias: "Férias" };

export function Motoristas() {
  const q = useQuery({ queryKey: ["cad-motoristas"], queryFn: () => api.get<MotoristaCadastro[]>("/cadastros/motoristas") });
  const ufs = useQuery({ queryKey: ["ufs"], queryFn: () => api.get<Uf[]>("/cadastros/ufs"), staleTime: Infinity });
  const [editar, setEditar] = useState<MotoristaCadastro | "novo" | null>(null);

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold">Motoristas</h3>
          <p className="text-xs text-muted-foreground">O código é o ID gravado no dispositivo (o dado sai da cabine só como hash).</p>
        </div>
        <BotaoPrimario onClick={() => setEditar("novo")}>
          <Plus className="h-4 w-4" /> Novo motorista
        </BotaoPrimario>
      </div>
      <Conteudo q={q} altura={240}>
        {(lista) =>
          lista.length === 0 ? (
            <Vazio>Nenhum motorista.</Vazio>
          ) : (
            <Tabela cabecalho={["Código", "Nome", "Idade", "CNH", "UF", "Status", "Última leitura", ""]}>
              {lista.map((m) => (
                <tr key={m.id} className={cn(linha, !m.cadastrado && "bg-risk-medium/5")}>
                  <td className={cn(celula, "font-mono")}>{m.codigo ?? <span className="text-risk-medium text-xs">não cadastrado</span>}</td>
                  <td className={celula}>{m.nome}</td>
                  <td className={celula}>{m.idade ?? "—"}</td>
                  <td className={celula}>{m.categoriaCnh ?? "—"}</td>
                  <td className={celula}>{m.regiaoUf ?? "—"}</td>
                  <td className={celula}>{STATUS[m.status] ?? m.status}</td>
                  <td className={cn(celula, "text-xs")}>{relativo(m.ultimaLeituraEm)}</td>
                  <td className={cn(celula, "text-right")}>
                    {m.cadastrado ? (
                      <BotaoSecundario onClick={() => setEditar(m)}>
                        <Pencil className="h-3 w-3" /> Editar
                      </BotaoSecundario>
                    ) : (
                      <BotaoSecundario onClick={() => setEditar("novo")} className="border-risk-medium/50 text-risk-medium">
                        <UserPlus className="h-3 w-3" /> Completar cadastro
                      </BotaoSecundario>
                    )}
                  </td>
                </tr>
              ))}
            </Tabela>
          )
        }
      </Conteudo>
      {editar && <FormMotorista motorista={editar === "novo" ? null : editar} ufs={ufs.data ?? []} aoFechar={() => setEditar(null)} />}
    </div>
  );
}

function FormMotorista({ motorista, ufs, aoFechar }: { motorista: MotoristaCadastro | null; ufs: Uf[]; aoFechar: () => void }) {
  const [codigo, setCodigo] = useState(motorista?.codigo ?? "");
  const [nome, setNome] = useState(motorista?.nome ?? "");
  const [idade, setIdade] = useState(motorista?.idade ? String(motorista.idade) : "");
  const [anos, setAnos] = useState(motorista?.anosExperiencia !== null && motorista?.anosExperiencia !== undefined ? String(motorista.anosExperiencia) : "");
  const [cnh, setCnh] = useState(motorista?.categoriaCnh ?? "");
  const [validade, setValidade] = useState(motorista?.cnhValidaAte ?? "");
  const [uf, setUf] = useState(motorista?.regiaoUf ?? "");
  const [status, setStatus] = useState(motorista?.status ?? "ativo");

  const salvar = useSalvar(
    () => {
      const dados = { nome, idade: numeroOuNulo(idade), anosExperiencia: numeroOuNulo(anos), categoriaCnh: cnh || null, cnhValidaAte: validade || null, regiaoUf: uf || null, status };
      return motorista ? api.put(`/cadastros/motoristas/${motorista.id}`, dados) : api.post("/cadastros/motoristas", { ...dados, codigo });
    },
    [["cad-motoristas"], ["motoristas-ao-vivo"]],
    motorista ? "Motorista atualizado" : "Motorista cadastrado",
    aoFechar,
  );

  return (
    <Formulario titulo={motorista ? `Editar ${motorista.codigo}` : "Novo motorista"} aberto aoFechar={aoFechar} aoSalvar={() => salvar.mutate(undefined)} salvando={salvar.isPending}>
      <div className="grid grid-cols-2 gap-3">
        <Rotulo texto="Código (ID no dispositivo)">
          <input className={entrada} value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={!!motorista} placeholder="DRV-1016" required />
        </Rotulo>
        <Rotulo texto="Status">
          <select className={entrada} value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </Rotulo>
        <Rotulo texto="Nome" className="col-span-2">
          <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Rotulo>
        <Rotulo texto="Idade">
          <input className={entrada} inputMode="numeric" value={idade} onChange={(e) => setIdade(e.target.value)} />
        </Rotulo>
        <Rotulo texto="Anos de habilitação">
          <input className={entrada} inputMode="numeric" value={anos} onChange={(e) => setAnos(e.target.value)} />
        </Rotulo>
        <Rotulo texto="Categoria da CNH">
          <input className={entrada} value={cnh} onChange={(e) => setCnh(e.target.value.toUpperCase())} placeholder="E" maxLength={2} />
        </Rotulo>
        <Rotulo texto="CNH válida até">
          <input className={entrada} type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
        </Rotulo>
        <Rotulo texto="UF de atuação" className="col-span-2">
          <select className={entrada} value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="">—</option>
            {ufs.map((u) => (
              <option key={u.uf} value={u.uf}>
                {u.uf} — {u.nome}
              </option>
            ))}
          </select>
        </Rotulo>
      </div>
      {!motorista && <p className="text-[11px] text-muted-foreground">Se a câmera já mandou dados desse código, o cadastro completa o motorista existente e mantém o histórico.</p>}
    </Formulario>
  );
}
