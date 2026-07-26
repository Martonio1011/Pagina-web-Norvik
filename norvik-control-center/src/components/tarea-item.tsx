import {
  actualizarTarea,
  borrarTarea,
  cambiarEstadoTarea,
  moverTarea,
} from "@/actions/tareas";
import { FONDO_SEMAFORO } from "@/components/ui";
import {
  AREAS,
  ESTADOS_TAREA,
  ETIQUETA_AREA,
  ETIQUETA_ESTADO,
  PRIORIDADES,
  parsearPasos,
  type Area,
} from "@/lib/dominio";
import { fechaCorta, valorInputFecha } from "@/lib/formato";
import type { Tarea } from "@/lib/resumen";

const COLOR_PRIORIDAD: Record<number, string> = {
  1: FONDO_SEMAFORO.rojo,
  2: FONDO_SEMAFORO.amarillo,
  3: "bg-sky-50 text-sky-800",
  4: "bg-slate-100 text-slate-700",
};

export function TareaItem({ tarea }: { tarea: Tarea }) {
  const pasos = parsearPasos(tarea.pasos);
  const vencida =
    tarea.fechaLimite !== null &&
    tarea.estado !== "hecha" &&
    tarea.fechaLimite < new Date();

  return (
    <details className="tarjeta group">
      <summary className="flex cursor-pointer list-none items-start gap-3">
        <span
          aria-hidden
          className={`mt-1 size-3 shrink-0 rounded-full ${
            tarea.estado === "hecha"
              ? "bg-green-600"
              : tarea.estado === "en_curso"
                ? "bg-amber-500"
                : "border-2 border-[var(--color-borde)]"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              tarea.estado === "hecha"
                ? "text-[var(--color-tinta-suave)] line-through"
                : ""
            }`}
          >
            {tarea.titulo}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`insignia ${COLOR_PRIORIDAD[tarea.prioridad]}`}>
              P{tarea.prioridad}
            </span>
            <span className="insignia bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]">
              {ETIQUETA_AREA[tarea.area as Area] ?? tarea.area}
            </span>
            <span className="insignia bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]">
              {ETIQUETA_ESTADO[tarea.estado as keyof typeof ETIQUETA_ESTADO] ??
                tarea.estado}
            </span>
            {tarea.fechaLimite && (
              <span
                className={`insignia ${
                  vencida
                    ? "bg-red-50 text-red-800"
                    : "bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]"
                }`}
              >
                {vencida ? "Vencida: " : "Límite: "}
                {fechaCorta(tarea.fechaLimite)}
              </span>
            )}
            {pasos.length > 0 && (
              <span className="insignia bg-[var(--color-lienzo)] text-[var(--color-tinta-suave)]">
                {pasos.length} pasos
              </span>
            )}
          </div>
        </div>
        <span
          aria-hidden
          className="mt-0.5 text-xs text-[var(--color-tinta-suave)] group-open:rotate-180"
        >
          ▾
        </span>
      </summary>

      <div className="mt-4 border-t border-[var(--color-borde)] pt-4">
        {tarea.descripcion && <p className="text-sm">{tarea.descripcion}</p>}

        {pasos.length > 0 && (
          <ol className="mt-3 space-y-2">
            {pasos.map((paso, indice) => (
              <li key={indice} className="flex gap-3 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-lienzo)] text-[11px] font-semibold">
                  {indice + 1}
                </span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {ESTADOS_TAREA.filter((estado) => estado !== tarea.estado).map(
            (estado) => (
              <form key={estado} action={cambiarEstadoTarea}>
                <input type="hidden" name="id" value={tarea.id} />
                <input type="hidden" name="estado" value={estado} />
                <button
                  type="submit"
                  className={estado === "hecha" ? "boton" : "boton-suave"}
                >
                  {estado === "hecha"
                    ? "Marcar como hecha"
                    : `Pasar a ${ETIQUETA_ESTADO[estado].toLowerCase()}`}
                </button>
              </form>
            ),
          )}
          {(["arriba", "abajo"] as const).map((direccion) => (
            <form key={direccion} action={moverTarea}>
              <input type="hidden" name="id" value={tarea.id} />
              <input type="hidden" name="direccion" value={direccion} />
              <button
                type="submit"
                className="boton-suave"
                aria-label={`Mover ${direccion}`}
              >
                {direccion === "arriba" ? "↑" : "↓"}
              </button>
            </form>
          ))}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-[var(--color-tinta-suave)] underline underline-offset-2">
            Editar esta tarea
          </summary>
          <form action={actualizarTarea} className="mt-3 grid gap-3">
            <input type="hidden" name="id" value={tarea.id} />
            <div>
              <label className="etiqueta" htmlFor={`titulo-${tarea.id}`}>
                Título
              </label>
              <input
                id={`titulo-${tarea.id}`}
                name="titulo"
                defaultValue={tarea.titulo}
                className="campo"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor={`desc-${tarea.id}`}>
                Descripción
              </label>
              <textarea
                id={`desc-${tarea.id}`}
                name="descripcion"
                defaultValue={tarea.descripcion}
                rows={3}
                className="campo"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor={`pasos-${tarea.id}`}>
                Pasos (uno por línea)
              </label>
              <textarea
                id={`pasos-${tarea.id}`}
                name="pasos"
                defaultValue={pasos.join("\n")}
                rows={6}
                className="campo"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="etiqueta" htmlFor={`prio-${tarea.id}`}>
                  Prioridad
                </label>
                <select
                  id={`prio-${tarea.id}`}
                  name="prioridad"
                  defaultValue={tarea.prioridad}
                  className="campo"
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p} value={p}>
                      P{p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta" htmlFor={`area-${tarea.id}`}>
                  Área
                </label>
                <select
                  id={`area-${tarea.id}`}
                  name="area"
                  defaultValue={tarea.area}
                  className="campo"
                >
                  {AREAS.map((area) => (
                    <option key={area} value={area}>
                      {ETIQUETA_AREA[area]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta" htmlFor={`estado-${tarea.id}`}>
                  Estado
                </label>
                <select
                  id={`estado-${tarea.id}`}
                  name="estado"
                  defaultValue={tarea.estado}
                  className="campo"
                >
                  {ESTADOS_TAREA.map((estado) => (
                    <option key={estado} value={estado}>
                      {ETIQUETA_ESTADO[estado]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta" htmlFor={`fecha-${tarea.id}`}>
                  Fecha límite
                </label>
                <input
                  id={`fecha-${tarea.id}`}
                  type="date"
                  name="fechaLimite"
                  defaultValue={valorInputFecha(tarea.fechaLimite)}
                  className="campo"
                />
              </div>
            </div>
            <div>
              <label className="etiqueta" htmlFor={`notas-${tarea.id}`}>
                Notas
              </label>
              <textarea
                id={`notas-${tarea.id}`}
                name="notas"
                defaultValue={tarea.notas}
                rows={2}
                className="campo"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="boton">
                Guardar cambios
              </button>
              <button
                type="submit"
                formAction={borrarTarea}
                className="boton-suave text-red-700"
              >
                Borrar
              </button>
            </div>
          </form>
        </details>
      </div>
    </details>
  );
}
