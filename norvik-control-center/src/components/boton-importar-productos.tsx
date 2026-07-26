"use client";

import { useState, useTransition } from "react";
import { importarProductosShopify } from "@/actions/catalogo";

export function BotonImportarProductos({ pendientes }: { pendientes: number }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (pendientes === 0 && !mensaje) return null;

  return (
    <div className="tarjeta flex flex-wrap items-center justify-between gap-3 border-[var(--color-marca)] bg-[var(--color-marca-suave)]">
      <div>
        <p className="text-sm font-medium">Productos que faltan por traer de Shopify</p>
        <p className="text-xs text-[var(--color-tinta-suave)]">
          {mensaje ??
            `Hay ${pendientes} producto${pendientes > 1 ? "s" : ""} activo${pendientes > 1 ? "s" : ""} en tu tienda que aún no está${pendientes > 1 ? "n" : ""} aquí. Se importan con su precio y stock reales.`}
        </p>
      </div>
      {pendientes > 0 && (
        <button
          type="button"
          disabled={pendiente}
          className="boton shrink-0"
          onClick={() => {
            iniciarTransicion(async () => {
              const importados = await importarProductosShopify();
              setMensaje(
                importados > 0
                  ? `Listo: ${importados} producto${importados > 1 ? "s" : ""} importado${importados > 1 ? "s" : ""}. Revisa los que tengan el aviso "Faltan datos": les falta el coste de Trendsi.`
                  : "No había nada pendiente de importar.",
              );
            });
          }}
        >
          {pendiente ? "Importando…" : "Importar de Shopify"}
        </button>
      )}
    </div>
  );
}
