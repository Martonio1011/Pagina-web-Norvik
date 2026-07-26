import {
  actualizarPedido,
  avanzarPedido,
  borrarPedido,
  crearPedido,
} from "@/actions/pedidos";
import {
  alternarTareaDiaria,
  borrarTareaDiaria,
  crearTareaDiaria,
} from "@/actions/tareas";
import { Metrica, TituloPagina, Vacio } from "@/components/ui";
import { prisma } from "@/lib/db";
import {
  claveDia,
  ESTADOS_PEDIDO,
  ETIQUETA_ESTADO_PEDIDO,
  type EstadoPedido,
} from "@/lib/dominio";
import { dinero, fechaCorta, valorInputFecha } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function PaginaPedidos(props: {
  searchParams: Promise<{ duplicado?: string }>;
}) {
  const { duplicado } = await props.searchParams;
  const hoy = claveDia();
  const [pedidos, ajustes, diarias, registros] = await Promise.all([
    prisma.pedido.findMany({ orderBy: { fecha: "desc" } }),
    prisma.ajustes.findUnique({ where: { id: 1 } }),
    prisma.tareaDiaria.findMany({
      where: { activa: true },
      orderBy: { orden: "asc" },
    }),
    prisma.registroDiario.findMany({ where: { dia: hoy } }),
  ]);

  const moneda = ajustes?.moneda ?? "EUR";
  const hechasHoy = new Set(
    registros.filter((r) => r.hecha).map((r) => r.tareaDiariaId),
  );

  const ingresos = pedidos.reduce((suma, p) => suma + p.ingreso, 0);
  const costes = pedidos.reduce((suma, p) => suma + p.costeReal, 0);
  const enCurso = pedidos.filter((p) => p.estadoFlujo !== "entregado").length;

  const siguienteEstado = (estado: string): EstadoPedido | null => {
    const indice = ESTADOS_PEDIDO.indexOf(estado as EstadoPedido);
    return indice >= 0 && indice < ESTADOS_PEDIDO.length - 1
      ? ESTADOS_PEDIDO[indice + 1]
      : null;
  };

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Pedidos y operaciones"
        descripcion="Cada pedido desde que se paga hasta que llega al cliente, más la rutina diaria."
      />

      {duplicado && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          Ya tienes registrado el pedido <strong>{duplicado}</strong>. Edita el
          que ya existe en lugar de crearlo otra vez.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Metrica etiqueta="Pedidos" valor={String(pedidos.length)} />
        <Metrica etiqueta="En curso" valor={String(enCurso)} />
        <Metrica etiqueta="Ingresos" valor={dinero(ingresos, moneda)} />
        <Metrica
          etiqueta="Beneficio"
          valor={dinero(ingresos - costes, moneda)}
          detalle={`Costes: ${dinero(costes, moneda)}`}
        />
      </div>

      <section className="tarjeta">
        <h2 className="text-sm font-semibold">
          Checklist diario · {fechaCorta(new Date())}
        </h2>
        <ul className="mt-3 space-y-1">
          {diarias.map((tarea) => {
            const hecha = hechasHoy.has(tarea.id);
            return (
              <li key={tarea.id} className="flex items-start gap-3">
                <form action={alternarTareaDiaria} className="pt-0.5">
                  <input type="hidden" name="tareaDiariaId" value={tarea.id} />
                  <input type="hidden" name="dia" value={hoy} />
                  <input type="hidden" name="hecha" value={hecha ? "0" : "1"} />
                  <button
                    type="submit"
                    aria-label={hecha ? "Desmarcar" : "Marcar como hecha"}
                    className={`flex size-5 items-center justify-center rounded border text-[11px] ${
                      hecha
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-[var(--color-borde)] bg-white"
                    }`}
                  >
                    {hecha ? "✓" : ""}
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      hecha
                        ? "text-[var(--color-tinta-suave)] line-through"
                        : ""
                    }`}
                  >
                    {tarea.titulo}
                  </p>
                  {tarea.detalle && (
                    <p className="text-xs text-[var(--color-tinta-suave)]">
                      {tarea.detalle}
                    </p>
                  )}
                </div>
                <form action={borrarTareaDiaria}>
                  <input type="hidden" name="id" value={tarea.id} />
                  <button
                    type="submit"
                    className="text-xs text-[var(--color-tinta-suave)] hover:text-red-700"
                    aria-label="Quitar de la rutina"
                  >
                    ✕
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        <form
          action={crearTareaDiaria}
          className="mt-4 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-[12rem] flex-1">
            <label className="etiqueta" htmlFor="diaria-titulo">
              Añadir a la rutina
            </label>
            <input
              id="diaria-titulo"
              name="titulo"
              required
              className="campo"
              placeholder="Revisar reseñas nuevas"
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="etiqueta" htmlFor="diaria-detalle">
              Detalle
            </label>
            <input id="diaria-detalle" name="detalle" className="campo" />
          </div>
          <button type="submit" className="boton-suave">
            Añadir
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Pedidos registrados</h2>
        {pedidos.length === 0 ? (
          <Vacio>Todavía no hay pedidos. Registra el primero abajo.</Vacio>
        ) : (
          pedidos.map((pedido) => {
            const siguiente = siguienteEstado(pedido.estadoFlujo);
            const beneficio = pedido.ingreso - pedido.costeReal;
            return (
              <details key={pedido.id} className="tarjeta">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {pedido.numeroPedido}
                      {pedido.cliente && ` · ${pedido.cliente}`}
                    </p>
                    <p className="text-xs text-[var(--color-tinta-suave)]">
                      {fechaCorta(pedido.fecha)}
                      {pedido.producto && ` · ${pedido.producto}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="insignia bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]">
                      {ETIQUETA_ESTADO_PEDIDO[
                        pedido.estadoFlujo as EstadoPedido
                      ] ?? pedido.estadoFlujo}
                    </span>
                    <span className="text-sm tabular-nums">
                      {dinero(beneficio, moneda)}
                    </span>
                  </div>
                </summary>

                <ol className="mt-4 flex flex-wrap gap-1 text-xs">
                  {ESTADOS_PEDIDO.map((estado, indice) => {
                    const actual = ESTADOS_PEDIDO.indexOf(
                      pedido.estadoFlujo as EstadoPedido,
                    );
                    return (
                      <li
                        key={estado}
                        className={`insignia ${
                          indice <= actual
                            ? "bg-green-50 text-green-800"
                            : "bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]"
                        }`}
                      >
                        {ETIQUETA_ESTADO_PEDIDO[estado]}
                      </li>
                    );
                  })}
                </ol>

                {siguiente && (
                  <form action={avanzarPedido} className="mt-3">
                    <input type="hidden" name="id" value={pedido.id} />
                    <input type="hidden" name="estadoFlujo" value={siguiente} />
                    <button type="submit" className="boton">
                      Pasar a «{ETIQUETA_ESTADO_PEDIDO[siguiente]}»
                    </button>
                  </form>
                )}

                <form action={actualizarPedido} className="mt-4 grid gap-3">
                  <input type="hidden" name="id" value={pedido.id} />
                  <CamposPedido pedido={pedido} />
                  <div className="flex gap-2">
                    <button type="submit" className="boton">
                      Guardar
                    </button>
                    <button
                      type="submit"
                      formAction={borrarPedido}
                      className="boton-suave text-red-700"
                    >
                      Borrar
                    </button>
                  </div>
                </form>
              </details>
            );
          })
        )}
      </section>

      <details className="tarjeta">
        <summary className="cursor-pointer text-sm font-medium">
          Registrar un pedido
        </summary>
        <form action={crearPedido} className="mt-4 grid gap-3">
          <CamposPedido />
          <div>
            <button type="submit" className="boton">
              Registrar pedido
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

