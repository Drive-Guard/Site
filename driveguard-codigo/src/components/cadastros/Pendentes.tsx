/**
 * Caixa de pendentes, no topo de Cadastros: câmeras e motoristas que já
 * mandam dados sem cadastro. Cada um se resolve com um clique: a câmera vai
 * para o assistente (já escolhida), o motorista só precisa do nome.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Camera, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { relativo } from "@/lib/formato";
import type { DispositivoCadastro, MotoristaCadastro } from "@/lib/tipos";
import type { InicioAssistente } from "./Assistente";
import { BotaoExcluir, BotaoPrimario, BotaoSecundario } from "./comum";
import { FormCompletarMotorista } from "./Motoristas";

export function Pendentes({ aoColocarEmOperacao }: { aoColocarEmOperacao: (i: InicioAssistente) => void }) {
  const dispositivos = useQuery({ queryKey: ["dispositivos"], queryFn: () => api.get<DispositivoCadastro[]>("/cadastros/dispositivos") });
  const motoristas = useQuery({ queryKey: ["cad-motoristas"], queryFn: () => api.get<MotoristaCadastro[]>("/cadastros/motoristas") });
  const [completar, setCompletar] = useState<MotoristaCadastro | null>(null);

  const cameras = (dispositivos.data ?? []).filter((d) => d.pendente);
  // Motoristas sem cadastro cuja câmera ainda é pendente aparecem junto da câmera.
  const naCamera = new Set(cameras.map((c) => c.ultimoMotoristaId).filter(Boolean));
  const avulsos = (motoristas.data ?? []).filter((m) => !m.cadastrado && !naCamera.has(m.id));
  if (cameras.length + avulsos.length === 0) return null;

  return (
    <div className="rounded-2xl border border-risk-medium/40 bg-risk-medium/10 p-4">
      <p className="text-sm font-semibold flex items-center gap-2 text-risk-medium">
        <AlertCircle className="h-4 w-4" /> Pendentes: {cameras.length + avulsos.length} {cameras.length + avulsos.length === 1 ? "item mandando" : "itens mandando"} dados sem
        cadastro
      </p>
      <ul className="mt-3 space-y-2">
        {cameras.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm rounded-lg bg-background/60 px-3 py-2">
            <span className="flex items-center gap-2 min-w-0">
              <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="min-w-0">
                Câmera <span className="font-mono">{d.deviceId}</span>
                <span className="text-muted-foreground"> • último contato {relativo(d.ultimoContatoEm)}</span>
                {d.ultimoMotoristaNome && <span className="text-muted-foreground"> • {d.ultimoMotoristaCodigo ?? d.ultimoMotoristaNome}</span>}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <BotaoPrimario onClick={() => aoColocarEmOperacao({ dispositivoId: d.id, motoristaId: d.ultimoMotoristaPendente ? (d.ultimoMotoristaId ?? undefined) : undefined })} className="text-xs py-1.5">
                Colocar em operação
              </BotaoPrimario>
              <BotaoExcluir caminho={`/cadastros/dispositivos/${d.id}`} nome={`a câmera ${d.deviceId}`} temHistorico={d.temHistorico} chaves={[["dispositivos"]]} />
            </span>
          </li>
        ))}
        {avulsos.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm rounded-lg bg-background/60 px-3 py-2">
            <span className="flex items-center gap-2 min-w-0">
              <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="min-w-0">
                {m.nome}
                <span className="text-muted-foreground">
                  {m.ultimoDispositivo ? ` • câmera ${m.ultimoDispositivo}` : ""} • última leitura {relativo(m.ultimaLeituraEm)}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <BotaoSecundario onClick={() => setCompletar(m)} className="border-risk-medium/50 text-risk-medium">
                <UserPlus className="h-3 w-3" /> Completar cadastro
              </BotaoSecundario>
              <BotaoExcluir caminho={`/cadastros/motoristas/${m.id}`} nome="o motorista" temHistorico={m.temHistorico} chaves={[["cad-motoristas"]]} />
            </span>
          </li>
        ))}
      </ul>
      {completar && <FormCompletarMotorista motorista={completar} aoFechar={() => setCompletar(null)} />}
    </div>
  );
}
