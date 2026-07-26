"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

function refrescar() {
  revalidatePath("/finanzas");
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

export async function crearGasto(formData: FormData) {
  const concepto = String(formData.get("concepto") ?? "").trim();
  if (!concepto) return;
  await prisma.gasto.create({
    data: {
      concepto,
      categoria: String(formData.get("categoria") ?? "otros"),
      importe: numero(formData.get("importe")),
      fecha: fecha(formData.get("fecha")),
      recurrente: formData.get("recurrente") === "on",
      notas: String(formData.get("notas") ?? "").trim(),
    },
  });
  refrescar();
}

export async function actualizarGasto(formData: FormData) {
  await prisma.gasto.update({
    where: { id: Number(formData.get("id")) },
    data: {
      concepto: String(formData.get("concepto") ?? "").trim(),
      categoria: String(formData.get("categoria") ?? "otros"),
      importe: numero(formData.get("importe")),
      fecha: fecha(formData.get("fecha")),
      recurrente: formData.get("recurrente") === "on",
      notas: String(formData.get("notas") ?? "").trim(),
    },
  });
  refrescar();
}

export async function borrarGasto(formData: FormData) {
  await prisma.gasto.delete({ where: { id: Number(formData.get("id")) } });
  refrescar();
}

export async function guardarAjustes(formData: FormData) {
  const datos = {
    moneda: String(formData.get("moneda") ?? "EUR"),
    margenObjetivo: numero(formData.get("margenObjetivo")) || 65,
    dominioShopify: String(formData.get("dominioShopify") ?? "").trim(),
  };
  await prisma.ajustes.upsert({
    where: { id: 1 },
    update: datos,
    create: { id: 1, ...datos },
  });
  revalidatePath("/", "layout");
}
