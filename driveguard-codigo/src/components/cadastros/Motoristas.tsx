/**
 * Motoristas. O código é o mesmo ID gravado no dispositivo da cabine
 * (DRIVEGUARD_MOTORISTA_ID), normalizado: "Caetano Resende" e
 * "caetano.resende" são o mesmo. Quando a telemetria chega antes do cadastro,
 * o motorista aparece como "não cadastrado" e completar só pede o nome.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, UserPlus } from "lucide-react";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { Selecao } from "@/components/comum/Selecao";
import { api } from "@/lib/api";
import { relativo } from "@/lib/formato";
import { codigoDoNome, normalizarId } from "@/lib/identificadores";
import type { MotoristaCadastro, Uf } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { BotaoExcluir, BotaoPrimario, BotaoSecundario, CampoId, celula, entrada, Formulario, linha, numeroOuNulo, Rotulo, Tabela, useSalvar } from "./comum";

const STATUS: Record<string, string> = { ativo: "Ativo", inativo: "Inativo", afastado: "Afastado", ferias: "Férias" };
const CHAVES = [["cad-motoristas"], ["motoristas-ao-vivo"]];

export function Motoristas() {
  const q = useQuery({ queryKey: ["cad-motoristas"], queryFn: () => api.get<MotoristaCadastro[]>("/cadastros/motoristas") });
  const ufs = useQuery({ queryKey: ["ufs"], queryFn: () => api.get<Uf[]>("/cadastros/ufs"), staleTime: Infinity });
  const [editar, setEditar] = useState<MotoristaCadastro | "novo" | null>(null);
  const [completar, setCompletar] = useState<MotoristaCadastro | null>(null);

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-semibold">Motoristas</h3>
          <p className="text-xs text-muted-foreground">O código é o ID gravado no dispositivo (DRIVEGUARD_MOTORISTA_ID). Sai da cabine só como hash.</p>
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
                  <td className={cn(celula, "text-right whitespace-nowrap space-x-1")}>
                    {m.cadastrado ? (
                      <BotaoSecundario onClick={() => setEditar(m)}>
                        <Pencil className="h-3 w-3" /> Editar
                      </BotaoSecundario>
                    ) : (
                      <BotaoSecundario onClick={() => setCompletar(m)} className="border-risk-medium/50 text-risk-medium">
                        <UserPlus className="h-3 w-3" /> Completar cadastro
                      </BotaoSecundario>
                    )}
                    <BotaoExcluir caminho={`/cadastros/motoristas/${m.id}`} nome={m.codigo ? `o motorista ${m.codigo}` : "o motorista"} temHistorico={m.temHistorico} chaves={CHAVES} />
                  </td>
                </tr>
              ))}
            </Tabela>
          )
        }
      </Conteudo>
      {editar && <FormMotorista motorista={editar === "novo" ? null : editar} ufs={ufs.data ?? []} aoFechar={() => setEditar(null)} />}
      {completar && <FormCompletarMotorista motorista={completar} aoFechar={() => setCompletar(null)} />}
    </div>
  );
}

function CamposPessoais({
  v,
  set,
  ufs,
}: {
  v: { idade: string; anos: string; cnh: string; validade: string; uf: string; status: string };
  set: (campo: string, valor: string) => void;
  ufs: Uf[];
}) {
  return (
    <>
      <Rotulo texto="Idade">
        <input className={entrada} inputMode="numeric" value={v.idade} onChange={(e) => set("idade", e.target.value)} />
      </Rotulo>
      <Rotulo texto="Anos de habilitação">
        <input className={entrada} inputMode="numeric" value={v.anos} onChange={(e) => set("anos", e.target.value)} />
      </Rotulo>
      <Rotulo texto="Categoria da CNH">
        <input className={entrada} value={v.cnh} onChange={(e) => set("cnh", e.target.value.toUpperCase())} placeholder="E" maxLength={2} />
      </Rotulo>
      <Rotulo texto="CNH válida até">
        <input className={entrada} type="date" value={v.validade} onChange={(e) => set("validade", e.target.value)} />
      </Rotulo>
      <Rotulo texto="UF de atuação">
        <Selecao valor={v.uf} aoMudar={(x) => set("uf", x)} opcoes={[{ valor: "", rotulo: "—" }, ...ufs.map((u) => ({ valor: u.uf, rotulo: `${u.uf} — ${u.nome}` }))]} />
      </Rotulo>
      <Rotulo texto="Status">
        <Selecao valor={v.status} aoMudar={(x) => set("status", x)} opcoes={Object.entries(STATUS).map(([valor, rotulo]) => ({ valor, rotulo }))} />
      </Rotulo>
    </>
  );
}

function usePessoais(m: MotoristaCadastro | null) {
  const [v, setV] = useState({
    idade: m?.idade ? String(m.idade) : "",
    anos: m?.anosExperiencia !== null && m?.anosExperiencia !== undefined ? String(m.anosExperiencia) : "",
    cnh: m?.categoriaCnh ?? "",
    validade: m?.cnhValidaAte ?? "",
    uf: m?.regiaoUf ?? "",
    status: m?.status ?? "ativo",
  });
  const set = (campo: string, valor: string) => setV((x) => ({ ...x, [campo]: valor }));
  const dados = () => ({
    idade: numeroOuNulo(v.idade),
    anosExperiencia: numeroOuNulo(v.anos),
    categoriaCnh: v.cnh || null,
    cnhValidaAte: v.validade || null,
    regiaoUf: v.uf || null,
    status: v.status,
  });
  return { v, set, dados };
}

function FormMotorista({ motorista, ufs, aoFechar }: { motorista: MotoristaCadastro | null; ufs: Uf[]; aoFechar: () => void }) {
  const [codigo, setCodigo] = useState(motorista?.codigo ?? "");
  const [codigoEditado, setCodigoEditado] = useState(!!motorista);
  const [nome, setNome] = useState(motorista?.nome ?? "");
  const p = usePessoais(motorista);
  const codigoFinal = codigoEditado ? codigo : codigoDoNome(nome);
  const mudouCodigo = !!motorista && normalizarId(codigo) !== motorista.codigo;

  const salvar = useSalvar(
    () => {
      const dados = { nome, ...p.dados() };
      return motorista
        ? api.put(`/cadastros/motoristas/${motorista.id}`, { ...dados, codigo: codigo || undefined })
        : api.post("/cadastros/motoristas", { ...dados, codigo: codigoFinal || null });
    },
    CHAVES,
    motorista ? "Motorista atualizado" : "Motorista cadastrado",
    aoFechar,
  );

  return (
    <Formulario titulo={motorista ? `Editar ${motorista.codigo}` : "Novo motorista"} aberto aoFechar={aoFechar} aoSalvar={() => salvar.mutate(undefined)} salvando={salvar.isPending}>
      <div className="grid grid-cols-2 gap-3">
        <Rotulo texto="Nome" className="col-span-2">
          <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Rotulo>
        <Rotulo texto="Código (ID no dispositivo)" className="col-span-2" ajuda={!motorista && !codigoEditado ? "Sai do nome; pode trocar." : undefined}>
          <CampoId
            valor={codigoFinal}
            aoMudar={(v) => {
              setCodigo(v);
              setCodigoEditado(true);
            }}
            placeholder="caetano-resende"
          />
        </Rotulo>
        {mudouCodigo && (
          <p className="col-span-2 text-[11px] text-risk-medium">
            Trocar o código troca o ID esperado: o dispositivo precisa passar a mandar DRIVEGUARD_MOTORISTA_ID={normalizarId(codigo)}.
          </p>
        )}
        <CamposPessoais v={p.v} set={p.set} ufs={ufs} />
      </div>
      {!motorista && <p className="text-[11px] text-muted-foreground">Se o dispositivo já mandou dados desse código, o cadastro completa o motorista existente e mantém o histórico.</p>}
    </Formulario>
  );
}

/** Motorista que chegou pela telemetria: o dispositivo continua igual, só falta o nome. */
export function FormCompletarMotorista({ motorista, aoFechar }: { motorista: MotoristaCadastro; aoFechar: () => void }) {
  const ufs = useQuery({ queryKey: ["ufs"], queryFn: () => api.get<Uf[]>("/cadastros/ufs"), staleTime: Infinity });
  const [nome, setNome] = useState("");
  const p = usePessoais(null);
  const salvar = useSalvar(
    () => api.post(`/cadastros/motoristas/${motorista.id}/completar`, { nome, ...p.dados() }),
    CHAVES,
    "Cadastro completo",
    aoFechar,
  );
  return (
    <Formulario
      titulo="Completar cadastro"
      descricao={`${motorista.nome}${motorista.ultimoDispositivo ? `, pela câmera ${motorista.ultimoDispositivo}` : ""}. O dispositivo já manda o ID dele: nada muda lá, e o histórico fica com o motorista.`}
      aberto
      aoFechar={aoFechar}
      aoSalvar={() => salvar.mutate(undefined)}
      salvando={salvar.isPending}
    >
      <div className="grid grid-cols-2 gap-3">
        <Rotulo texto="Nome" className="col-span-2" ajuda={nome ? `Código na dashboard: ${codigoDoNome(nome)}` : undefined}>
          <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
        </Rotulo>
        <CamposPessoais v={p.v} set={p.set} ufs={ufs.data ?? []} />
      </div>
    </Formulario>
  );
}
