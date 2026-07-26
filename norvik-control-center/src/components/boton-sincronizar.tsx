"use client";

import { useState, useTransition } from "react";
import { aplicarProgresoShopify } from "@/actions/tareas";

export function BotonSincronizar({ pendientes }: { pendientes: number }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (pendientes === 0 && !mensaje) return null;

  return (
    <div className="tarjeta flex flex-wrap items-center justify-between gap-3 border-[var(--color-marca)] bg-[var(--color-marca-suave)]">
      <div>
        <p className="text-sm font-medium">Progreso hecho fuera de la app</p>
        <p className="text-xs text-[var(--color-tinta-suave)]">
          {mensaje ??
            `Hay ${pendientes} tarea${pendientes > 1 ? "s" : ""} ya resuelta${pendientes > 1 ? "s" : ""} directamente en Shopify. Márcalas de golpe.`}
        </p>
      </div>
      {pendientes > 0 && (
        <button
          type="button"
          disabled={pendiente}
          className="boton shrink-0"
          onClick={() => {
            iniciarTransicion(async () => {
              const aplicadas = await aplicarProgresoShopify();
              setMensaje(
                aplicadas > 0
                  ? `Listo: ${aplicadas} tarea${aplicadas > 1 ? "s" : ""} marcada${aplicadas > 1 ? "s" : ""} como hecha${aplicadas > 1 ? "s" : ""}.`
                  : "No había nada pendiente de sincronizar.",
              );
            });
          }}
        >
          {pendiente ? "Aplicando…" : "Sincronizar ahora"}
        </button>
      )}
    </div>
  );
}
