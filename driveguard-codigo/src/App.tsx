import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Login } from "@/components/auth/Login";
import { Shell } from "@/components/layout/Shell";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ErroApi } from "@/lib/api";
import { carregarConfig } from "@/lib/config";
import { FiltrosProvider } from "@/lib/filtros";

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Sem nova tentativa para erro de permissão ou validação.
      retry: (n, e) => !(e instanceof ErroApi && e.status < 500) && n < 2,
    },
  },
});

function Conteudo() {
  const { usuario } = useAuth();
  if (!usuario) return <Login />;
  return (
    <FiltrosProvider>
      <Shell />
    </FiltrosProvider>
  );
}

export function App() {
  const [estado, setEstado] = useState<"carregando" | "pronto" | string>("carregando");

  useEffect(() => {
    carregarConfig()
      .then(() => setEstado("pronto"))
      .catch((e: Error) => setEstado(e.message));
  }, []);

  if (estado === "carregando") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (estado !== "pronto") {
    return <div className="min-h-screen flex items-center justify-center text-sm text-risk-high px-6 text-center">{estado}</div>;
  }

  return (
    <QueryClientProvider client={cliente}>
      <AuthProvider>
        <Conteudo />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