function CamposPedido({
  pedido,
}: {
  pedido?: {
    id: number;
    numeroPedido: string;
    cliente: string;
    producto: string;
    fecha: Date;
    estadoFlujo: string;
    tracking: string;
    ingreso: number;
    costeReal: number;
    notas: string;
  };
}) {
  const sufijo = pedido ? String(pedido.id) : "nuevo";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor={`numero-${sufijo}`}>
            Nº de pedido Shopify
          </label>
          <input
            id={`numero-${sufijo}`}
            name="numeroPedido"
            required
            defaultValue={pedido?.numeroPedido}
            className="campo"
            placeholder="#1001"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`cliente-${sufijo}`}>
            Cliente
          </label>
          <input
            id={`cliente-${sufijo}`}
            name="cliente"
            defaultValue={pedido?.cliente}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`fecha-${sufijo}`}>
            Fecha
          </label>
          <input
            id={`fecha-${sufijo}`}
            type="date"
            name="fecha"
            defaultValue={valorInputFecha(pedido?.fecha ?? new Date())}
            className="campo"
          />
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor={`producto-${sufijo}`}>
          Producto
        </label>
        <input
          id={`producto-${sufijo}`}
          name="producto"
          defaultValue={pedido?.producto}
          className="campo"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="etiqueta" htmlFor={`flujo-${sufijo}`}>
            Estado del flujo
          </label>
          <select
            id={`flujo-${sufijo}`}
            name="estadoFlujo"
            defaultValue={pedido?.estadoFlujo ?? "pagado"}
            className="campo"
          >
            {ESTADOS_PEDIDO.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO_PEDIDO[estado]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor={`tracking-${sufijo}`}>
            Nº de seguimiento
          </label>
          <input
            id={`tracking-${sufijo}`}
            name="tracking"
            defaultValue={pedido?.tracking}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`ingreso-${sufijo}`}>
            Ingreso
          </label>
          <input
            id={`ingreso-${sufijo}`}
            name="ingreso"
            inputMode="decimal"
            defaultValue={pedido?.ingreso ?? 0}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`coste-${sufijo}`}>
            Coste real
          </label>
          <input
            id={`coste-${sufijo}`}
            name="costeReal"
            inputMode="decimal"
            defaultValue={pedido?.costeReal ?? 0}
            className="campo"
          />
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor={`notas-${sufijo}`}>
          Notas
        </label>
        <textarea
          id={`notas-${sufijo}`}
          name="notas"
          rows={2}
          defaultValue={pedido?.notas}
          className="campo"
        />
      </div>
    </>
  );
}
