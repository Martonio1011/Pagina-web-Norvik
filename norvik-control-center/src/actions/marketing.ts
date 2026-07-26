"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

function refrescar() {
  revalidatePath("/marketing");
  revalidatePath("/");
}

function numero(valor: FormDataEntryValue | null): number {
  const n = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fecha(valor: FormDataEntryValue | null): Date {
  const texto = String(valor ?? "").trim();
  return texto ? new Date(`${texto}T12:00:00`) : new Date();
}

function fechaOpcional(valor: FormDataEntryValue | null): Date | null {
  const texto = String(valor ?? "").trim();
  return texto ? new Date(`${texto}T12:00:00`) : null;
}

export async function crearContenido(formData: FormData) {
  const idea = String(formData.get("idea") ?? "").trim();
  if (!idea) return;
  await prisma.contenidoSocial.create({
    data: {
      idea,
      fecha: fecha(formData.get("fecha")),
      plataforma: String(formData.get("plataforma") ?? "Instagram"),
      estado: String(formData.get("estado") ?? "idea"),
      notas: String(formData.get("notas") ?? "").trim(),
    },
  });
  refrescar();
}

export async function cambiarEstadoContenido(formData: FormData) {
  await prisma.contenidoSocial.update({
    where: { id: Number(formData.get("id")) },
    data: { estado: String(formData.get("estado") ?? "idea") },
  });
  refrescar();
}

export async function borrarContenido(formData: FormData) {
  await prisma.contenidoSocial.delete({
    where: { id: Number(formData.get("id")) },
  });
  refrescar();
}

export async function crearCampana(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  await prisma.campana.create({
    data: {
      nombre,
      plataforma: String(formData.get("plataforma") ?? "Meta"),
      presupuestoDia: numero(formData.get("presupuestoDia")),
      fechaInicio: fecha(formData.get("fechaInicio")),
      fechaFin: fechaOpcional(formData.get("fechaFin")),
      gasto: numero(formData.get("gasto")),
      ventas: numero(formData.get("ventas")),
      estado: String(formData.get("estado") ?? "activa"),
      notas: String(formData.get("notas") ?? "").trim(),
    },
  });
  refrescar();
}

export async function actualizarCampana(formData: FormData) {
  await prisma.campana.update({
    where: { id: Number(formData.get("id")) },
    data: {
      gasto: numero(formData.get("gasto")),
      ventas: numero(formData.get("ventas")),
      estado: String(formData.get("estado") ?? "activa"),
    },
  });
  refrescar();
}

export async function borrarCampana(formData: FormData) {
  await prisma.campana.delete({ where: { id: Number(formData.get("id")) } });
  refrescar();
}

export async function crearCodigo(formData: FormData) {
  const codigo = String(formData.get("codigo") ?? "")
    .trim()
    .toUpperCase();
  if (!codigo) return;
  await prisma.codigoDescuento.upsert({
    where: { codigo },
    update: {},
    create: {
      codigo,
      descripcion: String(formData.get("descripcion") ?? "").trim(),
      tipo: String(formData.get("tipo") ?? "porcentaje"),
      valor: numero(formData.get("valor")),
      fechaFin: fechaOpcional(formData.get("fechaFin")),
    },
  });
  refrescar();
}

export async function alternarCodigo(formData: FormData) {
  await prisma.codigoDescuento.update({
    where: { id: Number(formData.get("id")) },
    data: { activo: formData.get("activo") === "1" },
  });
  refrescar();
}

export async function borrarCodigo(formData: FormData) {
  await prisma.codigoDescuento.delete({
    where: { id: Number(formData.get("id")) },
  });
  refrescar();
}
