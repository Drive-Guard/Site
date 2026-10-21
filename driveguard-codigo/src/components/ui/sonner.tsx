import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Tema dos avisos igual ao da dashboard (classe .dark no <html>, ver lib/tema.tsx). */
function useTemaDoDocumento(): "light" | "dark" {
  const ler = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");
  const [tema, setTema] = useState<"light" | "dark">(ler);
  useEffect(() => {
    const obs = new MutationObserver(() => setTema(ler()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return tema;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const tema = useTemaDoDocumento();
  return (
    <Sonner
      theme={tema}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
