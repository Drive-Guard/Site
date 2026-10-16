/**
 * Usuários (só administrador): quem acessa a dashboard e com qual papel. O
 * usuário novo recebe uma senha temporária, mostrada uma única vez; no primeiro
 * login ele define a própria senha.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BotaoPrimario, BotaoSecundario, celula, entrada, Formulario, linha, Rotulo, Tabela, useSalvar } from "@/components/cadastros/comum";
import { Conteudo, Vazio } from "@/components/comum/Estado";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { type Papel, ROTULO_PAPEL, useAuth } from "@/lib/auth";
import { dataCurta } from "@/lib/formato";
import type { UsuarioDashboard } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const DESCRICAO_PAPEL: Record<Papel, string> = {
  admin: "Tudo, inclusive usuários",
  gestor: "Visão gerencial, ROI, relatórios e cadastros",
  operador: "Monitoramento em tempo real e alertas",
};

const STATUS: Record<string, string> = { CONFIRMED: "ativo", FORCE_CHANGE_PASSWORD: "aguardando 1º acesso", RESET_REQUIRED: "redefinir senha" };

export default function Usuarios() {
  const { usuario: eu } = useAuth();
  const q = useQuery({ queryKey: ["usuarios"], queryFn: () => api.get<UsuarioDashboard[]>("/usuarios") });
  const [novo, setNovo] = useState(false);
  const [senha, setSenha] = useState<{ email: string; senha: string } | null>(null);

  const mudarPapel = useSalvar(({ u, papel }: { u: UsuarioDashboard; papel: Papel }) => api.patch(`/usuarios/${encodeURIComponent(u.username)}`, { papel }), [["usuarios"]], "Papel alterado");
  const ativar = useSalvar((u: UsuarioDashboard) => api.patch(`/usuarios/${encodeURIComponent(u.username)}`, { ativo: !u.ativo }), [["usuarios"]], "Usuário atualizado");
  const remover = useSalvar((u: UsuarioDashboard) => api.del(`/usuarios/${encodeURIComponent(u.username)}`), [["usuarios"]], "Usuário removido");
  const redefinir = useSalvar(
    async (u: UsuarioDashboard) => {
      const r = await api.post<{ senhaTemporaria: string }>(`/usuarios/${encodeURIComponent(u.username)}/redefinir-senha`);
      setSenha({ email: u.email, senha: r.senhaTemporaria });
    },
    [["usuarios"]],
    "Senha temporária gerada",
  );

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Usuários da dashboard</h3>
          <p className="text-xs text-muted-foreground">Cada usuário enxerga só a frota da própria empresa.</p>
        </div>
        <BotaoPrimario onClick={() => setNovo(true)}>
          <Plus className="h-4 w-4" /> Novo usuário
        </BotaoPrimario>
      </div>
      <div className="grid sm:grid-cols-3 gap-2 mb-4">
        {(Object.keys(DESCRICAO_PAPEL) as Papel[]).map((p) => (
          <div key={p} className="rounded-xl border border-border p-3 text-xs">
            <p className="font-semibold text-sm">{ROTULO_PAPEL[p]}</p>
            <p className="text-muted-foreground">{DESCRICAO_PAPEL[p]}</p>
          </div>
        ))}
      </div>
      <Conteudo q={q} altura={200}>
        {(lista) =>
          lista.length === 0 ? (
            <Vazio>Nenhum usuário.</Vazio>
          ) : (
            <Tabela cabecalho={["Nome", "E-mail", "Papel", "Situação", "Criado em", ""]}>
              {lista.map((u) => {
                const souEu = u.email === eu?.email;
                return (
                  <tr key={u.username} className={cn(linha, !u.ativo && "opacity-50")}>
                    <td className={celula}>
                      {u.nome} {souEu && <span className="text-[10px] text-primary">(você)</span>}
                    </td>
                    <td className={cn(celula, "text-xs")}>{u.email}</td>
                    <td className={celula}>
                      <select
                        className={cn(entrada, "py-1 text-xs w-36")}
                        value={u.papel ?? ""}
                        disabled={souEu}
                        onChange={(e) => mudarPapel.mutate({ u, papel: e.target.value as Papel })}
                      >
                        {(Object.keys(ROTULO_PAPEL) as Papel[]).map((p) => (
                          <option key={p} value={p}>
                            {ROTULO_PAPEL[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={cn(celula, "text-xs")}>{u.ativo ? (STATUS[u.status] ?? u.status) : "desativado"}</td>
                    <td className={cn(celula, "text-xs")}>{dataCurta(u.criadoEm)}</td>
                    <td className={cn(celula, "text-right whitespace-nowrap space-x-1")}>
                      {!souEu && (
                        <>
                          <BotaoSecundario onClick={() => redefinir.mutate(u)} title="Gerar senha temporária">
                            <KeyRound className="h-3 w-3" />
                          </BotaoSecundario>
                          <BotaoSecundario onClick={() => ativar.mutate(u)}>{u.ativo ? "Desativar" : "Ativar"}</BotaoSecundario>
                          <BotaoSecundario
                            onClick={() => window.confirm(`Remover ${u.email}? Não dá para desfazer.`) && remover.mutate(u)}
                            className="hover:text-risk-high"
                            title="Remover"
                          >
                            <Trash2 className="h-3 w-3" />
                          </BotaoSecundario>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Tabela>
          )
        }
      </Conteudo>
      {novo && <FormUsuario aoFechar={() => setNovo(false)} aoCriar={(email, s) => setSenha({ email, senha: s })} />}
      {senha && <SenhaTemporaria {...senha} aoFechar={() => setSenha(null)} />}
    </div>
  );
}

function FormUsuario({ aoFechar, aoCriar }: { aoFechar: () => void; aoCriar: (email: string, senha: string) => void }) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState<Papel>("operador");
  const salvar = useSalvar(
    async () => {
      const r = await api.post<{ usuario: UsuarioDashboard; senhaTemporaria: string }>("/usuarios", { email, nome, papel });
      aoCriar(r.usuario.email, r.senhaTemporaria);
    },
    [["usuarios"]],
    "Usuário criado",
    aoFechar,
  );
  return (
    <Formulario titulo="Novo usuário" aberto aoFechar={aoFechar} aoSalvar={() => salvar.mutate(undefined)} salvando={salvar.isPending} textoSalvar="Criar">
      <Rotulo texto="Nome">
        <input className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Rotulo>
      <Rotulo texto="E-mail (login)">
        <input className={entrada} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Rotulo>
      <Rotulo texto="Papel">
        <select className={entrada} value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
          {(Object.keys(ROTULO_PAPEL) as Papel[]).map((p) => (
            <option key={p} value={p}>
              {ROTULO_PAPEL[p]} — {DESCRICAO_PAPEL[p]}
            </option>
          ))}
        </select>
      </Rotulo>
    </Formulario>
  );
}

function SenhaTemporaria({ email, senha, aoFechar }: { email: string; senha: string; aoFechar: () => void }) {
  return (
    <Dialog open onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Senha temporária</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Passe para <span className="text-foreground">{email}</span>. Ela aparece só agora; no primeiro acesso o usuário define a própria senha.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 font-mono text-lg">
          <span className="flex-1 select-all">{senha}</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(senha);
              toast.success("Copiada");
            }}
            className="p-1.5 rounded-md hover:bg-secondary"
            title="Copiar"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
