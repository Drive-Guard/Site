/**
 * Rotas e viagens, cadastradas pelo gestor. A viagem liga caminhão, rota e
 * horário: o ETL casa cada turno com a viagem do caminhão naquele horário e
 * daí saem origem, destino e o cruzamento com a PRF (pelas BRs da rota).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, XCircle } from "lucide-react";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { api } from "@/lib/api";
import { dataHora, num, reais } from "@/lib/formato";
import type { MotoristaCadastro, RotaCadastro, Uf, VeiculoCadastro, ViagemCadastro } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { BotaoPrimario, BotaoSecundario, celula, entrada, Formulario, linha, numeroOuNulo, Rotulo, Tabela, useSalvar } from "./comum";

export function Rotas() {
  const q = useQuery({ queryKey: ["cad-rotas"], queryFn: () => api.get<RotaCadastro[]>("/cadastros/rotas") });
  const ufs = useQuery({ queryKey: ["ufs"], queryFn: () => api.get<Uf[]>("/cadastros/ufs"), staleTime: Infinity });
  const [editar, setEditar] = useState<RotaCadastro | "nova" | null>(null);
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold">Rotas</h3>
          <p className="text-xs text-muted-foreground">As BRs e UFs percorridas cruzam a rota com a base de acidentes da PRF.</p>
        </div>
        <BotaoPrimario onClick={() => setEditar("nova")}>
          <Plus className="h-4 w-4" /> Nova rota
        </BotaoPrimario>
      </div>
      <Conteudo q={q} altura={200}>
        {(lista) =>
          lista.length === 0 ? (
            <Vazio>Nenhuma rota.</Vazio>
          ) : (
            <Tabela cabecalho={["Nome", "Origem", "Destino", "BRs", "UFs", "Distância", "Viagens", ""]}>
              {lista.map((r) => (
                <tr key={r.id} className={cn(linha, !r.ativo && "opacity-50")}>
                  <td className={celula}>{r.nome ?? "—"}</td>
                  <td className={celula}>
                    {r.origemCidade}/{r.origemUf}
                  </td>
                  <td className={celula}>
                    {r.destinoCidade}/{r.destinoUf}
                  </td>
                  <td className={cn(celula, "text-xs")}>{r.brs.length ? r.brs.map((b) => `BR-${b.padStart(3, "0")}`).join(", ") : "—"}</td>
                  <td className={cn(celula, "text-xs")}>{r.ufsPercorridas.join(", ")}</td>
                  <td className={celula}>{r.distanciaKm ? `${num(r.distanciaKm)} km` : "—"}</td>
                  <td className={celula}>{r.viagens}</td>
                  <td className={cn(celula, "text-right")}>
                    <BotaoSecundario onClick={() => setEditar(r)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </BotaoSecundario>
                  </td>
                </tr>
              ))}
            </Tabela>
          )
        }
      </Conteudo>
      {editar && <FormRota rota={editar === "nova" ? null : editar} ufs={ufs.data ?? []} aoFechar={() => setEditar(null)} />}
    </div>
  );
}

function FormRota({ rota, ufs, aoFechar }: { rota: RotaCadastro | null; ufs: Uf[]; aoFechar: () => void }) {
  const [nome, setNome] = useState(rota?.nome ?? "");
  const [origemCidade, setOrigemCidade] = useState(rota?.origemCidade ?? "");
  const [origemUf, setOrigemUf] = useState(rota?.origemUf ?? "SP");
  const [destinoCidade, setDestinoCidade] = useState(rota?.destinoCidade ?? "");
  const [destinoUf, setDestinoUf] = useState(rota?.destinoUf ?? "RJ");
  const [brs, setBrs] = useState((rota?.brs ?? []).join(", "));
  const [ufsPercorridas, setUfsPercorridas] = useState((rota?.ufsPercorridas ?? []).join(", "));
  const [distancia, setDistancia] = useState(rota?.distanciaKm ? String(rota.distanciaKm) : "");
  const [ativo, setAtivo] = useState(rota?.ativo ?? true);

  const salvar = useSalvar(
    () => {
      const dados = {
        nome: nome || null,
        origemCidade,
        origemUf,
        destinoCidade,
        destinoUf,
        brs: brs.split(/[,;\s]+/).filter(Boolean),
        ufsPercorridas: ufsPercorridas.split(/[,;\s]+/).filter(Boolean).map((u) => u.toUpperCase()),
        distanciaKm: numeroOuNulo(distancia),
        ativo,
      };
      return rota ? api.put(`/cadastros/rotas/${rota.id}`, dados) : api.post("/cadastros/rotas", dados);
    },
    [["cad-rotas"], ["rotas"]],
    rota ? "Rota atualizada" : "Rota cadastrada",
    aoFechar,
  );

  const seletorUf = (valor: string, mudar: (v: string) => void) => (
    <select className={entrada} value={valor} onChange={(e) => mudar(e.target.value)}>
      {ufs.map((u) => (
        <option key={u.uf} value={u.uf}>
          {u.uf}
        </option>
      ))}
    </select>
  );

  return (
    <Formulario titulo={rota ? "Editar rota" : "Nova rota"} aberto aoFechar={aoFechar} aoSalvar={() => salvar.mutate(undefined)} salvando={salvar.isPending}>
      <Rotulo texto="Nome (opcional)">
        <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Via Dutra" />
      </Rotulo>
      <div className="grid grid-cols-4 gap-3">
        <Rotulo texto="Origem" className="col-span-3">
          <input className={entrada} value={origemCidade} onChange={(e) => setOrigemCidade(e.target.value)} required />
        </Rotulo>
        <Rotulo texto="UF">{seletorUf(origemUf, setOrigemUf)}</Rotulo>
        <Rotulo texto="Destino" className="col-span-3">
          <input className={entrada} value={destinoCidade} onChange={(e) => setDestinoCidade(e.target.value)} required />
        </Rotulo>
        <Rotulo texto="UF">{seletorUf(destinoUf, setDestinoUf)}</Rotulo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Rotulo texto="BRs percorridas">
          <input className={entrada} value={brs} onChange={(e) => setBrs(e.target.value)} placeholder="116, 381" />
        </Rotulo>
        <Rotulo texto="UFs no caminho">
          <input className={entrada} value={ufsPercorridas} onChange={(e) => setUfsPercorridas(e.target.value)} placeholder="SP, MG" />
        </Rotulo>
        <Rotulo texto="Distância (km)">
          <input className={entrada} inputMode="decimal" value={distancia} onChange={(e) => setDistancia(e.target.value)} />
        </Rotulo>
        {rota && (
          <label className="flex items-end gap-2 text-sm pb-2">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Rota ativa
          </label>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Origem e destino entram automaticamente nas UFs. BR-040 pode ser escrita como 40, 040 ou BR-040.</p>
    </Formulario>
  );
}

const STATUS_VIAGEM: Record<string, string> = { planejada: "Planejada", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada" };

export function Viagens() {
  const q = useQuery({ queryKey: ["cad-viagens"], queryFn: () => api.get<ViagemCadastro[]>("/cadastros/viagens", { dias: 60 }) });
  const rotas = useQuery({ queryKey: ["cad-rotas"], queryFn: () => api.get<RotaCadastro[]>("/cadastros/rotas") });
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: () => api.get<VeiculoCadastro[]>("/cadastros/veiculos") });
  const motoristas = useQuery({ queryKey: ["cad-motoristas"], queryFn: () => api.get<MotoristaCadastro[]>("/cadastros/motoristas") });
  const [editar, setEditar] = useState<ViagemCadastro | "nova" | null>(null);
  const cancelar = useSalvar(
    (v: ViagemCadastro) =>
      api.put(`/cadastros/viagens/${v.id}`, {
        rotaId: v.rotaId,
        veiculoId: v.veiculoId,
        motoristaId: v.motoristaId,
        partidaPrevista: v.partidaPrevista,
        chegadaPrevista: v.chegadaPrevista,
        valorViagem: v.valorViagem,
        status: "cancelada",
      }),
    [["cad-viagens"]],
    "Viagem cancelada",
  );

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold">Viagens (últimos 60 dias e futuras)</h3>
          <p className="text-xs text-muted-foreground">O valor da viagem entra no ROI como custo do atraso por hora parada.</p>
        </div>
        <BotaoPrimario onClick={() => setEditar("nova")}>
          <Plus className="h-4 w-4" /> Nova viagem
        </BotaoPrimario>
      </div>
      <Conteudo q={q} altura={200}>
        {(lista) =>
          lista.length === 0 ? (
            <Vazio>Nenhuma viagem.</Vazio>
          ) : (
            <Tabela cabecalho={["Partida prevista", "Rota", "Veículo", "Motorista", "Valor", "Status", "Turnos", ""]}>
              {lista.map((v) => (
                <tr key={v.id} className={cn(linha, v.status === "cancelada" && "opacity-50")}>
                  <td className={cn(celula, "text-xs whitespace-nowrap")}>{dataHora(v.partidaPrevista)}</td>
                  <td className={cn(celula, "text-xs")}>{v.rota}</td>
                  <td className={cn(celula, "font-mono text-xs")}>{v.placa}</td>
                  <td className={cn(celula, "text-xs")}>{v.motoristaCodigo ?? v.motoristaNome ?? "—"}</td>
                  <td className={celula}>{reais(v.valorViagem)}</td>
                  <td className={cn(celula, "text-xs")}>{STATUS_VIAGEM[v.status] ?? v.status}</td>
                  <td className={celula}>{v.turnos}</td>
                  <td className={cn(celula, "text-right whitespace-nowrap space-x-1")}>
                    <BotaoSecundario onClick={() => setEditar(v)}>
                      <Pencil className="h-3 w-3" />
                    </BotaoSecundario>
                    {v.status === "planejada" && (
                      <BotaoSecundario onClick={() => cancelar.mutate(v)} title="Cancelar">
                        <XCircle className="h-3 w-3" />
                      </BotaoSecundario>
                    )}
                  </td>
                </tr>
              ))}
            </Tabela>
          )
        }
      </Conteudo>
      {editar && (
        <FormViagem
          viagem={editar === "nova" ? null : editar}
          rotas={rotas.data ?? []}
          veiculos={veiculos.data ?? []}
          motoristas={(motoristas.data ?? []).filter((m) => m.cadastrado)}
          aoFechar={() => setEditar(null)}
        />
      )}
    </div>
  );
}

/** ISO -> valor de <input type="datetime-local"> no horário de Brasília. */
function paraLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
  return p.replace(" ", "T");
}
const paraIso = (local: string) => (local ? `${local}:00-03:00` : null);

