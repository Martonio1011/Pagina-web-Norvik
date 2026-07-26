import { prisma } from "@/lib/db";

export const TABLAS = [
  "tareas",
  "productos",
  "pedidos",
  "contenidos",
  "campanas",
  "codigos",
  "gastos",
  "rutinaDiaria",
] as const;

export type Tabla = (typeof TABLAS)[number];

export const ETIQUETA_TABLA: Record<Tabla, string> = {
  tareas: "Checklist maestro",
  productos: "Catálogo",
  pedidos: "Pedidos",
  contenidos: "Calendario de contenidos",
  campanas: "Campañas de ads",
  codigos: "Códigos de descuento",
  gastos: "Gastos",
  rutinaDiaria: "Rutina diaria",
};

export async function volcarTodo() {
  const [
    tareas,
    productos,
    pedidos,
    contenidos,
    campanas,
    codigos,
    gastos,
    rutinaDiaria,
    ajustes,
  ] = await Promise.all([
    prisma.tarea.findMany({ orderBy: { orden: "asc" } }),
    prisma.producto.findMany({ orderBy: { nombre: "asc" } }),
    prisma.pedido.findMany({ orderBy: { fecha: "desc" } }),
    prisma.contenidoSocial.findMany({ orderBy: { fecha: "asc" } }),
    prisma.campana.findMany({ orderBy: { fechaInicio: "desc" } }),
    prisma.codigoDescuento.findMany({ orderBy: { creadoEn: "desc" } }),
    prisma.gasto.findMany({ orderBy: { fecha: "desc" } }),
    prisma.tareaDiaria.findMany({ orderBy: { orden: "asc" } }),
    prisma.ajustes.findUnique({ where: { id: 1 } }),
  ]);

  return {
    exportadoEn: new Date().toISOString(),
    ajustes,
    tareas,
    productos,
    pedidos,
    contenidos,
    campanas,
    codigos,
    gastos,
    rutinaDiaria,
  };
}

function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto =
    valor instanceof Date
      ? valor.toISOString()
      : typeof valor === "object"
        ? JSON.stringify(valor)
        : String(valor);
  return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV con separador `;`, que es el que espera Excel en configuración española. */
export function aCsv(filas: Record<string, unknown>[]): string {
  if (filas.length === 0) return "";
  const columnas = Object.keys(filas[0]);
  const lineas = [
    columnas.join(";"),
    ...filas.map((fila) => columnas.map((col) => celda(fila[col])).join(";")),
  ];
  return `﻿${lineas.join("\n")}`;
}
