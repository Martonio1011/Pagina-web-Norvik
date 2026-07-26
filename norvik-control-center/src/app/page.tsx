import Link from "next/link";
import { cambiarEstadoTarea } from "@/actions/tareas";
import { Barra, COLOR_SEMAFORO, FONDO_SEMAFORO, Vacio } from "@/components/ui";
import {
  ETIQUETA_AREA,
  ETIQUETA_PRIORIDAD,
  parsearPasos,
  type Area,
} from "@/lib/dominio";
import { fechaCorta } from "@/lib/formato";
import { cargarPanel } from "@/lib/resumen";

export const dynamic = "force-dynamic";

export default async function PaginaPanel() {
  const panel = await cargarPanel();
  const siguiente = panel.siguiente;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Panel de control</h1>
        <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
          Todo lo que hay que saber de Norvik en una pantalla.
        </p>
      </div>

      <section className="tarjeta">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--color-tinta-suave)]">
              Progreso de la tienda
            </p>
            <p className="text-3xl font-semibold tabular-nums">
              {Math.round(panel.progresoGlobal)} %
            </p>
          </div>
          <p className="text-sm text-[var(--color-tinta-suave)]">
            {panel.hechas} de {panel.tareas.length} tareas hechas
          </p>
        </div>
        <div className="mt-3">
          <Barra porcentaje={panel.progresoGlobal} />
        </div>
      </section>

      {siguiente ? (
        <section className="tarjeta border-[var(--color-marca)] bg-[var(--color-marca-suave)]/40">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-marca)] uppercase">
            ¿Qué hago ahora?
          </p>
          <h2 className="mt-2 text-lg font-semibold">{siguiente.titulo}</h2>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            {ETIQUETA_PRIORIDAD[siguiente.prioridad]} ·{" "}
            {ETIQUETA_AREA[siguiente.area as Area] ?? siguiente.area}
          </p>
          {siguiente.descripcion && (
            <p className="mt-3 text-sm">{siguiente.descripcion}</p>
          )}

          <ol className="mt-4 space-y-2">
            {parsearPasos(siguiente.pasos).map((paso, indice) => (
              <li key={indice} className="flex gap-3 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-marca)] text-[11px] font-semibold text-white">
                  {indice + 1}
                </span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            {siguiente.estado !== "en_curso" && (
              <form action={cambiarEstadoTarea}>
                <input type="hidden" name="id" value={siguiente.id} />
                <input type="hidden" name="estado" value="en_curso" />
                <button type="submit" className="boton-suave">
                  Empezar
                </button>
              </form>
            )}
            <form action={cambiarEstadoTarea}>
              <input type="hidden" name="id" value={siguiente.id} />
              <input type="hidden" name="estado" value="hecha" />
              <button type="submit" className="boton">
                Marcar como hecha
              </button>
            </form>
            <Link href="/checklist" className="boton-suave">
              Ver el checklist
            </Link>
          </div>
        </section>
      ) : (
        <section className="tarjeta">
          <p className="text-sm">
            No queda ninguna tarea pendiente en el checklist. Añade nuevas desde{" "}
            <Link href="/checklist" className="underline">
              Checklist
            </Link>
            .
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Semáforo por área</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {panel.areas.map((area) => (
            <Link
              key={area.area}
              href={`/checklist?area=${area.area}`}
              className="tarjeta transition hover:border-[var(--color-marca)]"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: COLOR_SEMAFORO[area.semaforo] }}
                />
                <p className="text-sm font-medium">{ETIQUETA_AREA[area.area]}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {Math.round(area.porcentaje)} %
              </p>
              <p className="mb-2 text-xs text-[var(--color-tinta-suave)]">
                {area.hechas}/{area.total} tareas
              </p>
              <Barra
                porcentaje={area.porcentaje}
                color={COLOR_SEMAFORO[area.semaforo]}
              />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="tarjeta">
          <h2 className="mb-3 text-sm font-semibold">Alertas</h2>
          {panel.alertas.length === 0 ? (
            <Vacio>Sin alertas. Todo en orden.</Vacio>
          ) : (
            <ul className="space-y-2">
              {panel.alertas.map((alerta) => (
                <li key={alerta.texto}>
                  <Link
                    href={alerta.enlace}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      alerta.gravedad === "alta"
                        ? "bg-red-50 text-red-800"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    <span aria-hidden>
                      {alerta.gravedad === "alta" ? "●" : "○"}
                    </span>
                    {alerta.texto}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta">
          <h2 className="mb-3 text-sm font-semibold">Tareas de hoy</h2>
          {panel.paraHoy.length === 0 ? (
            <Vacio>
              Ninguna tarea con fecha límite para hoy. Sigue por la que marca
              «¿Qué hago ahora?».
            </Vacio>
          ) : (
            <ul className="space-y-2">
              {panel.paraHoy.map((tarea) => (
                <li
                  key={tarea.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-borde)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{tarea.titulo}</p>
                    <p className="text-xs text-[var(--color-tinta-suave)]">
                      Límite: {fechaCorta(tarea.fechaLimite)}
                    </p>
                  </div>
                  <form action={cambiarEstadoTarea}>
                    <input type="hidden" name="id" value={tarea.id} />
                    <input type="hidden" name="estado" value="hecha" />
                    <button type="submit" className="boton-suave">
                      Hecha
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-5 mb-2 text-sm font-semibold">Rutina diaria</h3>
          <ul className="space-y-1.5">
            {panel.diarias.map((tarea) => (
              <li key={tarea.id} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${
                    tarea.hecha ? "bg-green-600" : "bg-[var(--color-borde)]"
                  }`}
                />
                <span
                  className={
                    tarea.hecha
                      ? "text-[var(--color-tinta-suave)] line-through"
                      : ""
                  }
                >
                  {tarea.titulo}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/pedidos"
            className="mt-3 inline-block text-xs underline underline-offset-2"
          >
            Ir al checklist diario
          </Link>
        </section>
      </div>

      <section className="tarjeta">
        <h2 className="mb-3 text-sm font-semibold">
          Siguientes tareas por prioridad
        </h2>
        {panel.pendientes.length === 0 ? (
          <Vacio>No queda nada pendiente.</Vacio>
        ) : (
          <ul className="divide-y divide-[var(--color-borde)]">
            {panel.pendientes.slice(0, 6).map((tarea) => (
              <li
                key={tarea.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{tarea.titulo}</p>
                  <p className="text-xs text-[var(--color-tinta-suave)]">
                    {ETIQUETA_AREA[tarea.area as Area] ?? tarea.area}
                  </p>
                </div>
                <span
                  className={`insignia ${
                    FONDO_SEMAFORO[
                      tarea.prioridad === 1
                        ? "rojo"
                        : tarea.prioridad === 2
                          ? "amarillo"
                          : "verde"
                    ]
                  }`}
                >
                  P{tarea.prioridad}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
