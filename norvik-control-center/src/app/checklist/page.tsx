import Link from "next/link";
import { crearTarea } from "@/actions/tareas";
import { TareaItem } from "@/components/tarea-item";
import { Barra, COLOR_SEMAFORO, TituloPagina, Vacio } from "@/components/ui";
import { prisma } from "@/lib/db";
import {
  AREAS,
  ESTADOS_TAREA,
  ETIQUETA_AREA,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  PRIORIDADES,
} from "@/lib/dominio";
import { ordenarPorUrgencia, progresoPorArea } from "@/lib/resumen";

export const dynamic = "force-dynamic";

export default async function PaginaChecklist(props: {
  searchParams: Promise<{ area?: string; estado?: string; prioridad?: string }>;
}) {
  const filtros = await props.searchParams;
  const tareas = await prisma.tarea.findMany({ orderBy: { orden: "asc" } });

  const visibles = ordenarPorUrgencia(
    tareas.filter(
      (tarea) =>
        (!filtros.area || tarea.area === filtros.area) &&
        (!filtros.estado || tarea.estado === filtros.estado) &&
        (!filtros.prioridad || tarea.prioridad === Number(filtros.prioridad)),
    ),
  );

  const hechas = tareas.filter((t) => t.estado === "hecha").length;
  const global = tareas.length ? (hechas / tareas.length) * 100 : 0;
  const areas = progresoPorArea(tareas);

  const enlaceFiltro = (clave: string, valor: string) => {
    const parametros = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v) as [string, string][],
    );
    if (parametros.get(clave) === valor) parametros.delete(clave);
    else parametros.set(clave, valor);
    const cadena = parametros.toString();
    return cadena ? `/checklist?${cadena}` : "/checklist";
  };

  const claseFiltro = (activo: boolean) =>
    `insignia border transition ${
      activo
        ? "border-[var(--color-marca)] bg-[var(--color-marca-suave)] text-[var(--color-marca)]"
        : "border-[var(--color-borde)] bg-white text-[var(--color-tinta-suave)] hover:bg-[var(--color-lienzo)]"
    }`;

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Checklist maestro"
        descripcion="Todo lo que hay que hacer en la tienda, ordenado por prioridad."
      />

      <section className="tarjeta">
        <div className="flex items-end justify-between">
          <p className="text-sm font-medium">Progreso global</p>
          <p className="text-sm tabular-nums">
            {hechas}/{tareas.length} · {Math.round(global)} %
          </p>
        </div>
        <div className="mt-2">
          <Barra porcentaje={global} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <div key={area.area}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{ETIQUETA_AREA[area.area]}</span>
                <span className="text-[var(--color-tinta-suave)] tabular-nums">
                  {area.hechas}/{area.total}
                </span>
              </div>
              <div className="mt-1">
                <Barra
                  porcentaje={area.porcentaje}
                  color={COLOR_SEMAFORO[area.semaforo]}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-1.5">
        {AREAS.map((area) => (
          <Link
            key={area}
            href={enlaceFiltro("area", area)}
            className={claseFiltro(filtros.area === area)}
          >
            {ETIQUETA_AREA[area]}
          </Link>
        ))}
        <span className="mx-1 w-px bg-[var(--color-borde)]" />
        {PRIORIDADES.map((prioridad) => (
          <Link
            key={prioridad}
            href={enlaceFiltro("prioridad", String(prioridad))}
            className={claseFiltro(filtros.prioridad === String(prioridad))}
          >
            P{prioridad}
          </Link>
        ))}
        <span className="mx-1 w-px bg-[var(--color-borde)]" />
        {ESTADOS_TAREA.map((estado) => (
          <Link
            key={estado}
            href={enlaceFiltro("estado", estado)}
            className={claseFiltro(filtros.estado === estado)}
          >
            {ETIQUETA_ESTADO[estado]}
          </Link>
        ))}
        {(filtros.area || filtros.estado || filtros.prioridad) && (
          <Link href="/checklist" className={claseFiltro(false)}>
            Quitar filtros
          </Link>
        )}
      </section>

      <section className="space-y-2">
        {visibles.length === 0 ? (
          <Vacio>No hay tareas que cumplan estos filtros.</Vacio>
        ) : (
          visibles.map((tarea) => <TareaItem key={tarea.id} tarea={tarea} />)
        )}
      </section>

      <details className="tarjeta">
        <summary className="cursor-pointer text-sm font-medium">
          Añadir una tarea nueva
        </summary>
        <form action={crearTarea} className="mt-4 grid gap-3">
          <div>
            <label className="etiqueta" htmlFor="nueva-titulo">
              Título
            </label>
            <input
              id="nueva-titulo"
              name="titulo"
              required
              className="campo"
              placeholder="Por ejemplo: contratar la app de reseñas"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="nueva-descripcion">
              Descripción
            </label>
            <textarea
              id="nueva-descripcion"
              name="descripcion"
              rows={2}
              className="campo"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="nueva-pasos">
              Pasos (uno por línea)
            </label>
            <textarea
              id="nueva-pasos"
              name="pasos"
              rows={5}
              className="campo"
              placeholder={"Primer paso\nSegundo paso\nTercer paso"}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="etiqueta" htmlFor="nueva-prioridad">
                Prioridad
              </label>
              <select
                id="nueva-prioridad"
                name="prioridad"
                defaultValue={2}
                className="campo"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {ETIQUETA_PRIORIDAD[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta" htmlFor="nueva-area">
                Área
              </label>
              <select
                id="nueva-area"
                name="area"
                defaultValue={filtros.area ?? "Catalogo"}
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
              <label className="etiqueta" htmlFor="nueva-estado">
                Estado
              </label>
              <select
                id="nueva-estado"
                name="estado"
                defaultValue="pendiente"
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
              <label className="etiqueta" htmlFor="nueva-fecha">
                Fecha límite
              </label>
              <input
                id="nueva-fecha"
                type="date"
                name="fechaLimite"
                className="campo"
              />
            </div>
          </div>
          <div>
            <button type="submit" className="boton">
              Añadir tarea
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
