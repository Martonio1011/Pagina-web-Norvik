import {
  actualizarProducto,
  borrarProducto,
  crearProducto,
} from "@/actions/catalogo";
import { BotonImportarProductos } from "@/components/boton-importar-productos";
import { CalculadoraPrecios } from "@/components/calculadora-precios";
import { TituloPagina, Vacio } from "@/components/ui";
import { asegurarDatosIniciales } from "@/lib/datos-iniciales";
import { prisma } from "@/lib/db";
import { margen, precioSugerido } from "@/lib/dominio";
import { dinero, porcentaje } from "@/lib/formato";
import { PRODUCTOS_SHOPIFY } from "@/lib/sincronizacion";

export const dynamic = "force-dynamic";

function avisosDe(producto: {
  estado: string;
  stock: number;
  precioVenta: number;
  costeTrendsi: number;
  costeEnvio: number;
  tieneGuiaTallas: boolean;
  tieneResenas: boolean;
}) {
  const avisos: string[] = [];
  if (producto.estado === "activo" && producto.stock <= 0)
    avisos.push("Stock 0");
  if (producto.precioVenta <= 0 || producto.costeTrendsi <= 0)
    avisos.push("Faltan datos");
  else {
    const m = margen(
      producto.precioVenta,
      producto.costeTrendsi + producto.costeEnvio,
    );
    if (m !== null && m < 50) avisos.push("Margen < 50 %");
  }
  if (!producto.tieneGuiaTallas) avisos.push("Sin guía de tallas");
  if (!producto.tieneResenas) avisos.push("Sin reseñas");
  return avisos;
}

