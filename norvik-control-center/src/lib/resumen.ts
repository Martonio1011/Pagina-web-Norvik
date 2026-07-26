import { asegurarDatosIniciales } from "@/lib/datos-iniciales";
import { prisma } from "@/lib/db";
import {
  AREAS,
  type Area,
  claveDia,
  margen,
  semaforoDeProgreso,
  type Semaforo,
} from "@/lib/dominio";

export type Tarea = Awaited<ReturnType<typeof prisma.tarea.findMany>>[number];

/** Orden con el que se decide "¿qué hago ahora?": en curso primero, luego P1..P4. */
export function ordenarPorUrgencia<
  T extends { estado: string; prioridad: number; orden: number },
>(tareas: T[]): T[] {
  return [...tareas].sort(
    (a, b) =>
      (a.estado === "en_curso" ? 0 : 1) - (b.estado === "en_curso" ? 0 : 1) ||
      a.prioridad - b.prioridad ||
      a.orden - b.orden,
  );
}

export type ProgresoArea = {
  area: Area;
  hechas: number;
  total: number;
  porcentaje: number;
  semaforo: Semaforo;
};

export function progresoPorArea(tareas: Tarea[]): ProgresoArea[] {
  return AREAS.map((area) => {
    const delArea = tareas.filter((t) => t.area === area);
    const hechas = delArea.filter((t) => t.estado === "hecha").length;
    const porcentaje = delArea.length ? (hechas / delArea.length) * 100 : 100;
    const hayP1Pendiente = delArea.some(
      (t) => t.prioridad === 1 && t.estado !== "hecha",
    );
    return {
      area,
      hechas,
      total: delArea.length,
      porcentaje,
      semaforo: semaforoDeProgreso(porcentaje, hayP1Pendiente),
    };
  });
}

export type Alerta = {
  texto: string;
  gravedad: "alta" | "media";
  enlace: string;
};

export async function cargarPanel() {
  await asegurarDatosIniciales();
  const hoy = claveDia();
  const finDeHoy = new Date(`${hoy}T23:59:59.999`);

  const [tareas, productos, ajustes, tareasDiarias, registrosDeHoy] =
    await Promise.all([
      prisma.tarea.findMany({ orderBy: { orden: "asc" } }),
      prisma.producto.findMany({ orderBy: { nombre: "asc" } }),
      prisma.ajustes.findUnique({ where: { id: 1 } }),
      prisma.tareaDiaria.findMany({
        where: { activa: true },
        orderBy: { orden: "asc" },
      }),
      prisma.registroDiario.findMany({ where: { dia: hoy } }),
    ]);

  const hechas = tareas.filter((t) => t.estado === "hecha").length;
  const progresoGlobal = tareas.length ? (hechas / tareas.length) * 100 : 0;

  const pendientes = ordenarPorUrgencia(
    tareas.filter((t) => t.estado !== "hecha"),
  );

  const paraHoy = pendientes.filter(
    (t) => t.fechaLimite && t.fechaLimite <= finDeHoy,
  );
  const vencidas = paraHoy.filter(
    (t) => t.fechaLimite && t.fechaLimite < new Date(`${hoy}T00:00:00`),
  );

  const sinStock = productos.filter(
    (p) => p.estado === "activo" && p.stock <= 0,
  );
  const margenBajo = productos.filter((p) => {
    const m = margen(p.precioVenta, p.costeTrendsi + p.costeEnvio);
    return m !== null && m < 50;
  });
  const sinDatos = productos.filter(
    (p) => p.precioVenta <= 0 || p.costeTrendsi <= 0,
  );
  const sinGuiaTallas = productos.filter((p) => !p.tieneGuiaTallas);
  const sinResenas = productos.filter((p) => !p.tieneResenas);

  const alertas: Alerta[] = [];
  if (sinStock.length)
    alertas.push({
      gravedad: "alta",
      enlace: "/catalogo",
      texto: `${sinStock.length} producto${sinStock.length > 1 ? "s activos" : " activo"} con stock 0`,
    });
  if (vencidas.length)
    alertas.push({
      gravedad: "alta",
      enlace: "/checklist",
      texto: `${vencidas.length} tarea${vencidas.length > 1 ? "s vencidas" : " vencida"}`,
    });
  if (margenBajo.length)
    alertas.push({
      gravedad: "media",
      enlace: "/catalogo",
      texto: `${margenBajo.length} producto${margenBajo.length > 1 ? "s" : ""} con margen por debajo del 50 %`,
    });
  if (sinDatos.length)
    alertas.push({
      gravedad: "media",
      enlace: "/catalogo",
      texto: `${sinDatos.length} producto${sinDatos.length > 1 ? "s" : ""} sin coste o precio cargado`,
    });
  if (sinGuiaTallas.length)
    alertas.push({
      gravedad: "media",
      enlace: "/catalogo",
      texto: `${sinGuiaTallas.length} producto${sinGuiaTallas.length > 1 ? "s" : ""} sin guía de tallas`,
    });
  if (sinResenas.length)
    alertas.push({
      gravedad: "media",
      enlace: "/catalogo",
      texto: `${sinResenas.length} producto${sinResenas.length > 1 ? "s" : ""} sin reseñas`,
    });

  const hechasHoy = new Set(
    registrosDeHoy.filter((r) => r.hecha).map((r) => r.tareaDiariaId),
  );

  return {
    tareas,
    progresoGlobal,
    hechas,
    pendientes,
    siguiente: pendientes[0] ?? null,
    paraHoy,
    areas: progresoPorArea(tareas),
    alertas,
    moneda: ajustes?.moneda ?? "EUR",
    diarias: tareasDiarias.map((t) => ({ ...t, hecha: hechasHoy.has(t.id) })),
    hoy,
  };
}
