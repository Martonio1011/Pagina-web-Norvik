import {
  actualizarGasto,
  borrarGasto,
  crearGasto,
} from "@/actions/finanzas";
import { Metrica, TituloPagina, Vacio } from "@/components/ui";
import { prisma } from "@/lib/db";
import { CATEGORIAS_GASTO, ETIQUETA_CATEGORIA_GASTO } from "@/lib/dominio";
import { dinero, fechaCorta, mesLargo, valorInputFecha } from "@/lib/formato";

export const dynamic = "force-dynamic";

function claveMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PaginaFinanzas() {
  const [gastos, pedidos, ajustes] = await Promise.all([
    prisma.gasto.findMany({ orderBy: { fecha: "desc" } }),
    prisma.pedido.findMany({ orderBy: { fecha: "desc" } }),
    prisma.ajustes.findUnique({ where: { id: 1 } }),
  ]);
  const moneda = ajustes?.moneda ?? "EUR";

  const meses = new Map<
    string,
    { ingresos: number; costeProductos: number; gastos: number }
  >();
  const acumular = (
    clave: string,
    campo: "ingresos" | "costeProductos" | "gastos",
    valor: number,
  ) => {
    const actual = meses.get(clave) ?? {
      ingresos: 0,
      costeProductos: 0,
      gastos: 0,
    };
    actual[campo] += valor;
    meses.set(clave, actual);
  };

  for (const pedido of pedidos) {
    acumular(claveMes(pedido.fecha), "ingresos", pedido.ingreso);
    acumular(claveMes(pedido.fecha), "costeProductos", pedido.costeReal);
  }
  for (const gasto of gastos) {
    acumular(claveMes(gasto.fecha), "gastos", gasto.importe);
  }

  const resumenMensual = [...meses.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([clave, valores]) => ({
      clave,
      ...valores,
      beneficio: valores.ingresos - valores.costeProductos - valores.gastos,
    }));

  const ingresosTotal = pedidos.reduce((s, p) => s + p.ingreso, 0);
  const costeProductosTotal = pedidos.reduce((s, p) => s + p.costeReal, 0);
  const gastosTotal = gastos.reduce((s, g) => s + g.importe, 0);
  const beneficioTotal = ingresosTotal - costeProductosTotal - gastosTotal;

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Finanzas"
        descripcion="Los ingresos salen de los pedidos registrados; los gastos, de lo que apuntes aquí."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Metrica etiqueta="Ingresos" valor={dinero(ingresosTotal, moneda)} />
        <Metrica
          etiqueta="Coste de producto"
          valor={dinero(costeProductosTotal, moneda)}
        />
        <Metrica etiqueta="Gastos fijos" valor={dinero(gastosTotal, moneda)} />
        <Metrica
          etiqueta="Beneficio neto"
          valor={dinero(beneficioTotal, moneda)}
          detalle={beneficioTotal < 0 ? "Todavía en pérdidas" : undefined}
        />
      </div>

      <section className="tarjeta overflow-x-auto p-0">
        <div className="p-4 sm:p-5 sm:pb-3">
          <h2 className="text-sm font-semibold">Resumen mensual</h2>
        </div>
        {resumenMensual.length === 0 ? (
          <div className="px-4 pb-5 sm:px-5">
            <Vacio>Sin movimientos todavía.</Vacio>
          </div>
        ) : (
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="border-y border-[var(--color-borde)] text-left text-xs text-[var(--color-tinta-suave)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Mes</th>
                <th className="px-3 py-2.5 text-right font-medium">Ingresos</th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Coste producto
                </th>
                <th className="px-3 py-2.5 text-right font-medium">Gastos</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Beneficio neto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borde)]">
              {resumenMensual.map((mes) => (
                <tr key={mes.clave}>
                  <td className="px-4 py-2.5 capitalize">
                    {mesLargo(mes.clave)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {dinero(mes.ingresos, moneda)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {dinero(mes.costeProductos, moneda)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {dinero(mes.gastos, moneda)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-medium tabular-nums ${
                      mes.beneficio < 0 ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {dinero(mes.beneficio, moneda)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tarjeta">
        <h2 className="text-sm font-semibold">Gastos</h2>
        {gastos.length === 0 ? (
          <div className="mt-3">
            <Vacio>Todavía no hay gastos registrados.</Vacio>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {gastos.map((gasto) => (
              <details
                key={gasto.id}
                className="rounded-xl border border-[var(--color-borde)] p-3"
              >
                <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-[var(--color-tinta-suave)] tabular-nums">
                    {fechaCorta(gasto.fecha)}
                  </span>
                  <span className="insignia bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]">
                    {ETIQUETA_CATEGORIA_GASTO[gasto.categoria] ??
                      gasto.categoria}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    {gasto.concepto}
                    {gasto.recurrente && (
                      <span className="ml-2 text-xs text-[var(--color-tinta-suave)]">
                        recurrente
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {dinero(gasto.importe, moneda)}
                  </span>
                </summary>
                <form action={actualizarGasto} className="mt-3 grid gap-3">
                  <input type="hidden" name="id" value={gasto.id} />
                  <CamposGasto gasto={gasto} />
                  <div className="flex gap-2">
                    <button type="submit" className="boton">
                      Guardar
                    </button>
                    <button
                      type="submit"
                      formAction={borrarGasto}
                      className="boton-suave text-red-700"
                    >
                      Borrar
                    </button>
                  </div>
                </form>
              </details>
            ))}
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs underline underline-offset-2">
            Añadir un gasto
          </summary>
          <form action={crearGasto} className="mt-3 grid gap-3">
            <CamposGasto />
            <div>
              <button type="submit" className="boton">
                Añadir gasto
              </button>
            </div>
          </form>
        </details>
      </section>
    </div>
  );
}

function CamposGasto({
  gasto,
}: {
  gasto?: {
    id: number;
    fecha: Date;
    categoria: string;
    concepto: string;
    importe: number;
    recurrente: boolean;
    notas: string;
  };
}) {
  const sufijo = gasto ? String(gasto.id) : "nuevo";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="etiqueta" htmlFor={`gfecha-${sufijo}`}>
            Fecha
          </label>
          <input
            id={`gfecha-${sufijo}`}
            type="date"
            name="fecha"
            defaultValue={valorInputFecha(gasto?.fecha ?? new Date())}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`gcategoria-${sufijo}`}>
            Categoría
          </label>
          <select
            id={`gcategoria-${sufijo}`}
            name="categoria"
            defaultValue={gasto?.categoria ?? "otros"}
            className="campo"
          >
            {CATEGORIAS_GASTO.map((categoria) => (
              <option key={categoria} value={categoria}>
                {ETIQUETA_CATEGORIA_GASTO[categoria]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor={`gconcepto-${sufijo}`}>
            Concepto
          </label>
          <input
            id={`gconcepto-${sufijo}`}
            name="concepto"
            required
            defaultValue={gasto?.concepto}
            className="campo"
            placeholder="Plan Shopify Basic"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="etiqueta" htmlFor={`gimporte-${sufijo}`}>
            Importe
          </label>
          <input
            id={`gimporte-${sufijo}`}
            name="importe"
            inputMode="decimal"
            defaultValue={gasto?.importe ?? 0}
            className="campo"
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="recurrente"
            defaultChecked={gasto?.recurrente}
          />
          Gasto recurrente
        </label>
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor={`gnotas-${sufijo}`}>
            Notas
          </label>
          <input
            id={`gnotas-${sufijo}`}
            name="notas"
            defaultValue={gasto?.notas}
            className="campo"
          />
        </div>
      </div>
    </>
  );
}