export default async function PaginaCatalogo() {
  await asegurarDatosIniciales();
  const [productos, ajustes] = await Promise.all([
    prisma.producto.findMany({ orderBy: { nombre: "asc" } }),
    prisma.ajustes.findUnique({ where: { id: 1 } }),
  ]);
  const moneda = ajustes?.moneda ?? "EUR";
  const margenObjetivo = ajustes?.margenObjetivo ?? 65;

  const nombresExistentes = new Set(productos.map((p) => p.nombre));
  const productosPendientes = PRODUCTOS_SHOPIFY.filter(
    (p) => !nombresExistentes.has(p.nombre),
  ).length;

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Catálogo"
        descripcion="Costes, precios y márgenes de cada producto, con los avisos que hay que corregir."
      />

      <BotonImportarProductos pendientes={productosPendientes} />

      <CalculadoraPrecios margenObjetivo={margenObjetivo} moneda={moneda} />

      <section className="tarjeta overflow-x-auto p-0">
        {productos.length === 0 ? (
          <div className="p-5">
            <Vacio>Todavía no hay productos. Añade el primero abajo.</Vacio>
          </div>
        ) : (
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-[var(--color-borde)] text-left text-xs text-[var(--color-tinta-suave)]">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-3 py-3 text-right font-medium">Coste</th>
                <th className="px-3 py-3 text-right font-medium">Precio</th>
                <th className="px-3 py-3 text-right font-medium">Margen</th>
                <th className="px-3 py-3 text-right font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Enlaces</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borde)]">
              {productos.map((producto) => {
                const costeTotal = producto.costeTrendsi + producto.costeEnvio;
                const m = margen(producto.precioVenta, costeTotal);
                const avisos = avisosDe(producto);
                return (
                  <tr key={producto.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{producto.nombre}</p>
                      {avisos.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {avisos.map((aviso) => (
                            <span
                              key={aviso}
                              className={`insignia ${
                                aviso === "Stock 0" || aviso === "Margen < 50 %"
                                  ? "bg-red-50 text-red-800"
                                  : "bg-amber-50 text-amber-800"
                              }`}
                            >
                              {aviso}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {costeTotal > 0 ? dinero(costeTotal, moneda) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {producto.precioVenta > 0
                        ? dinero(producto.precioVenta, moneda)
                        : "—"}
                      {costeTotal > 0 && (
                        <p className="text-xs text-[var(--color-tinta-suave)]">
                          sug. {dinero(precioSugerido(costeTotal, margenObjetivo), moneda)}
                        </p>
                      )}
                    </td>
                    <td
                      className={`px-3 py-3 text-right tabular-nums ${
                        m !== null && m < 50 ? "text-red-700" : ""
                      }`}
                    >
                      {porcentaje(m, 1)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right tabular-nums ${
                        producto.stock <= 0 ? "text-red-700" : ""
                      }`}
                    >
                      {producto.stock}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`insignia ${
                          producto.estado === "activo"
                            ? "bg-green-50 text-green-800"
                            : "bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]"
                        }`}
                      >
                        {producto.estado === "activo" ? "Activo" : "Borrador"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs">
                        {producto.urlTrendsi && (
                          <a
                            href={producto.urlTrendsi}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            Trendsi
                          </a>
                        )}
                        {producto.urlShopify && (
                          <a
                            href={producto.urlShopify}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            Shopify
                          </a>
                        )}
                        {!producto.urlTrendsi && !producto.urlShopify && (
                          <span className="text-[var(--color-tinta-suave)]">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Editar productos</h2>
        {productos.map((producto) => (
          <details key={producto.id} className="tarjeta">
            <summary className="cursor-pointer text-sm">
              {producto.nombre}
            </summary>
            <form action={actualizarProducto} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={producto.id} />
              <CamposProducto producto={producto} />
              <div className="flex gap-2">
                <button type="submit" className="boton">
                  Guardar
                </button>
                <button
                  type="submit"
                  formAction={borrarProducto}
                  className="boton-suave text-red-700"
                >
                  Borrar
                </button>
              </div>
            </form>
          </details>
        ))}
      </section>

      <details className="tarjeta">
        <summary className="cursor-pointer text-sm font-medium">
          Añadir un producto
        </summary>
        <form action={crearProducto} className="mt-4 grid gap-3">
          <CamposProducto />
          <div>
            <button type="submit" className="boton">
              Añadir producto
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

function CamposProducto({
  producto,
}: {
  producto?: {
    id: number;
    nombre: string;
    costeTrendsi: number;
    costeEnvio: number;
    precioVenta: number;
    stock: number;
    estado: string;
    urlTrendsi: string;
    urlShopify: string;
    tieneGuiaTallas: boolean;
    tieneResenas: boolean;
    notas: string;
  };
}) {
  const sufijo = producto ? String(producto.id) : "nuevo";
  return (
    <>
      <div>
        <label className="etiqueta" htmlFor={`nombre-${sufijo}`}>
          Nombre
        </label>
        <input
          id={`nombre-${sufijo}`}
          name="nombre"
          required
          defaultValue={producto?.nombre}
          className="campo"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="etiqueta" htmlFor={`coste-${sufijo}`}>
            Coste Trendsi
          </label>
          <input
            id={`coste-${sufijo}`}
            name="costeTrendsi"
            inputMode="decimal"
            defaultValue={producto?.costeTrendsi ?? 0}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`envio-${sufijo}`}>
            Coste envío
          </label>
          <input
            id={`envio-${sufijo}`}
            name="costeEnvio"
            inputMode="decimal"
            defaultValue={producto?.costeEnvio ?? 0}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`precio-${sufijo}`}>
            Precio de venta
          </label>
          <input
            id={`precio-${sufijo}`}
            name="precioVenta"
            inputMode="decimal"
            defaultValue={producto?.precioVenta ?? 0}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`stock-${sufijo}`}>
            Stock
          </label>
          <input
            id={`stock-${sufijo}`}
            name="stock"
            inputMode="numeric"
            defaultValue={producto?.stock ?? 0}
            className="campo"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor={`estado-${sufijo}`}>
            Estado
          </label>
          <select
            id={`estado-${sufijo}`}
            name="estado"
            defaultValue={producto?.estado ?? "activo"}
            className="campo"
          >
            <option value="activo">Activo</option>
            <option value="borrador">Borrador</option>
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor={`trendsi-${sufijo}`}>
            Enlace a Trendsi
          </label>
          <input
            id={`trendsi-${sufijo}`}
            name="urlTrendsi"
            type="url"
            defaultValue={producto?.urlTrendsi}
            className="campo"
            placeholder="https://"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`shopify-${sufijo}`}>
            Enlace a Shopify admin
          </label>
          <input
            id={`shopify-${sufijo}`}
            name="urlShopify"
            type="url"
            defaultValue={producto?.urlShopify}
            className="campo"
            placeholder="https://"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="tieneGuiaTallas"
            defaultChecked={producto?.tieneGuiaTallas}
          />
          Tiene guía de tallas
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="tieneResenas"
            defaultChecked={producto?.tieneResenas}
          />
          Tiene reseñas
        </label>
      </div>
      <div>
        <label className="etiqueta" htmlFor={`notas-${sufijo}`}>
          Notas
        </label>
        <textarea
          id={`notas-${sufijo}`}
          name="notas"
          rows={2}
          defaultValue={producto?.notas}
          className="campo"
        />
      </div>
    </>
  );
}
