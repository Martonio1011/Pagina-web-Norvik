"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { claveDia } from "@/lib/dominio";
import { AVANCES_SHOPIFY } from "@/lib/sincronizacion";

function refrescar() {
  revalidatePath("/");
  revalidatePath("/checklist");
}

function pasosDesdeTexto(texto: string): string {
  const pasos = texto
    .split("\n")
    .map((linea) => linea.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  return JSON.stringify(pasos);
}

function fechaOpcional(valor: FormDataEntryValue | null): Date | null {
  const texto = String(valor ?? "").trim();
  return texto ? new Date(`${texto}T12:00:00`) : null;
}

export async function crearTarea(formData: FormData) {
  const area = String(formData.get("area") ?? "Catalogo");
  const maximo = await prisma.tarea.aggregate({ _max: { orden: true } });

  await prisma.tarea.create({
    data: {
      titulo: String(formData.get("titulo") ?? "").trim() || "Tarea sin título",
      descripcion: String(formData.get("descripcion") ?? "").trim(),
      pasos: pasosDesdeTexto(String(formData.get("pasos") ?? "")),
      prioridad: Number(formData.get("prioridad") ?? 2),
      area,
      estado: String(formData.get("estado") ?? "pendiente"),
      fechaLimite: fechaOpcional(formData.get("fechaLimite")),
      notas: String(formData.get("notas") ?? "").trim(),
      orden: (maximo._max.orden ?? 0) + 1,
    },
  });
  refrescar();
}

export async function actualizarTarea(formData: FormData) {
  const id = Number(formData.get("id"));
  await prisma.tarea.update({
    where: { id },
    data: {
      titulo: String(formData.get("titulo") ?? "").trim() || "Tarea sin título",
      descripcion: String(formData.get("descripcion") ?? "").trim(),
      pasos: pasosDesdeTexto(String(formData.get("pasos") ?? "")),
      prioridad: Number(formData.get("prioridad") ?? 2),
      area: String(formData.get("area") ?? "Catalogo"),
      estado: String(formData.get("estado") ?? "pendiente"),
      fechaLimite: fechaOpcional(formData.get("fechaLimite")),
      notas: String(formData.get("notas") ?? "").trim(),
    },
  });
  refrescar();
}

export async function cambiarEstadoTarea(formData: FormData) {
  await prisma.tarea.update({
    where: { id: Number(formData.get("id")) },
    data: { estado: String(formData.get("estado") ?? "pendiente") },
  });
  refrescar();
}

export async function guardarNotasTarea(formData: FormData) {
  await prisma.tarea.update({
    where: { id: Number(formData.get("id")) },
    data: { notas: String(formData.get("notas") ?? "").trim() },
  });
  refrescar();
}

export async function borrarTarea(formData: FormData) {
  await prisma.tarea.delete({ where: { id: Number(formData.get("id")) } });
  refrescar();
}

/** Intercambia el campo `orden` con la tarea vecina dentro de la misma lista. */
export async function moverTarea(formData: FormData) {
  const id = Number(formData.get("id"));
  const direccion = String(formData.get("direccion"));
  const tarea = await prisma.tarea.findUnique({ where: { id } });
  if (!tarea) return;

  const vecina = await prisma.tarea.findFirst({
    where:
      direccion === "arriba"
        ? { orden: { lt: tarea.orden } }
        : { orden: { gt: tarea.orden } },
    orderBy: { orden: direccion === "arriba" ? "desc" : "asc" },
  });
  if (!vecina) return;

  await prisma.$transaction([
    prisma.tarea.update({ where: { id: tarea.id }, data: { orden: vecina.orden } }),
    prisma.tarea.update({ where: { id: vecina.id }, data: { orden: tarea.orden } }),
  ]);
  refrescar();
}

export async function alternarTareaDiaria(formData: FormData) {
  const tareaDiariaId = Number(formData.get("tareaDiariaId"));
  const dia = String(formData.get("dia") || claveDia());
  const hecha = formData.get("hecha") === "1";

  await prisma.registroDiario.upsert({
    where: { dia_tareaDiariaId: { dia, tareaDiariaId } },
    update: { hecha },
    create: { dia, tareaDiariaId, hecha },
  });
  revalidatePath("/");
  revalidatePath("/pedidos");
}

export async function crearTareaDiaria(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const maximo = await prisma.tareaDiaria.aggregate({ _max: { orden: true } });
  await prisma.tareaDiaria.create({
    data: {
      titulo,
      detalle: String(formData.get("detalle") ?? "").trim(),
      orden: (maximo._max.orden ?? 0) + 1,
    },
  });
  revalidatePath("/pedidos");
}

export async function borrarTareaDiaria(formData: FormData) {
  await prisma.tareaDiaria.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/pedidos");
}

/**
 * Marca como hechas las tareas que se resolvieron directamente en Shopify
 * (fuera de esta app). Solo toca las que aún no estén en "hecha", así que se
 * puede pulsar varias veces sin duplicar nada.
 */
export async function aplicarProgresoShopify() {
  let aplicadas = 0;
  for (const avance of AVANCES_SHOPIFY) {
    const tarea = await prisma.tarea.findFirst({
      where: { titulo: avance.titulo },
    });
    if (!tarea || tarea.estado === "hecha") continue;

    const notas = [tarea.notas, avance.nota].filter(Boolean).join("\n\n");
    await prisma.tarea.update({
      where: { id: tarea.id },
      data: { estado: "hecha", notas },
    });
    aplicadas++;
  }
  refrescar();
  return aplicadas;
}