function FormViagem({ viagem, rotas, veiculos, motoristas, aoFechar }: { viagem: ViagemCadastro | null; rotas: RotaCadastro[]; veiculos: VeiculoCadastro[]; motoristas: MotoristaCadastro[]; aoFechar: () => void }) {
  const [rotaId, setRotaId] = useState(viagem?.rotaId ?? "");
  const [veiculoId, setVeiculoId] = useState(viagem?.veiculoId ?? "");
  const [motoristaId, setMotoristaId] = useState(viagem?.motoristaId ?? "");
  const [partida, setPartida] = useState(paraLocal(viagem?.partidaPrevista ?? null));
  const [chegada, setChegada] = useState(paraLocal(viagem?.chegadaPrevista ?? null));
  const [valor, setValor] = useState(viagem?.valorViagem ? String(viagem.valorViagem) : "");
  const [status, setStatus] = useState(viagem?.status ?? "planejada");

  const salvar = useSalvar(
    () => {
      const dados = { rotaId, veiculoId, motoristaId: motoristaId || null, partidaPrevista: paraIso(partida), chegadaPrevista: paraIso(chegada), valorViagem: numeroOuNulo(valor), status };
      return viagem ? api.put(`/cadastros/viagens/${viagem.id}`, dados) : api.post("/cadastros/viagens", dados);
    },
    [["cad-viagens"], ["roi"]],
    viagem ? "Viagem atualizada" : "Viagem cadastrada",
    aoFechar,
  );

  return (
    <Formulario titulo={viagem ? "Editar viagem" : "Nova viagem"} aberto aoFechar={aoFechar} aoSalvar={() => salvar.mutate(undefined)} salvando={salvar.isPending}>
      <Rotulo texto="Rota">
        <select className={entrada} value={rotaId} onChange={(e) => setRotaId(e.target.value)} required>
          <option value="">Escolha…</option>
          {rotas
            .filter((r) => r.ativo)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.origemCidade}/{r.origemUf} → {r.destinoCidade}/{r.destinoUf}
                {r.nome ? ` (${r.nome})` : ""}
              </option>
            ))}
        </select>
      </Rotulo>
      <div className="grid grid-cols-2 gap-3">
        <Rotulo texto="Veículo">
          <select className={entrada} value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required>
            <option value="">Escolha…</option>
            {veiculos
              .filter((v) => v.ativo)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} {v.cameraCodigo ? `(${v.cameraCodigo})` : "(sem câmera)"}
                </option>
              ))}
          </select>
        </Rotulo>
        <Rotulo texto="Motorista (opcional)">
          <select className={entrada} value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)}>
            <option value="">Definido pela câmera</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo} — {m.nome}
              </option>
            ))}
          </select>
        </Rotulo>
        <Rotulo texto="Partida prevista">
          <input className={entrada} type="datetime-local" value={partida} onChange={(e) => setPartida(e.target.value)} required />
        </Rotulo>
        <Rotulo texto="Chegada prevista">
          <input className={entrada} type="datetime-local" value={chegada} onChange={(e) => setChegada(e.target.value)} />
        </Rotulo>
        <Rotulo texto="Valor da viagem (R$)">
          <input className={entrada} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="4500" />
        </Rotulo>
        <Rotulo texto="Status">
          <select className={entrada} value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS_VIAGEM).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </Rotulo>
      </div>
      <p className="text-[11px] text-muted-foreground">Horários de Brasília. O turno é casado com a viagem quando começa até 3 h antes ou depois da partida prevista.</p>
    </Formulario>
  );
}
