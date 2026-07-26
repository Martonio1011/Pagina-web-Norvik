import path from "node:path";
import { guardarAjustes } from "@/actions/finanzas";
import { TituloPagina } from "@/components/ui";
import { asegurarDatosIniciales } from "@/lib/datos-iniciales";
import { prisma } from "@/lib/db";
import { ETIQUETA_TABLA, TABLAS } from "@/lib/exportar";
import { VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

/** Datos de apoyo por si algún día la app no muestra lo que esperas. */
async function cargarDiagnostico() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const relativa = url.replace(/^file:/, "");
  const [tareas, tareasDiarias, productos, pedidos, gastos] = await Promise.all([
    prisma.tarea.count(),
    prisma.tareaDiaria.count(),
    prisma.producto.count(),
    prisma.pedido.count(),
    prisma.gasto.count(),
  ]);
  return {
    ruta: path.resolve(process.cwd(), relativa),
    conteos: [
      ["Tareas del checklist", tareas],
      ["Tareas de la rutina diaria", tareasDiarias],
      ["Productos", productos],
      ["Pedidos", pedidos],
      ["Gastos", gastos],
    ] as const,
  };
}

export default async function PaginaAjustes() {
  await asegurarDatosIniciales();
  const [ajustes, diagnostico] = await Promise.all([
    prisma.ajustes.findUnique({ where: { id: 1 } }),
    cargarDiagnostico(),
  ]);

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Ajustes y copias de seguridad"
        descripcion="Moneda, margen objetivo y exportación de todos los datos."
      />

      <section className="tarjeta">
        <h2 className="text-sm font-semibold">Ajustes de la tienda</h2>
        <form action={guardarAjustes} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="etiqueta" htmlFor="moneda">
              Moneda
            </label>
            <select
              id="moneda"
              name="moneda"
              defaultValue={ajustes?.moneda ?? "EUR"}
              className="campo"
            >
              <option value="EUR">EUR · euro</option>
              <option value="USD">USD · dólar</option>
              <option value="GBP">GBP · libra</option>
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="margenObjetivo">
              Margen objetivo (%)
            </label>
            <input
              id="margenObjetivo"
              name="margenObjetivo"
              inputMode="decimal"
              defaultValue={ajustes?.margenObjetivo ?? 65}
              className="campo"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="dominioShopify">
              Dominio de Shopify
            </label>
            <input
              id="dominioShopify"
              name="dominioShopify"
              defaultValue={ajustes?.dominioShopify ?? "norviik.myshopify.com"}
              className="campo"
            />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="boton">
              Guardar ajustes
            </button>
          </div>
        </form>
      </section>

      <section className="tarjeta">
        <h2 className="text-sm font-semibold">Exportar</h2>
        <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
          El JSON es la copia de seguridad completa. Los CSV sirven para abrir
          cada tabla en Excel o Google Sheets.
        </p>

        <div className="mt-4">
          <a href="/api/exportar?formato=json" className="boton" download>
            Descargar copia completa (JSON)
          </a>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TABLAS.map((tabla) => (
            <a
              key={tabla}
              href={`/api/exportar?formato=csv&tabla=${tabla}`}
              className="boton-suave"
              download
            >
              {ETIQUETA_TABLA[tabla]} (CSV)
            </a>
          ))}
        </div>
      </section>

      <section className="tarjeta">
        <h2 className="text-sm font-semibold">Dónde viven tus datos</h2>
        <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">
          Todo está en un único archivo SQLite dentro de esta carpeta. No sale
          nada a internet. Para respaldarlo basta con copiar ese archivo o
          descargar el JSON de arriba.
        </p>

        <dl className="mt-4 space-y-2 text-xs">
          <div>
            <dt className="text-[var(--color-tinta-suave)]">
              Archivo de la base de datos
            </dt>
            <dd className="mt-0.5 font-mono break-all">{diagnostico.ruta}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-tinta-suave)]">Versión de la app</dt>
            <dd className="mt-0.5 font-mono">{VERSION}</dd>
          </div>
        </dl>

        <table className="mt-4 w-full text-xs">
          <tbody className="divide-y divide-[var(--color-borde)]">
            {diagnostico.conteos.map(([nombre, total]) => (
              <tr key={nombre}>
                <td className="py-1.5 text-[var(--color-tinta-suave)]">
                  {nombre}
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums">
                  {total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
