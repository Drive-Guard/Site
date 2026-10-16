/**
 * Câmeras e veículos. Cada caminhão tem uma câmera; o código da câmera é o
 * código do veículo nos relatórios. Uma câmera que começou a mandar dados sem
 * cadastro aparece como pendente, para ser associada a um veículo. Trocar a
 * câmera de veículo encerra o vínculo anterior: o histórico continua certo.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRightLeft, Camera, History, Pencil, Plus, Unlink } from "lucide-react";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { dataHora, relativo, ROTULO_TIPO_VEICULO } from "@/lib/formato";
import type { DispositivoCadastro, VeiculoCadastro, Vinculo } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { BotaoPrimario, BotaoSecundario, celula, entrada, Formulario, linha, numeroOuNulo, Rotulo, Tabela, useSalvar } from "./comum";

const CHAVES = [["veiculos"], ["dispositivos"]];

export function CamerasVeiculos() {
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: () => api.get<VeiculoCadastro[]>("/cadastros/veiculos") });
  const dispositivos = useQuery({ queryKey: ["dispositivos"], queryFn: () => api.get<DispositivoCadastro[]>("/cadastros/dispositivos") });
  const [editarVeiculo, setEditarVeiculo] = useState<VeiculoCadastro | "novo" | null>(null);
  const [editarCamera, setEditarCamera] = useState<DispositivoCadastro | "nova" | null>(null);
  const [vincular, setVincular] = useState<DispositivoCadastro | null>(null);
  const [historico, setHistorico] = useState<DispositivoCadastro | null>(null);

  const pendentes = (dispositivos.data ?? []).filter((d) => d.pendente);
  const desvincular = useSalvar((id: string) => api.post(`/cadastros/dispositivos/${id}/desvincular`, { motivo: "câmera retirada" }), CHAVES, "Câmera retirada do veículo");

  return (
    <div className="space-y-6">
      {pendentes.length > 0 && (
        <div className="rounded-2xl border border-risk-medium/40 bg-risk-medium/10 p-4">
          <p className="text-sm font-semibold flex items-center gap-2 text-risk-medium">
            <AlertCircle className="h-4 w-4" /> {pendentes.length} câmera(s) enviando dados sem cadastro
          </p>
          <ul className="mt-3 space-y-2">
            {pendentes.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm rounded-lg bg-background/40 px-3 py-2">
                <span>
                  <span className="font-mono">{d.deviceId}</span> • último contato {relativo(d.ultimoContatoEm)}
                  {d.ultimoMotoristaNome && ` • motorista ${d.ultimoMotoristaCodigo ?? d.ultimoMotoristaNome}`}
                </span>
                <BotaoPrimario onClick={() => setVincular(d)} className="text-xs py-1.5">
                  <Camera className="h-3.5 w-3.5" /> Associar a um veículo
                </BotaoPrimario>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold">Veículos</h3>
            <p className="text-xs text-muted-foreground">Placa, tipo e a câmera instalada em cada um.</p>
          </div>
          <BotaoPrimario onClick={() => setEditarVeiculo("novo")}>
            <Plus className="h-4 w-4" /> Novo veículo
          </BotaoPrimario>
        </div>
        <Conteudo q={veiculos} altura={200}>
          {(lista) =>
            lista.length === 0 ? (
              <Vazio>Nenhum veículo cadastrado.</Vazio>
            ) : (
              <Tabela cabecalho={["Placa", "Tipo", "Modelo", "Câmera", "Desde", "Último contato", ""]}>
                {lista.map((v) => (
                  <tr key={v.id} className={cn(linha, !v.ativo && "opacity-50")}>
                    <td className={cn(celula, "font-mono")}>{v.placa}</td>
                    <td className={celula}>{ROTULO_TIPO_VEICULO[v.tipo] ?? v.tipo}</td>
                    <td className={celula}>{v.modelo ?? "—"}</td>
                    <td className={celula}>{v.cameraCodigo ? <span className="font-medium">{v.cameraCodigo}</span> : <span className="text-muted-foreground">sem câmera</span>}</td>
                    <td className={cn(celula, "text-xs")}>{v.cameraDesde ? dataHora(v.cameraDesde) : "—"}</td>
                    <td className={cn(celula, "text-xs")}>{relativo(v.ultimoContatoEm)}</td>
                    <td className={cn(celula, "text-right")}>
                      <BotaoSecundario onClick={() => setEditarVeiculo(v)}>
                        <Pencil className="h-3 w-3" /> Editar
                      </BotaoSecundario>
                    </td>
                  </tr>
                ))}
              </Tabela>
            )
          }
        </Conteudo>
      </div>

      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold">Câmeras</h3>
            <p className="text-xs text-muted-foreground">O ID gravado no dispositivo e o veículo em que está.</p>
          </div>
          <BotaoPrimario onClick={() => setEditarCamera("nova")}>
            <Plus className="h-4 w-4" /> Pré-cadastrar câmera
          </BotaoPrimario>
        </div>
        <Conteudo q={dispositivos} altura={200}>
          {(lista) => (
            <Tabela cabecalho={["Código", "ID do dispositivo", "Status", "Veículo", "Último contato", ""]}>
              {lista
                .filter((d) => !d.pendente)
                .map((d) => (
                  <tr key={d.id} className={linha}>
                    <td className={cn(celula, "font-medium")}>{d.codigo ?? "—"}</td>
                    <td className={cn(celula, "font-mono text-xs")}>{d.deviceId}</td>
                    <td className={celula}>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border", d.status === "ativo" ? "text-risk-low border-risk-low/40" : "text-muted-foreground border-border")}>{d.status}</span>
                    </td>
                    <td className={celula}>{d.placa ? `${d.placa} (${ROTULO_TIPO_VEICULO[d.veiculoTipo ?? ""] ?? d.veiculoTipo})` : <span className="text-muted-foreground">—</span>}</td>
                    <td className={cn(celula, "text-xs")}>{relativo(d.ultimoContatoEm)}</td>
                    <td className={cn(celula, "text-right whitespace-nowrap space-x-1")}>
                      <BotaoSecundario onClick={() => setVincular(d)}>
                        <ArrowRightLeft className="h-3 w-3" /> {d.placa ? "Trocar veículo" : "Instalar"}
                      </BotaoSecundario>
                      {d.placa && (
                        <BotaoSecundario onClick={() => desvincular.mutate(d.id)}>
                          <Unlink className="h-3 w-3" /> Retirar
                        </BotaoSecundario>
                      )}
                      <BotaoSecundario onClick={() => setHistorico(d)}>
                        <History className="h-3 w-3" />
                      </BotaoSecundario>
                      <BotaoSecundario onClick={() => setEditarCamera(d)}>
                        <Pencil className="h-3 w-3" />
                      </BotaoSecundario>
                    </td>
                  </tr>
                ))}
            </Tabela>
          )}
        </Conteudo>
      </div>

      {editarVeiculo && <FormVeiculo veiculo={editarVeiculo === "novo" ? null : editarVeiculo} aoFechar={() => setEditarVeiculo(null)} />}
      {editarCamera && <FormCamera camera={editarCamera === "nova" ? null : editarCamera} aoFechar={() => setEditarCamera(null)} />}
      {vincular && <FormVinculo camera={vincular} veiculos={veiculos.data ?? []} aoFechar={() => setVincular(null)} />}
      {historico && <Historico camera={historico} aoFechar={() => setHistorico(null)} />}
    </div>
  );
}

function FormVeiculo({ veiculo, aoFechar }: { veiculo: VeiculoCadastro | null; aoFechar: () => void }) {
  const [placa, setPlaca] = useState(veiculo?.placa ?? "");
  const [tipo, setTipo] = useState(veiculo?.tipo ?? "caminhao");
  const [modelo, setModelo] = useState(veiculo?.modelo ?? "");
  const [ano, setAno] = useState(veiculo?.anoFabricacao ? String(veiculo.anoFabricacao) : "");
  const [capacidade, setCapacidade] = useState(veiculo?.capacidadePassageiros ? String(veiculo.capacidadePassageiros) : "");
  const [ativo, setAtivo] = useState(veiculo?.ativo ?? true);
  const salvar = useSalvar(
    () => {
      const dados = { tipo, modelo: modelo || null, anoFabricacao: numeroOuNulo(ano), capacidadePassageiros: numeroOuNulo(capacidade), ativo };
      return veiculo ? api.put(`/cadastros/veiculos/${veiculo.id}`, dados) : api.post("/cadastros/veiculos", { ...dados, placa });
    },
    CHAVES,
    veiculo ? "Veículo atualizado" : "Veículo cadastrado",
    aoFechar,
  );
  return (
    <Formulario titulo={veiculo ? `Editar ${veiculo.placa}` : "Novo veículo"} aberto aoFechar={aoFechar} aoSalvar={() => salvar.mutate(undefined)} salvando={salvar.isPending}>
      <div className="grid grid-cols-2 gap-3">
        <Rotulo texto="Placa">
          <input className={entrada} value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} disabled={!!veiculo} placeholder="ABC1D23" required />
        </Rotulo>
        <Rotulo texto="Tipo">
          <select className={entrada} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(ROTULO_TIPO_VEICULO).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </Rotulo>
        <Rotulo texto="Modelo" className="col-span-2">
          <input className={entrada} value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Volvo FH 540" />
        </Rotulo>
        <Rotulo texto="Ano de fabricação">
          <input className={entrada} inputMode="numeric" value={ano} onChange={(e) => setAno(e.target.value)} />
        </Rotulo>
        <Rotulo texto="Passageiros (ônibus)">
          <input className={entrada} inputMode="numeric" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} />
        </Rotulo>
      </div>
      {veiculo && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Veículo ativo (desativar retira a câmera)
        </label>
      )}
    </Formulario>
  );
}

function FormCamera({ camera, aoFechar }: { camera: DispositivoCadastro | null; aoFechar: () => void }) {
  const [deviceId, setDeviceId] = useState(camera?.deviceId ?? "");
  const [codigo, setCodigo] = useState(camera?.codigo ?? "");
  const [descricao, setDescricao] = useState(camera?.descricao ?? "");
  const [status, setStatus] = useState(camera?.status ?? "ativo");
  const salvar = useSalvar(
    () => (camera ? api.put(`/cadastros/dispositivos/${camera.id}`, { codigo, descricao: descricao || null, status }) : api.post("/cadastros/dispositivos", { deviceId, codigo, descricao: descricao || null })),
    CHAVES,
    camera ? "Câmera atualizada" : "Câmera cadastrada",
    aoFechar,
  );
  return (
    <Formulario titulo={camera ? `Câmera ${camera.deviceId}` : "Pré-cadastrar câmera"} aberto aoFechar={aoFechar} aoSalvar={() => salvar.mutate(undefined)} salvando={salvar.isPending}>
      <Rotulo texto="ID gravado no dispositivo">
        <input className={entrada} value={deviceId} onChange={(e) => setDeviceId(e.target.value)} disabled={!!camera} placeholder="dg-edge-0017" required />
      </Rotulo>
      <Rotulo texto="Código do veículo nos relatórios">
        <input className={entrada} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="TRK-1057" required />
      </Rotulo>
      <Rotulo texto="Descrição">
        <input className={entrada} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Câmera IR embarcada" />
      </Rotulo>
      {camera && (
        <Rotulo texto="Status">
          <select className={entrada} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ativo">Ativa</option>
            <option value="inativo">Inativa (retira do veículo)</option>
          </select>
        </Rotulo>
      )}
    </Formulario>
  );
}

function FormVinculo({ camera, veiculos, aoFechar }: { camera: DispositivoCadastro; veiculos: VeiculoCadastro[]; aoFechar: () => void }) {
  const [veiculoId, setVeiculoId] = useState("");
  const [codigo, setCodigo] = useState(camera.codigo ?? "");
  const [motivo, setMotivo] = useState("");
  const salvar = useSalvar(
    async () => {
      // Câmera pendente: primeiro ganha código (vira da empresa), depois é instalada.
      if (camera.pendente || camera.codigo !== codigo) await api.post("/cadastros/dispositivos", { deviceId: camera.deviceId, codigo });
      return api.post(`/cadastros/dispositivos/${camera.id}/vincular`, { veiculoId, motivo: motivo || null });
    },
    [...CHAVES, ["motoristas-ao-vivo"]],
    "Câmera instalada no veículo",
    aoFechar,
  );
  const alvo = veiculos.find((v) => v.id === veiculoId);
  return (
    <Formulario titulo={`Instalar a câmera ${camera.deviceId}`} aberto aoFechar={aoFechar} aoSalvar={() => salvar.mutate(undefined)} salvando={salvar.isPending} textoSalvar="Instalar">
      <Rotulo texto="Código do veículo nos relatórios">
        <input className={entrada} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="TRK-1057" required />
      </Rotulo>
      <Rotulo texto="Veículo">
        <select className={entrada} value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required>
          <option value="">Escolha…</option>
          {veiculos
            .filter((v) => v.ativo && v.id !== camera.veiculoId)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa} • {ROTULO_TIPO_VEICULO[v.tipo]} {v.cameraCodigo ? `(hoje com ${v.cameraCodigo})` : "(sem câmera)"}
              </option>
            ))}
        </select>
      </Rotulo>
      {alvo?.cameraCodigo && <p className="text-xs text-risk-medium">A câmera {alvo.cameraCodigo} será retirada desse veículo.</p>}
      {camera.placa && <p className="text-xs text-muted-foreground">Hoje ela está no {camera.placa}; esse vínculo será encerrado agora.</p>}
      <Rotulo texto="Motivo (opcional)">
        <input className={entrada} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Veículo na oficina, troca por defeito…" />
      </Rotulo>
    </Formulario>
  );
}

function Historico({ camera, aoFechar }: { camera: DispositivoCadastro; aoFechar: () => void }) {
  const q = useQuery({ queryKey: ["historico-camera", camera.id], queryFn: () => api.get<Vinculo[]>(`/cadastros/dispositivos/${camera.id}/historico`) });
  return (
    <Dialog open onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico da câmera {camera.codigo ?? camera.deviceId}</DialogTitle>
        </DialogHeader>
        <Conteudo q={q} altura={120}>
          {(lista) =>
            lista.length === 0 ? (
              <Vazio>Nunca foi instalada.</Vazio>
            ) : (
              <ul className="space-y-2 text-sm">
                {lista.map((v) => (
                  <li key={v.id} className="rounded-lg border border-border p-2.5">
                    <span className="font-mono">{v.placa}</span> ({ROTULO_TIPO_VEICULO[v.tipo]}) — {dataHora(v.inicio)} até {v.fim ? dataHora(v.fim) : "hoje"}
                    {v.motivo && <p className="text-xs text-muted-foreground">{v.motivo}</p>}
                  </li>
                ))}
              </ul>
            )
          }
        </Conteudo>
      </DialogContent>
    </Dialog>
  );
}
