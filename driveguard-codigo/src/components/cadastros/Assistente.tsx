/**
 * Assistente "Colocar câmera em operação": câmera, veículo e motorista numa
 * tela só, já vinculados (POST /cadastros/operacao, uma transação).
 *
 * Substitui o caminho antigo de três cadastros separados que precisavam
 * "casar" pelo ID. No fim, mostra exatamente o que gravar no .env do
 * dispositivo (DRIVEGUARD_DEVICE_ID e DRIVEGUARD_MOTORISTA_ID).
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Check, Copy, Loader2, Truck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Selecao } from "@/components/comum/Selecao";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { relativo, ROTULO_TIPO_VEICULO } from "@/lib/formato";
import { codigoDoNome, normalizarId } from "@/lib/identificadores";
import type { DispositivoCadastro, MotoristaCadastro, ResultadoOperacao, VeiculoCadastro } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { BotaoPrimario, BotaoSecundario, CampoId, entrada, Rotulo, Segmentos, useSalvar } from "./comum";

type ModoCamera = "existente" | "nova";
type ModoVeiculo = "existente" | "novo";
type ModoMotorista = "nenhum" | "existente" | "completar" | "novo";

export interface InicioAssistente {
  dispositivoId?: string;
  motoristaId?: string;
}

const CHAVES = [["veiculos"], ["dispositivos"], ["cad-motoristas"], ["motoristas-ao-vivo"]];

export function Assistente({ inicio, aoFechar }: { inicio?: InicioAssistente; aoFechar: () => void }) {
  const dispositivos = useQuery({ queryKey: ["dispositivos"], queryFn: () => api.get<DispositivoCadastro[]>("/cadastros/dispositivos") });
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: () => api.get<VeiculoCadastro[]>("/cadastros/veiculos") });
  const motoristas = useQuery({ queryKey: ["cad-motoristas"], queryFn: () => api.get<MotoristaCadastro[]>("/cadastros/motoristas") });
  const [resultado, setResultado] = useState<ResultadoOperacao | null>(null);

  // ---------------------------------------------------------------- câmera
  const [modoCamera, setModoCamera] = useState<ModoCamera>(inicio?.dispositivoId ? "existente" : "nova");
  const [dispositivoId, setDispositivoId] = useState(inicio?.dispositivoId ?? "");
  const [deviceId, setDeviceId] = useState("");
  const [codigoCamera, setCodigoCamera] = useState("");
  const camerasLivres = (dispositivos.data ?? []).filter((d) => d.pendente || !d.veiculoId || d.id === inicio?.dispositivoId);
  const camera = (dispositivos.data ?? []).find((d) => d.id === dispositivoId);

  // --------------------------------------------------------------- veículo
  const [modoVeiculo, setModoVeiculo] = useState<ModoVeiculo>("novo");
  const [veiculoId, setVeiculoId] = useState("");
  const [placa, setPlaca] = useState("");
  const [tipo, setTipo] = useState("caminhao");
  const [modelo, setModelo] = useState("");
  const veiculosAtivos = (veiculos.data ?? []).filter((v) => v.ativo);
  const veiculo = veiculosAtivos.find((v) => v.id === veiculoId);

  // ------------------------------------------------------------- motorista
  // O motorista de uma câmera pendente ainda está na empresa provisória (não vem
  // na lista da empresa): entra aqui para poder ser completado.
  const daEmpresa = (motoristas.data ?? []).filter((m) => !m.cadastrado);
  const daCamera =
    camera?.ultimoMotoristaPendente && camera.ultimoMotoristaId && !daEmpresa.some((m) => m.id === camera.ultimoMotoristaId)
      ? [{ id: camera.ultimoMotoristaId, nome: camera.ultimoMotoristaNome ?? "Motorista não cadastrado", ultimoDispositivo: camera.deviceId, ultimaLeituraEm: camera.ultimoContatoEm }]
      : [];
  const naoCadastrados = [...daCamera, ...daEmpresa.map((m) => ({ id: m.id, nome: m.nome, ultimoDispositivo: m.ultimoDispositivo, ultimaLeituraEm: m.ultimaLeituraEm }))];
  const cadastrados = (motoristas.data ?? []).filter((m) => m.cadastrado);
  const [modoMotorista, setModoMotorista] = useState<ModoMotorista>(inicio?.motoristaId ? "completar" : "novo");
  const [motoristaId, setMotoristaId] = useState(inicio?.motoristaId ?? "");
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoEditado, setCodigoEditado] = useState(false);

  // A câmera pendente traz o motorista que ela já está mandando: sugere completar.
  useEffect(() => {
    if (camera?.ultimoMotoristaPendente && camera.ultimoMotoristaId) {
      setModoMotorista("completar");
      setMotoristaId(camera.ultimoMotoristaId);
    }
  }, [camera?.id, camera?.ultimoMotoristaPendente, camera?.ultimoMotoristaId]);
  useEffect(() => {
    if (!codigoEditado) setCodigo(codigoDoNome(nome));
  }, [nome, codigoEditado]);
  useEffect(() => {
    if (!inicio?.dispositivoId && (dispositivos.data ?? []).some((d) => d.pendente)) setModoCamera("existente");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispositivos.isSuccess]);

  const placaFinal = modoVeiculo === "novo" ? placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : (veiculo?.placa ?? "");
  const codigoCameraFinal = normalizarId(codigoCamera).toUpperCase() || placaFinal;

  const faltando = useMemo(() => {
    const f: string[] = [];
    if (modoCamera === "existente" && !dispositivoId) f.push("escolha a câmera");
    if (modoCamera === "nova" && normalizarId(deviceId).length < 3) f.push("informe o ID do dispositivo");
    if (modoVeiculo === "existente" && !veiculoId) f.push("escolha o veículo");
    if (modoVeiculo === "novo" && placaFinal.length < 7) f.push("informe a placa");
    if ((modoMotorista === "existente" || modoMotorista === "completar") && !motoristaId) f.push("escolha o motorista");
    if ((modoMotorista === "novo" || modoMotorista === "completar") && nome.trim().length < 2) f.push("informe o nome do motorista");
    return f;
  }, [modoCamera, dispositivoId, deviceId, modoVeiculo, veiculoId, placaFinal, modoMotorista, motoristaId, nome]);

  const salvar = useSalvar(
    () =>
      api.post<ResultadoOperacao>("/cadastros/operacao", {
        camera: {
          dispositivoId: modoCamera === "existente" ? dispositivoId : null,
          deviceId: modoCamera === "nova" ? deviceId : null,
          codigo: codigoCamera || null,
        },
        veiculo: modoVeiculo === "existente" ? { veiculoId } : { placa, tipo, modelo: modelo || null },
        motorista:
          modoMotorista === "nenhum"
            ? null
            : modoMotorista === "existente"
              ? { motoristaId }
              : modoMotorista === "completar"
                ? { motoristaId, nome }
                : { nome, codigo: codigo || null },
      }),
    CHAVES,
    "Câmera em operação",
    (r) => setResultado(r),
  );

  return (
    <Dialog open onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{resultado ? "Pronto: câmera em operação" : "Colocar câmera em operação"}</DialogTitle>
          {!resultado && (
            <p className="text-xs text-muted-foreground">Câmera, veículo e motorista de uma vez, já vinculados. Use o que já existe ou cadastre na hora.</p>
          )}
        </DialogHeader>

        {resultado ? (
          <Resultado r={resultado} />
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (faltando.length) return toast.error(`Falta: ${faltando.join(", ")}.`);
              salvar.mutate(undefined);
            }}
          >
            <Secao numero={1} titulo="Câmera" icone={Camera}>
              <Segmentos<ModoCamera>
                valor={modoCamera}
                aoMudar={setModoCamera}
                opcoes={[
                  { valor: "existente", rotulo: `Já está enviando ou sem veículo (${camerasLivres.length})`, desabilitada: camerasLivres.length === 0 },
                  { valor: "nova", rotulo: "Câmera nova" },
                ]}
              />
              {modoCamera === "existente" ? (
                <Rotulo texto="Câmera">
                  <Selecao
                    valor={dispositivoId}
                    aoMudar={setDispositivoId}
                    placeholder="Escolha a câmera…"
                    opcoes={camerasLivres.map((d) => ({
                      valor: d.id,
                      rotulo: (
                        <span className="font-mono">
                          {d.deviceId}
                          {d.codigo ? ` · ${d.codigo}` : ""}
                        </span>
                      ),
                      detalhe: d.pendente
                        ? `pendente • último contato ${relativo(d.ultimoContatoEm)}${d.ultimoMotoristaNome ? ` • ${d.ultimoMotoristaCodigo ?? d.ultimoMotoristaNome}` : ""}`
                        : "da empresa, sem veículo",
                    }))}
                  />
                </Rotulo>
              ) : (
                <Rotulo texto="ID do dispositivo (o DRIVEGUARD_DEVICE_ID)">
                  <CampoId valor={deviceId} aoMudar={setDeviceId} placeholder="dg-edge-0017" minusculo />
                </Rotulo>
              )}
              <Rotulo texto="Código nos relatórios (opcional)" ajuda={`Se ficar vazio, usa a placa${placaFinal ? ` (${placaFinal})` : ""}.`}>
                <input className={entrada} value={codigoCamera} onChange={(e) => setCodigoCamera(e.target.value.toUpperCase())} placeholder={placaFinal || "TRK-1057"} />
              </Rotulo>
            </Secao>

            <Secao numero={2} titulo="Veículo" icone={Truck}>
              <Segmentos<ModoVeiculo>
                valor={modoVeiculo}
                aoMudar={setModoVeiculo}
                opcoes={[
                  { valor: "novo", rotulo: "Veículo novo" },
                  { valor: "existente", rotulo: `Já cadastrado (${veiculosAtivos.length})`, desabilitada: veiculosAtivos.length === 0 },
                ]}
              />
              {modoVeiculo === "existente" ? (
                <Rotulo texto="Veículo">
                  <Selecao
                    valor={veiculoId}
                    aoMudar={setVeiculoId}
                    placeholder="Escolha o veículo…"
                    opcoes={veiculosAtivos.map((v) => ({
                      valor: v.id,
                      rotulo: (
                        <span>
                          <span className="font-mono">{v.placa}</span> · {ROTULO_TIPO_VEICULO[v.tipo] ?? v.tipo}
                          {v.modelo ? ` · ${v.modelo}` : ""}
                        </span>
                      ),
                      detalhe: v.cameraCodigo ? `hoje com a câmera ${v.cameraCodigo} (será trocada)` : "sem câmera",
                    }))}
                  />
                </Rotulo>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Rotulo texto="Placa">
                    <input className={cn(entrada, "font-mono")} value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" />
                  </Rotulo>
                  <Rotulo texto="Tipo">
                    <Selecao valor={tipo} aoMudar={setTipo} opcoes={Object.entries(ROTULO_TIPO_VEICULO).filter(([v]) => v !== "nd").map(([v, r]) => ({ valor: v, rotulo: r }))} />
                  </Rotulo>
                  <Rotulo texto="Modelo (opcional)">
                    <input className={entrada} value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Volvo FH 540" />
                  </Rotulo>
                </div>
              )}
            </Secao>

            <Secao numero={3} titulo="Motorista" icone={UserRound}>
              <Segmentos<ModoMotorista>
                valor={modoMotorista}
                aoMudar={(m) => {
                  setModoMotorista(m);
                  if (m !== "completar" && m !== "existente") setMotoristaId("");
                }}
                opcoes={[
                  { valor: "novo", rotulo: "Motorista novo" },
                  { valor: "completar", rotulo: `Chegou sem cadastro (${naoCadastrados.length})`, desabilitada: naoCadastrados.length === 0 },
                  { valor: "existente", rotulo: `Já cadastrado (${cadastrados.length})`, desabilitada: cadastrados.length === 0 },
                  { valor: "nenhum", rotulo: "Depois" },
                ]}
              />
              {modoMotorista === "novo" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Rotulo texto="Nome">
                    <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Caetano Resende Domingues" />
                  </Rotulo>
                  <Rotulo texto="ID do motorista (o DRIVEGUARD_MOTORISTA_ID)" ajuda="Sai do nome; pode trocar.">
                    <CampoId
                      valor={codigo}
                      aoMudar={(v) => {
                        setCodigo(v);
                        setCodigoEditado(true);
                      }}
                      placeholder="caetano-resende"
                    />
                  </Rotulo>
                </div>
              )}
              {modoMotorista === "completar" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Rotulo texto="Motorista que já está enviando">
                    <Selecao
                      valor={motoristaId}
                      aoMudar={setMotoristaId}
                      placeholder="Escolha…"
                      opcoes={naoCadastrados.map((m) => ({
                        valor: m.id,
                        rotulo: m.nome,
                        detalhe: `${m.ultimoDispositivo ? `câmera ${m.ultimoDispositivo} • ` : ""}última leitura ${relativo(m.ultimaLeituraEm)}`,
                      }))}
                    />
                  </Rotulo>
                  <Rotulo texto="Nome">
                    <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do motorista" />
                  </Rotulo>
                  <p className="sm:col-span-2 text-[11px] text-muted-foreground">O dispositivo já manda o ID dele: nada muda no .env, o histórico fica com o motorista.</p>
                </div>
              )}
              {modoMotorista === "existente" && (
                <Rotulo texto="Motorista">
                  <Selecao
                    valor={motoristaId}
                    aoMudar={setMotoristaId}
                    placeholder="Escolha…"
                    opcoes={cadastrados.map((m) => ({ valor: m.id, rotulo: m.nome, detalhe: <span className="font-mono">{m.codigo}</span> }))}
                  />
                </Rotulo>
              )}
              {modoMotorista === "nenhum" && <p className="text-[11px] text-muted-foreground">Quando o dispositivo mandar dados, o motorista aparece em "Pendentes" para completar.</p>}
            </Secao>

            <DialogFooter className="pt-1 items-center gap-2">
              {faltando.length > 0 && <span className="mr-auto text-[11px] text-muted-foreground">Falta: {faltando.join(", ")}</span>}
              <BotaoSecundario type="button" onClick={aoFechar} className="px-3 py-2 text-sm">
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Colocar em operação
              </BotaoPrimario>
            </DialogFooter>
          </form>
        )}
        {resultado && (
          <DialogFooter>
            <BotaoPrimario onClick={aoFechar}>Concluir</BotaoPrimario>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Secao({ numero, titulo, icone: Icone, children }: { numero: number; titulo: string; icone: typeof Camera; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{numero}</span>
        <Icone className="h-4 w-4 text-muted-foreground" /> {titulo}
      </h4>
      {children}
    </section>
  );
}

function Resultado({ r }: { r: ResultadoOperacao }) {
  const env = [`DRIVEGUARD_DEVICE_ID=${r.configuracao.DRIVEGUARD_DEVICE_ID}`, r.configuracao.DRIVEGUARD_MOTORISTA_ID ? `DRIVEGUARD_MOTORISTA_ID=${r.configuracao.DRIVEGUARD_MOTORISTA_ID}` : null]
    .filter(Boolean)
    .join("\n");
  return (
    <div className="space-y-4 text-sm">
      <ul className="space-y-1.5">
        <li>
          <Camera className="inline h-4 w-4 mr-1.5 text-muted-foreground" /> Câmera <span className="font-mono">{r.camera.deviceId}</span> (código {r.camera.codigo})
        </li>
        <li>
          <Truck className="inline h-4 w-4 mr-1.5 text-muted-foreground" /> instalada no veículo <span className="font-mono">{r.veiculo.placa}</span>
        </li>
        {r.motorista && (
          <li>
            <UserRound className="inline h-4 w-4 mr-1.5 text-muted-foreground" /> motorista {r.motorista.nome}
            {r.motorista.codigo && (
              <>
                {" "}
                (<span className="font-mono">{r.motorista.codigo}</span>)
              </>
            )}
          </li>
        )}
      </ul>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">No .env do dispositivo (repositório ML), deixe assim:</p>
        <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 font-mono text-[13px]">
          <pre className="flex-1 whitespace-pre-wrap select-all">{env}</pre>
          <button
            type="button"
            title="Copiar"
            onClick={() => {
              navigator.clipboard?.writeText(env);
              toast.success("Copiado");
            }}
            className="p-1.5 rounded-md hover:bg-secondary"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        {!r.configuracao.DRIVEGUARD_MOTORISTA_ID && r.motorista && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">O ID do motorista não muda: o dispositivo já manda o dele.</p>
        )}
      </div>
    </div>
  );
}
