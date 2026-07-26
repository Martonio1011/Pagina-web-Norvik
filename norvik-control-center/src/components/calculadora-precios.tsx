"use client";

import { useState } from "react";
import { margen, precioSugerido } from "@/lib/dominio";
import { dinero, porcentaje } from "@/lib/formato";

export function CalculadoraPrecios({
  margenObjetivo,
  moneda,
}: {
  margenObjetivo: number;
  moneda: string;
}) {
  const [coste, setCoste] = useState("");
  const [envio, setEnvio] = useState("");
  const [objetivo, setObjetivo] = useState(String(margenObjetivo));

  const numero = (valor: string) => {
    const n = Number(valor.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const costeTotal = numero(coste) + numero(envio);
  const sugerido = precioSugerido(costeTotal, numero(objetivo));
  const margenReal = margen(sugerido, costeTotal);
  const beneficio = sugerido > 0 ? sugerido - costeTotal : 0;

  return (
    <div className="tarjeta">
      <h2 className="text-sm font-semibold">Calculadora de precios</h2>
      <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
        Introduce el coste de Trendsi y el envío: te devuelve el precio con
        margen objetivo, ya redondeado a ,99.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor="calc-coste">
            Coste Trendsi
          </label>
          <input
            id="calc-coste"
            inputMode="decimal"
            value={coste}
            onChange={(e) => setCoste(e.target.value)}
            className="campo"
            placeholder="12,50"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="calc-envio">
            Coste de envío
          </label>
          <input
            id="calc-envio"
            inputMode="decimal"
            value={envio}
            onChange={(e) => setEnvio(e.target.value)}
            className="campo"
            placeholder="4,00"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="calc-margen">
            Margen objetivo (%)
          </label>
          <input
            id="calc-margen"
            inputMode="decimal"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className="campo"
          />
        </div>
      </div>

      {costeTotal > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--color-marca-suave)] p-3">
            <p className="text-xs text-[var(--color-tinta-suave)]">
              Precio sugerido
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {dinero(sugerido, moneda)}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-lienzo)] p-3">
            <p className="text-xs text-[var(--color-tinta-suave)]">
              Margen real
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {porcentaje(margenReal, 1)}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-lienzo)] p-3">
            <p className="text-xs text-[var(--color-tinta-suave)]">
              Beneficio bruto por venta
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {dinero(beneficio, moneda)}
            </p>
          </div>
        </div>
      )}

      {costeTotal > 0 && margenReal !== null && margenReal < 50 && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
          Con este margen no queda dinero para publicidad. Sube el precio o
          descarta el producto.
        </p>
      )}
    </div>
  );
}
