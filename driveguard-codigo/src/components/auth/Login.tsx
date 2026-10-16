import { useState, type FormEvent } from "react";
import { Eye, KeyRound, Loader2, LogIn, ShieldCheck, Truck, UserCog } from "lucide-react";
import { type DesafioNovaSenha, type Papel, useAuth } from "@/lib/auth";
import { config } from "@/lib/config";
import { SeletorTema } from "@/lib/tema";

const campo =
  "w-full bg-secondary/60 border border-border text-sm rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

function Marca() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
        <Eye className="h-5 w-5 text-primary-foreground" />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Drive<span className="text-primary">Guard</span>
        </h1>
        <p className="text-xs text-muted-foreground">Detecção de fadiga & prevenção de acidentes</p>
      </div>
    </div>
  );
}

export function Login() {
  const { desenvolvimento } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <SeletorTema className="absolute top-4 right-4" />
      <div className="w-full max-w-sm glass-card rounded-xl p-8">
        <Marca />
        {desenvolvimento ? <LoginDev /> : <LoginCognito />}
        <p className="mt-8 text-[11px] text-muted-foreground">Ambiente: {config().ambiente}</p>
      </div>
    </div>
  );
}

function LoginDev() {
  const { entrarComoDev } = useAuth();
  const opcoes: { papel: Papel; titulo: string; desc: string; icone: typeof UserCog }[] = [
    { papel: "admin", titulo: "Administrador", desc: "Tudo, inclusive usuários", icone: ShieldCheck },
    { papel: "gestor", titulo: "Gestor de frota", desc: "Visão gerencial, ROI, relatórios e cadastros", icone: UserCog },
    { papel: "operador", titulo: "Operador", desc: "Monitoramento em tempo real e alertas", icone: Truck },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Modo de desenvolvimento: escolha o papel.</p>
      {opcoes.map((o) => (
        <button
          key={o.papel}
          onClick={() => entrarComoDev(o.papel)}
          className="w-full text-left rounded-xl border border-border p-3 hover:border-primary/60 hover:bg-secondary/40 transition flex items-center gap-3"
        >
          <o.icone className="h-5 w-5 text-primary" />
          <span>
            <span className="block text-sm font-medium">{o.titulo}</span>
            <span className="block text-xs text-muted-foreground">{o.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function LoginCognito() {
  const { entrar, definirNovaSenha } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [desafio, setDesafio] = useState<DesafioNovaSenha | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      if (desafio) {
        if (nova !== confirma) throw new Error("As senhas não conferem.");
        await definirNovaSenha(desafio, nova);
      } else {
        const d = await entrar(email, senha);
        if (d) setDesafio(d);
      }
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      {desafio ? (
        <>
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary flex gap-2">
            <KeyRound className="h-4 w-4 shrink-0" /> Primeiro acesso: defina uma senha nova (10+ caracteres, com maiúscula, minúscula e número).
          </div>
          <input className={campo} type="password" placeholder="Nova senha" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" required />
          <input className={campo} type="password" placeholder="Repita a nova senha" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" required />
        </>
      ) : (
        <>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
            <input className={campo} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Senha</label>
            <input className={campo} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
          </div>
        </>
      )}
      {erro && <p className="text-xs text-risk-high">{erro}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition glow-primary disabled:opacity-60"
      >
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {desafio ? "Salvar senha e entrar" : "Entrar"}
      </button>
    </form>
  );
}
