import {
  actualizarCampana,
  alternarCodigo,
  borrarCampana,
  borrarCodigo,
  borrarContenido,
  cambiarEstadoContenido,
  crearCampana,
  crearCodigo,
  crearContenido,
} from "@/actions/marketing";
import { Metrica, TituloPagina, Vacio } from "@/components/ui";
import { prisma } from "@/lib/db";
import {
  ESTADOS_CONTENIDO,
  ETIQUETA_ESTADO_CONTENIDO,
  PLATAFORMAS_ADS,
  PLATAFORMAS_CONTENIDO,
  roas,
} from "@/lib/dominio";
import { decimal, dinero, fechaCorta, valorInputFecha } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function PaginaMarketing() {
  const [contenidos, campanas, codigos, ajustes] = await Promise.all([
    prisma.contenidoSocial.findMany({ orderBy: { fecha: "asc" } }),
    prisma.campana.findMany({ orderBy: { fechaInicio: "desc" } }),
    prisma.codigoDescuento.findMany({ orderBy: { creadoEn: "desc" } }),
    prisma.ajustes.findUnique({ where: { id: 1 } }),
  ]);
  const moneda = ajustes?.moneda ?? "EUR";

  const gastoTotal = campanas.reduce((suma, c) => suma + c.gasto, 0);
  const ventasTotal = campanas.reduce((suma, c) => suma + c.ventas, 0);
  const roasGlobal = roas(ventasTotal, gastoTotal);
  const publicados = contenidos.filter((c) => c.estado === "publicado").length;

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Marketing"
        descripcion="Calendario de contenidos, campañas de publicidad y códigos de descuento."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Metrica
          etiqueta="Contenidos planificados"
          valor={String(contenidos.length)}
          detalle={`${publicados} publicados`}
        />
        <Metrica etiqueta="Gasto en ads" valor={dinero(gastoTotal, moneda)} />
        <Metrica etiqueta="Ventas de ads" valor={dinero(ventasTotal, moneda)} />
        <Metrica
          etiqueta="ROAS global"
          valor={decimal(roasGlobal)}
          detalle={
            roasGlobal !== null && roasGlobal < 1
              ? "Estás perdiendo dinero"
              : undefined
          }
        />
      </div>

      <section className="tarjeta">
        <h2 className="text-sm font-semibold">Calendario de contenidos</h2>
        {contenidos.length === 0 ? (
          <div className="mt-3">
            <Vacio>Todavía no hay contenidos planificados.</Vacio>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-borde)]">
            {contenidos.map((contenido) => (
              <li
                key={contenido.id}
                className="flex flex-wrap items-center gap-3 py-2.5"
              >
                <span className="w-24 shrink-0 text-xs text-[var(--color-tinta-suave)] tabular-nums">
                  {fechaCorta(contenido.fecha)}
                </span>
                <span className="insignia bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]">
                  {contenido.plataforma}
                </span>
                <span className="min-w-0 flex-1 text-sm">{contenido.idea}</span>
                <form
                  action={cambiarEstadoContenido}
                  className="flex items-center gap-1"
                >
                  <input type="hidden" name="id" value={contenido.id} />
                  <select
                    name="estado"
                    defaultValue={contenido.estado}
                    className="campo w-auto py-1 text-xs"
                    aria-label="Estado del contenido"
                  >
                    {ESTADOS_CONTENIDO.map((estado) => (
                      <option key={estado} value={estado}>
                        {ETIQUETA_ESTADO_CONTENIDO[estado]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="boton-suave px-2 py-1 text-xs">
                    Guardar
                  </button>
                </form>
                <form action={borrarContenido}>
                  <input type="hidden" name="id" value={contenido.id} />
                  <button
                    type="submit"
                    className="text-xs text-[var(--color-tinta-suave)] hover:text-red-700"
                    aria-label="Borrar contenido"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={crearContenido} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="etiqueta" htmlFor="contenido-fecha">
              Fecha
            </label>
            <input
              id="contenido-fecha"
              type="date"
              name="fecha"
              defaultValue={valorInputFecha(new Date())}
              className="campo"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="contenido-plataforma">
              Plataforma
            </label>
            <select
              id="contenido-plataforma"
              name="plataforma"
              className="campo"
            >
              {PLATAFORMAS_CONTENIDO.map((plataforma) => (
                <option key={plataforma} value={plataforma}>
                  {plataforma}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="contenido-idea">
              Idea
            </label>
            <div className="flex gap-2">
              <input
                id="contenido-idea"
                name="idea"
                required
                className="campo"
                placeholder="Reel: 3 formas de llevar el vestido midi"
              />
              <button type="submit" className="boton shrink-0">
                Añadir
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="tarjeta">
        <h2 className="text-sm font-semibold">Campañas de publicidad</h2>
        {campanas.length === 0 ? (
          <div className="mt-3">
            <Vacio>Todavía no hay campañas registradas.</Vacio>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {campanas.map((campana) => {
              const r = roas(campana.ventas, campana.gasto);
              return (
                <div
                  key={campana.id}
                  className="rounded-xl border border-[var(--color-borde)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{campana.nombre}</p>
                      <p className="text-xs text-[var(--color-tinta-suave)]">
                        {campana.plataforma} ·{" "}
                        {dinero(campana.presupuestoDia, moneda)}/día · desde{" "}
                        {fechaCorta(campana.fechaInicio)}
                      </p>
                    </div>
                    <span
                      className={`insignia ${
                        r === null
                          ? "bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]"
                          : r >= 1.5
                            ? "bg-green-50 text-green-800"
                            : r >= 1
                              ? "bg-amber-50 text-amber-800"
                              : "bg-red-50 text-red-800"
                      }`}
                    >
                      ROAS {decimal(r)}
                    </span>
                  </div>

                  <form
                    action={actualizarCampana}
                    className="mt-3 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="id" value={campana.id} />
                    <div className="w-28">
                      <label
                        className="etiqueta"
                        htmlFor={`gasto-${campana.id}`}
                      >
                        Gasto
                      </label>
                      <input
                        id={`gasto-${campana.id}`}
                        name="gasto"
                        inputMode="decimal"
                        defaultValue={campana.gasto}
                        className="campo"
                      />
                    </div>
                    <div className="w-28">
                      <label
                        className="etiqueta"
                        htmlFor={`ventas-${campana.id}`}
                      >
                        Ventas
                      </label>
                      <input
                        id={`ventas-${campana.id}`}
                        name="ventas"
                        inputMode="decimal"
                        defaultValue={campana.ventas}
                        className="campo"
                      />
                    </div>
                    <div className="w-32">
                      <label
                        className="etiqueta"
                        htmlFor={`estado-${campana.id}`}
                      >
                        Estado
                      </label>
                      <select
                        id={`estado-${campana.id}`}
                        name="estado"
                        defaultValue={campana.estado}
                        className="campo"
                      >
                        <option value="activa">Activa</option>
                        <option value="pausada">Pausada</option>
                        <option value="finalizada">Finalizada</option>
                      </select>
                    </div>
                    <button type="submit" className="boton-suave">
                      Guardar
                    </button>
                    <button
                      type="submit"
                      formAction={borrarCampana}
                      className="boton-suave text-red-700"
                    >
                      Borrar
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs underline underline-offset-2">
            Añadir una campaña
          </summary>
          <form action={crearCampana} className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="etiqueta" htmlFor="campana-nombre">
                Nombre
              </label>
              <input
                id="campana-nombre"
                name="nombre"
                required
                className="campo"
                placeholder="Meta · Prueba vestidos verano"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="campana-plataforma">
                Plataforma
              </label>
              <select
                id="campana-plataforma"
                name="plataforma"
                className="campo"
              >
                {PLATAFORMAS_ADS.map((plataforma) => (
                  <option key={plataforma} value={plataforma}>
                    {plataforma}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta" htmlFor="campana-presupuesto">
                Presupuesto/día
              </label>
              <input
                id="campana-presupuesto"
                name="presupuestoDia"
                inputMode="decimal"
                defaultValue={15}
                className="campo"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="campana-inicio">
                Fecha de inicio
              </label>
              <input
                id="campana-inicio"
                type="date"
                name="fechaInicio"
                defaultValue={valorInputFecha(new Date())}
                className="campo"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="campana-fin">
                Fecha de fin
              </label>
              <input
                id="campana-fin"
                type="date"
                name="fechaFin"
                className="campo"
              />
            </div>
            <div className="sm:col-span-3">
              <button type="submit" className="boton">
                Añadir campaña
              </button>
            </div>
          </form>
        </details>
      </section>

      <section className="tarjeta">
        <h2 className="text-sm font-semibold">Códigos de descuento</h2>
        {codigos.length === 0 ? (
          <div className="mt-3">
            <Vacio>
              Todavía no hay códigos. Empieza por NORVIK10, que es el que usan el
              pop-up y los emails.
            </Vacio>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-borde)]">
            {codigos.map((codigo) => (
              <li
                key={codigo.id}
                className="flex flex-wrap items-center gap-3 py-2.5"
              >
                <span className="font-mono text-sm font-semibold">
                  {codigo.codigo}
                </span>
                <span className="text-xs text-[var(--color-tinta-suave)]">
                  {codigo.tipo === "porcentaje"
                    ? `${codigo.valor} %`
                    : codigo.tipo === "fijo"
                      ? dinero(codigo.valor, moneda)
                      : "Envío gratis"}
                  {codigo.fechaFin && ` · hasta ${fechaCorta(codigo.fechaFin)}`}
                </span>
                <span className="min-w-0 flex-1 text-xs text-[var(--color-tinta-suave)]">
                  {codigo.descripcion}
                </span>
                <span
                  className={`insignia ${
                    codigo.activo
                      ? "bg-green-50 text-green-800"
                      : "bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]"
                  }`}
                >
                  {codigo.activo ? "Activo" : "Inactivo"}
                </span>
                <form action={alternarCodigo}>
                  <input type="hidden" name="id" value={codigo.id} />
                  <input
                    type="hidden"
                    name="activo"
                    value={codigo.activo ? "0" : "1"}
                  />
                  <button type="submit" className="boton-suave px-2 py-1 text-xs">
                    {codigo.activo ? "Desactivar" : "Activar"}
                  </button>
                </form>
                <form action={borrarCodigo}>
                  <input type="hidden" name="id" value={codigo.id} />
                  <button
                    type="submit"
                    className="text-xs text-[var(--color-tinta-suave)] hover:text-red-700"
                    aria-label="Borrar código"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={crearCodigo} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="etiqueta" htmlFor="codigo-codigo">
              Código
            </label>
            <input
              id="codigo-codigo"
              name="codigo"
              required
              className="campo font-mono uppercase"
              placeholder="NORVIK10"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="codigo-tipo">
              Tipo
            </label>
            <select id="codigo-tipo" name="tipo" className="campo">
              <option value="porcentaje">Porcentaje</option>
              <option value="fijo">Importe fijo</option>
              <option value="envio_gratis">Envío gratis</option>
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="codigo-valor">
              Valor
            </label>
            <input
              id="codigo-valor"
              name="valor"
              inputMode="decimal"
              defaultValue={10}
              className="campo"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="codigo-fin">
              Vence el
            </label>
            <input
              id="codigo-fin"
              type="date"
              name="fechaFin"
              className="campo"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="etiqueta" htmlFor="codigo-descripcion">
              Dónde se usa
            </label>
            <input
              id="codigo-descripcion"
              name="descripcion"
              className="campo"
              placeholder="Pop-up de bienvenida y carrito abandonado"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="boton w-full">
              Añadir código
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
