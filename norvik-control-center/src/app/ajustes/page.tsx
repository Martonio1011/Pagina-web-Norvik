import { guardarAjustes } from "@/actions/finanzas";
import { TituloPagina } from "@/components/ui";
import { prisma } from "@/lib/db";
import { ETIQUETA_TABLA, TABLAS } from "@/lib/exportar";

export const dynamic = "force-dynamic";

export default async function PaginaAjustes() {
  const ajustes = await prisma.ajustes.findUnique({ where: { id: 1 } });

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
          Todo está en el archivo SQLite{" "}
          <code className="rounded bg-[var(--color-lienzo)] px-1.5 py-0.5 text-xs">
            prisma/dev.db
          </code>{" "}
          dentro de esta carpeta. No sale nada a internet. Para respaldarlo basta
          con copiar ese archivo o descargar el JSON de arriba.
        </p>
      </section>
    </div>
  );
}
