/**
 * Texto com os códigos de motorista (DRV-1013) clicáveis: abrem o painel do
 * motorista na aba Motoristas. Usado nos insights e resumos da IA.
 */

import { Fragment } from "react";
import { useIrPara } from "@/lib/navegacao";

const CODIGO = /\b(DRV-\d{3,})\b/g;

export function TextoComLinks({ texto }: { texto: string }) {
  const irPara = useIrPara();
  const partes = texto.split(CODIGO);
  return (
    <>
      {partes.map((parte, i) =>
        i % 2 === 1 ? (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              irPara("motoristas", { codigo: parte, filtro: "todos" });
            }}
            className="font-mono font-medium text-primary underline-offset-2 hover:underline"
            title={`Abrir ${parte}`}
          >
            {parte}
          </button>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </>
  );
}
