import type { ReactNode } from "react";
import type { Semaforo } from "@/lib/dominio";

export function TituloPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{titulo}</h1>
        {descripcion && (
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            {descripcion}
          </p>
        )}
      </div>
      {acciones}
    </div>
  );
}

export function Barra({
  porcentaje,
  color = "var(--color-marca)",
}: {
  porcentaje: number;
  color?: string;
}) {
  const valor = Math.min(Math.max(porcentaje, 0), 100);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-lienzo)]"
      role="progressbar"
      aria-valuenow={Math.round(valor)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${valor}%`, background: color }}
      />
    </div>
  );
}

export const COLOR_SEMAFORO: Record<Semaforo, string> = {
  verde: "#2f855a",
  amarillo: "#b7791f",
  rojo: "#c53030",
};

export const FONDO_SEMAFORO: Record<Semaforo, string> = {
  verde: "bg-green-50 text-green-800",
  amarillo: "bg-amber-50 text-amber-800",
  rojo: "bg-red-50 text-red-800",
};

export function Metrica({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <div className="tarjeta">
      <p className="text-xs text-[var(--color-tinta-suave)]">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      {detalle && (
        <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">{detalle}</p>
      )}
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--color-borde)] px-4 py-8 text-center text-sm text-[var(--color-tinta-suave)]">
      {children}
    </p>
  );
}

export function BotonEnviar({
  children,
  variante = "principal",
}: {
  children: ReactNode;
  variante?: "principal" | "suave";
}) {
  return (
    <button
      type="submit"
      className={variante === "principal" ? "boton" : "boton-suave"}
    >
      {children}
    </button>
  );
}
